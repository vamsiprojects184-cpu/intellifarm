import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { ok, unauthorized } from "@/lib/api";

/**
 * Daily Advisory — generates a personalized action plan for the farmer based on:
 * - Current weather conditions & forecast
 * - Pending tasks (overdue + due today)
 * - Active alerts
 * - Soil moisture levels
 * - Crop growth stages
 * - Unread recommendations
 *
 * Returns a prioritized list of actions for today.
 */

interface AdvisoryItem {
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  category: string;
  title: string;
  description: string;
  icon: string;
  actionLabel?: string;
  actionView?: string;
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { searchParams } = new URL(req.url);
  const farmId = searchParams.get("farmId");

  const farms = await db.farm.findMany({
    where: { ownerId: user.id, archived: false, ...(farmId ? { id: farmId } : {}) },
    include: {
      crops: {
        where: { stage: { not: "HARVESTED" } },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      sensors: {
        include: { readings: { orderBy: { timestamp: "desc" }, take: 1 } },
      },
      alerts: {
        where: { isRead: false },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      tasks: {
        where: { completed: false },
        orderBy: { dueDate: "asc" },
        take: 10,
      },
    },
  });

  const now = new Date();
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const advisory: AdvisoryItem[] = [];

  for (const farm of farms) {
    // Weather-based advisory (demo weather logic)
    const month = now.getMonth();
    const rainySeason = month >= 5 && month <= 9;
    const rainProb = rainySeason ? 60 + Math.floor(Math.random() * 30) : Math.floor(Math.random() * 40);
    const temp = rainySeason ? 26 + Math.floor(Math.random() * 6) : 22 + Math.floor(Math.random() * 12);

    if (rainProb > 70) {
      advisory.push({
        priority: "HIGH",
        category: "WEATHER",
        title: `Rain expected at ${farm.name}`,
        description: `Rain probability ${rainProb}%. Postpone irrigation and pesticide spray. Inspect drainage channels.`,
        icon: "🌧️",
        actionLabel: "View Weather",
        actionView: "weather",
      });
    } else if (temp > 35) {
      advisory.push({
        priority: "HIGH",
        category: "WEATHER",
        title: `High temperature alert for ${farm.name}`,
        description: `Temperature may reach ${temp}°C. Irrigate early morning or evening. Ensure adequate water supply.`,
        icon: "☀️",
        actionLabel: "Check Irrigation",
        actionView: "irrigation",
      });
    }

    // Soil moisture check
    const latestReading = farm.sensors
      .flatMap((s) => s.readings)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
    if (latestReading?.soilMoisture !== null && latestReading?.soilMoisture !== undefined) {
      if (latestReading.soilMoisture < 30) {
        advisory.push({
          priority: "CRITICAL",
          category: "IRRIGATION",
          title: `Low soil moisture at ${farm.name}`,
          description: `Soil moisture is ${Math.round(latestReading.soilMoisture)}% — below optimal. Irrigate immediately.`,
          icon: "💧",
          actionLabel: "Run Irrigation Analysis",
          actionView: "irrigation",
        });
      } else if (latestReading.soilMoisture < 40) {
        advisory.push({
          priority: "MEDIUM",
          category: "IRRIGATION",
          title: `Soil moisture getting low at ${farm.name}`,
          description: `Soil moisture at ${Math.round(latestReading.soilMoisture)}%. Plan irrigation soon.`,
          icon: "💧",
          actionLabel: "Check Irrigation",
          actionView: "irrigation",
        });
      }
    }

    // Active alerts
    for (const alert of farm.alerts.slice(0, 2)) {
      advisory.push({
        priority: alert.priority as AdvisoryItem["priority"],
        category: alert.category,
        title: alert.title,
        description: alert.message.slice(0, 150),
        icon: "⚠️",
      });
    }

    // Overdue & due-today tasks
    for (const task of farm.tasks) {
      const due = new Date(task.dueDate);
      if (due < now) {
        advisory.push({
          priority: "HIGH",
          category: "TASK",
          title: `Overdue: ${task.title}`,
          description: `This task was due ${due.toLocaleDateString("en-IN")}. Complete it soon.`,
          icon: "⏰",
          actionLabel: "View Tasks",
          actionView: "tasks",
        });
      } else if (due <= todayEnd) {
        advisory.push({
          priority: "MEDIUM",
          category: "TASK",
          title: `Due today: ${task.title}`,
          description: task.description ?? "Scheduled for today.",
          icon: "📋",
          actionLabel: "View Tasks",
          actionView: "tasks",
        });
      }
    }

    // Crop stage advisory
    for (const crop of farm.crops.slice(0, 3)) {
      if (crop.stage === "FLOWERING") {
        advisory.push({
          priority: "MEDIUM",
          category: "CROP",
          title: `${crop.name} is flowering`,
          description: `${crop.name} at ${farm.name} is in flowering stage. Monitor for pests and ensure adequate water and nutrients.`,
          icon: "🌸",
        });
      } else if (crop.stage === "FRUITING") {
        advisory.push({
          priority: "MEDIUM",
          category: "CROP",
          title: `${crop.name} is fruiting`,
          description: `${crop.name} at ${farm.name} is in fruiting stage. Apply potash fertilizer for better fruit development.`,
          icon: "🍎",
        });
      } else if (crop.stage === "HARVEST_READY") {
        advisory.push({
          priority: "HIGH",
          category: "HARVEST",
          title: `${crop.name} ready for harvest`,
          description: `${crop.name} at ${farm.name} is harvest-ready. Plan harvest and check market prices for best selling time.`,
          icon: "🌾",
          actionLabel: "Check Market Prices",
          actionView: "market",
        });
      }
    }
  }

  // Unread recommendations count
  const unreadRecs = await db.recommendation.count({
    where: { userId: user.id, status: "PENDING" },
  });
  if (unreadRecs > 0) {
    advisory.push({
      priority: "LOW",
      category: "RECOMMENDATION",
      title: `${unreadRecs} pending recommendation${unreadRecs > 1 ? "s" : ""}`,
      description: "Review your AI-generated recommendations and mark them complete.",
      icon: "💡",
    });
  }

  // Sort by priority
  const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };
  advisory.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  // Greeting based on time of day
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return ok({
    greeting,
    farmerName: user.fullName,
    date: now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
    advisory,
    summary: {
      total: advisory.length,
      critical: advisory.filter((a) => a.priority === "CRITICAL").length,
      high: advisory.filter((a) => a.priority === "HIGH").length,
      medium: advisory.filter((a) => a.priority === "MEDIUM").length,
    },
  });
}
