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

// Generate a deterministic demo weather reading for the engine.
function demoWeatherFor(farm: { latitude: number | null; longitude: number; state: string }) {
  let h = 0;
  const key = `${farm.latitude ?? 0}-${farm.longitude ?? 0}-${farm.state}`;
  for (let i = 0; i < key.length; i++) h = (h << 5) - h + key.charCodeAt(i);
  const seed = Math.abs(h);
  const r1 = (Math.sin(seed) * 10000) % 1;
  const r2 = (Math.sin(seed + 1) * 10000) % 1;
  const temperature = 24 + Math.abs(r1) * 12;
  const humidity = 50 + Math.abs(r2) * 40;
  const month = new Date().getMonth();
  const rainy = month >= 5 && month <= 9;
  let rainToday = Math.abs(r1) * 100;
  let rainTomorrow = Math.abs((Math.sin(seed + 2) * 10000)) % 1 * 100;
  if (rainy) {
    rainToday = Math.min(95, rainToday + 25);
    rainTomorrow = Math.min(95, rainTomorrow + 25);
  }
  return {
    temperature: Math.round(temperature * 10) / 10,
    humidity: Math.round(humidity * 10) / 10,
    rainToday: Math.round(rainToday),
    rainTomorrow: Math.round(rainTomorrow),
  };
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

  // Demo weather (clearly labelled at API layer)
  const w = demoWeatherFor(farm);

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
