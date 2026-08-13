import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { ok, unauthorized, notFound } from "@/lib/api";

// Deterministic pseudo-weather generator seeded by farm lat/long + date.
// This is clearly demo data; a WeatherProvider interface in lib/weather.ts
// can later plug in OpenWeather / Open-Meteo without changing this route.
function seededRandom(seed: number) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return Math.abs(h);
}

const CONDITIONS = ["CLEAR", "CLOUDY", "RAIN", "THUNDERSTORM", "FOG"];
const CONDITION_TEXT: Record<string, string> = {
  CLEAR: "Clear sky",
  CLOUDY: "Partly cloudy",
  RAIN: "Rain expected",
  THUNDERSTORM: "Thunderstorm likely",
  FOG: "Foggy conditions",
};

interface DayForecast {
  date: string;
  temperature: number;
  humidity: number;
  rainProbability: number;
  windSpeed: number;
  condition: string;
  conditionText: string;
  isToday: boolean;
}

function generateForecast(seedKey: string, days = 7): DayForecast[] {
  const baseSeed = hashStr(seedKey);
  const out: DayForecast[] = [];
  const today = new Date();
  // bias toward season: kharif (jun-oct) rainier
  const month = today.getMonth();
  const rainySeason = month >= 5 && month <= 9;
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const seed = baseSeed + i * 7;
    const r1 = seededRandom(seed);
    const r2 = seededRandom(seed + 1);
    const r3 = seededRandom(seed + 2);
    const r4 = seededRandom(seed + 3);
    const temperature = Math.round((24 + r1 * 12) * 10) / 10; // 24-36
    const humidity = Math.round((45 + r2 * 45) * 10) / 10; // 45-90
    let rainProbability = Math.round(r3 * 100);
    if (rainySeason) rainProbability = Math.min(95, rainProbability + 25);
    const windSpeed = Math.round((5 + r4 * 25) * 10) / 10; // 5-30 km/h
    let condition = CONDITIONS[0];
    if (rainProbability > 70) condition = "THUNDERSTORM";
    else if (rainProbability > 45) condition = "RAIN";
    else if (humidity > 80 && temperature < 26) condition = "FOG";
    else if (rainProbability > 20) condition = "CLOUDY";
    else condition = "CLEAR";
    out.push({
      date: d.toISOString().slice(0, 10),
      temperature,
      humidity,
      rainProbability,
      windSpeed,
      condition,
      conditionText: CONDITION_TEXT[condition],
      isToday: i === 0,
    });
  }
  return out;
}

function buildInsights(forecast: DayForecast[]): { priority: string; title: string; message: string }[] {
  const insights: { priority: string; title: string; message: string }[] = [];
  const today = forecast[0];
  const tomorrow = forecast[1];
  if (tomorrow && tomorrow.rainProbability >= 60) {
    insights.push({
      priority: "HIGH",
      title: "Rainfall expected soon",
      message: `Rain probability ${tomorrow.rainProbability}% tomorrow. Postpone irrigation and inspect field drainage.`,
    });
  }
  if (today.temperature >= 35) {
    insights.push({
      priority: "MEDIUM",
      title: "High temperature alert",
      message: `Today's temperature (${today.temperature}°C) may increase crop water requirement. Consider irrigating early morning or late evening.`,
    });
  }
  if (today.windSpeed >= 20) {
    insights.push({
      priority: "MEDIUM",
      title: "Strong winds expected",
      message: `Wind speed ${today.windSpeed} km/h may affect spraying activities. Schedule spray for calmer periods.`,
    });
  }
  if (today.humidity >= 80) {
    insights.push({
      priority: "MEDIUM",
      title: "High humidity — fungal risk",
      message: `Humidity at ${today.humidity}% favours fungal diseases. Monitor lower leaves and ensure good air circulation.`,
    });
  }
  if (forecast.some((f) => f.condition === "THUNDERSTORM")) {
    const day = forecast.find((f) => f.condition === "THUNDERSTORM");
    insights.push({
      priority: "CRITICAL",
      title: "Thunderstorm warning",
      message: `Thunderstorm likely on ${day?.date}. Secure loose equipment, avoid field work, and check drainage.`,
    });
  }
  if (insights.length === 0) {
    insights.push({
      priority: "INFO",
      title: "Favourable conditions",
      message: "Weather conditions are normal. Routine farm activities can proceed.",
    });
  }
  return insights;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ farmId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { farmId } = await params;
  const farm = await db.farm.findUnique({ where: { id: farmId } });
  if (!farm) return notFound("Farm not found");
  if (user.role !== "ADMIN" && farm.ownerId !== user.id)
    return notFound("Farm not found");

  const seedKey = `${farm.latitude ?? 0}-${farm.longitude ?? 0}-${farm.state}`;
  const forecast = generateForecast(seedKey, 7);
  const insights = buildInsights(forecast);

  return ok({
    isDemo: true,
    location: {
      state: farm.state,
      district: farm.district,
      village: farm.village,
      latitude: farm.latitude,
      longitude: farm.longitude,
    },
    today: forecast[0],
    forecast,
    insights,
    note: "Demo weather data. Connect a live weather provider via the WeatherProvider interface for real-time forecasts.",
  });
}
