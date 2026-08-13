import { db } from "@/lib/db";
import type { Farm, Crop, Sensor, SensorReading } from "@prisma/client";

interface IrrigationInput {
  farm: Farm & {
    crops: Crop[];
    sensors: (Sensor & { readings: SensorReading[] })[];
  };
  overrides?: {
    soilMoisture?: number;
    temperature?: number;
    humidity?: number;
  };
}

export interface IrrigationResult {
  irrigationRequired: boolean;
  waterLitres: number;
  durationMin: number;
  recommendedTime: string;
  reasoning: string[];
  factors: {
    soilMoisture: number | null;
    temperature: number | null;
    humidity: number | null;
    rainProbabilityToday: number | null;
    rainProbabilityTomorrow: number | null;
    cropName: string | null;
    growthStage: string | null;
    moistureThreshold: number | null;
    tempThreshold: number | null;
    rainThreshold: number | null;
  };
  cropMatched: boolean;
}

// Fetch real weather data from Open-Meteo API (free, no key needed)
async function fetchRealWeather(farm: { latitude: number | null; longitude: number | null; state: string }): Promise<{
  temperature: number;
  humidity: number;
  rainToday: number;
  rainTomorrow: number;
}> {
  const lat = farm.latitude ?? 18.52;
  const lon = farm.longitude ?? 73.85;

  try {
    const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation_probability&daily=precipitation_probability_max&timezone=auto&forecast_days=2`;

    const response = await fetch(apiUrl, {
      next: { revalidate: 1800 }, // cache 30 min
    });

    if (!response.ok) throw new Error(`Weather API ${response.status}`);

    const data = await response.json();

    return {
      temperature: Math.round((data.current?.temperature_2m ?? 28) * 10) / 10,
      humidity: Math.round(data.current?.relative_humidity_2m ?? 60),
      rainToday: Math.round(data.daily?.precipitation_probability_max?.[0] ?? 0),
      rainTomorrow: Math.round(data.daily?.precipitation_probability_max?.[1] ?? 0),
    };
  } catch {
    // Fallback to reasonable defaults if API unavailable
    return {
      temperature: 28,
      humidity: 60,
      rainToday: 20,
      rainTomorrow: 30,
    };
  }
}

export async function analyzeIrrigation(
  input: IrrigationInput
): Promise<IrrigationResult> {
  const { farm, overrides } = input;

  // Pick crop (first if no specific)
  const crop = farm.crops[0] ?? null;

  // Latest sensor reading
  let latest: SensorReading | null = null;
  for (const s of farm.sensors) {
    if (s.readings[0]) {
      latest = s.readings[0];
      break;
    }
  }

  const soilMoisture =
    overrides?.soilMoisture ?? latest?.soilMoisture ?? null;
  const temperature =
    overrides?.temperature ?? latest?.temperature ?? null;
  const humidity = overrides?.humidity ?? latest?.humidity ?? null;

  // Fetch real weather data from Open-Meteo API
  const w = await fetchRealWeather(farm);

  // Load crop irrigation config
  let config = null;
  if (crop) {
    config = await db.irrigationConfig.findUnique({
      where: { cropName: crop.name },
    });
  }
  // fallback generic config
  if (!config) {
    config =
      (await db.irrigationConfig.findFirst()) ??
      (await db.irrigationConfig.create({
        data: {
          cropName: "Generic",
          moistureThreshold: 35,
          tempThreshold: 32,
          rainThreshold: 60,
          baseWaterLitres: 500,
          baseDurationMin: 45,
        },
      }));
  }

  const moistureThreshold = config.moistureThreshold;
  const tempThreshold = config.tempThreshold;
  const rainThreshold = config.rainThreshold;

  const reasoning: string[] = [];
  let irrigationRequired = true;

  // RULE 1: rain expected soon → skip
  if (w.rainTomorrow >= rainThreshold) {
    irrigationRequired = false;
    reasoning.push(
      `Rain probability tomorrow is ${w.rainTomorrow}% (≥ threshold ${rainThreshold}%). Postpone irrigation to conserve water.`
    );
  } else if (w.rainToday >= rainThreshold) {
    irrigationRequired = false;
    reasoning.push(
      `Rain probability today is ${w.rainToday}% (≥ threshold ${rainThreshold}%). Skip irrigation today.`
    );
  }

  // RULE 2: soil moisture above threshold → skip
  const smRounded = soilMoisture !== null ? Math.round(soilMoisture * 10) / 10 : null;
  if (smRounded !== null) {
    if (smRounded >= moistureThreshold && irrigationRequired) {
      irrigationRequired = false;
      reasoning.push(
        `Soil moisture is ${smRounded}% (≥ threshold ${moistureThreshold}%). No irrigation needed.`
      );
    } else if (smRounded < moistureThreshold) {
      reasoning.push(
        `Soil moisture is ${smRounded}% (< threshold ${moistureThreshold}%). Irrigation recommended.`
      );
    }
  } else {
    reasoning.push(
      "No soil moisture sensor reading available. Decision based on weather and crop config only."
    );
  }

  // RULE 3: high temperature increases water need
  let waterMultiplier = 1;
  const effectiveTemp = temperature ?? w.temperature;
  const tempRounded = Math.round(effectiveTemp * 10) / 10;
  if (effectiveTemp > tempThreshold) {
    waterMultiplier = 1 + (effectiveTemp - tempThreshold) / 20;
    reasoning.push(
      `Temperature ${tempRounded}°C exceeds threshold ${tempThreshold}°C. Increasing water quantity by ${Math.round(
        (waterMultiplier - 1) * 100
      )}%.`
    );
  }

  // Stage-based adjustment
  if (crop) {
    const stage = crop.stage;
    if (["FLOWERING", "FRUITING"].includes(stage)) {
      waterMultiplier *= 1.1;
      reasoning.push(
        `Crop is in ${stage} stage — slightly higher water demand.`
      );
    }
    if (stage === "HARVEST_READY" || stage === "HARVESTED") {
      waterMultiplier *= 0.5;
      reasoning.push(`Crop is in ${stage} stage — reduced water requirement.`);
    }
  }

  // Compute quantity & duration
  const area = crop?.areaAcres ?? farm.areaAcres;
  const baseWater = config.baseWaterLitres;
  const baseDuration = config.baseDurationMin;
  const waterLitres = Math.round(baseWater * area * waterMultiplier);
  const durationMin = Math.round(baseDuration * Math.max(0.5, area / 2) * waterMultiplier);

  // Recommended time
  let recommendedTime = "Early morning (5:30–7:00 AM) or late evening (5:00–6:30 PM)";
  if (effectiveTemp > 35) {
    recommendedTime = "Late evening only (after 5:30 PM) — avoid midday evaporation loss";
  }

  if (irrigationRequired && reasoning.length === 0) {
    reasoning.push("Conditions indicate irrigation is beneficial.");
  }

  return {
    irrigationRequired,
    waterLitres,
    durationMin,
    recommendedTime,
    reasoning,
    factors: {
      soilMoisture: soilMoisture !== null ? Math.round(soilMoisture * 10) / 10 : null,
      temperature: temperature !== null ? Math.round(temperature * 10) / 10 : null,
      humidity: humidity !== null ? Math.round(humidity * 10) / 10 : null,
      rainProbabilityToday: w.rainToday,
      rainProbabilityTomorrow: w.rainTomorrow,
      cropName: crop?.name ?? null,
      growthStage: crop?.stage ?? null,
      moistureThreshold,
      tempThreshold,
      rainThreshold,
    },
    cropMatched: !!crop,
  };
}
