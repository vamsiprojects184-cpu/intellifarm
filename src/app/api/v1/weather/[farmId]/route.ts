import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { ok, unauthorized, notFound } from "@/lib/api";

/**
 * Weather Service — uses Open-Meteo free API (no key required)
 * https://open-meteo.com/
 * Provides real-time weather and 7-day forecasts based on farm coordinates.
 */

interface OpenMeteoResponse {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    precipitation_probability: number;
    wind_speed_10m: number;
    weather_code: number;
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
    wind_speed_10m_max: number[];
    weather_code: number[];
  };
}

// WMO weather codes → readable condition
function wmoToCondition(code: number): { condition: string; conditionText: string } {
  if (code === 0) return { condition: "CLEAR", conditionText: "Clear sky" };
  if (code <= 3) return { condition: "CLOUDY", conditionText: "Partly cloudy" };
  if (code <= 48) return { condition: "FOG", conditionText: "Foggy conditions" };
  if (code <= 67) return { condition: "RAIN", conditionText: "Rain expected" };
  if (code <= 77) return { condition: "RAIN", conditionText: "Snow/rain mix" };
  if (code <= 82) return { condition: "RAIN", conditionText: "Showers" };
  if (code <= 86) return { condition: "RAIN", conditionText: "Snow showers" };
  if (code >= 95) return { condition: "THUNDERSTORM", conditionText: "Thunderstorm likely" };
  return { condition: "CLOUDY", conditionText: "Cloudy" };
}

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
  if (today && today.temperature >= 35) {
    insights.push({
      priority: "MEDIUM",
      title: "High temperature alert",
      message: `Today's temperature (${today.temperature}°C) may increase crop water requirement. Consider irrigating early morning or late evening.`,
    });
  }
  if (today && today.windSpeed >= 20) {
    insights.push({
      priority: "MEDIUM",
      title: "Strong winds expected",
      message: `Wind speed ${today.windSpeed} km/h may affect spraying activities. Schedule spray for calmer periods.`,
    });
  }
  if (today && today.humidity >= 80) {
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

  const lat = farm.latitude ?? 18.52; // default to Pune if no coordinates
  const lon = farm.longitude ?? 73.85;

  try {
    const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation_probability,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,weather_code&timezone=auto&forecast_days=7`;

    const response = await fetch(apiUrl, {
      next: { revalidate: 1800 }, // cache for 30 minutes
    });

    if (!response.ok) {
      throw new Error(`Weather API returned ${response.status}`);
    }

    const data: OpenMeteoResponse = await response.json();

    // Build forecast array
    const forecast: DayForecast[] = data.daily.time.map((date, i) => {
      const wmo = wmoToCondition(data.daily.weather_code[i]);
      return {
        date,
        temperature: Math.round(data.daily.temperature_2m_max[i] * 10) / 10,
        humidity: Math.round(data.current.relative_humidity_2m), // use current humidity as proxy
        rainProbability: data.daily.precipitation_probability_max[i] ?? 0,
        windSpeed: Math.round(data.daily.wind_speed_10m_max[i] * 10) / 10,
        condition: wmo.condition,
        conditionText: wmo.conditionText,
        isToday: i === 0,
      };
    });

    const currentWmo = wmoToCondition(data.current.weather_code);
    const insights = buildInsights(forecast);

    return ok({
      isDemo: false,
      isRealData: true,
      location: {
        state: farm.state,
        district: farm.district,
        village: farm.village,
        latitude: farm.latitude,
        longitude: farm.longitude,
      },
      today: {
        date: forecast[0].date,
        temperature: Math.round(data.current.temperature_2m * 10) / 10,
        humidity: Math.round(data.current.relative_humidity_2m),
        rainProbability: data.current.precipitation_probability ?? forecast[0].rainProbability,
        windSpeed: Math.round(data.current.wind_speed_10m * 10) / 10,
        condition: currentWmo.condition,
        conditionText: currentWmo.conditionText,
        isToday: true,
      },
      forecast,
      insights,
      dataSource: "Open-Meteo API (real-time weather data)",
      note: "Real weather data from Open-Meteo. Updated every 30 minutes.",
    });
  } catch (error) {
    console.error("Weather API error:", error);
    return ok({
      isDemo: false,
      isRealData: false,
      error: "Unable to fetch live weather data. Please try again later.",
      location: {
        state: farm.state,
        district: farm.district,
        village: farm.village,
        latitude: farm.latitude,
        longitude: farm.longitude,
      },
      today: null,
      forecast: [],
      insights: [{
        priority: "INFO",
        title: "Weather data unavailable",
        message: "Unable to fetch live weather data. Please check your internet connection and try again.",
      }],
    });
  }
}
