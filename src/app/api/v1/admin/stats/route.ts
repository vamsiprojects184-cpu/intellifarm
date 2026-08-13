import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { ok, forbidden } from "@/lib/api";

export async function GET() {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") return forbidden("Admin access required");

  const [
    totalUsers,
    farmers,
    experts,
    admins,
    farms,
    crops,
    diseaseReports,
    consultations,
    schemes,
    markets,
    diseaseDb,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { role: "FARMER" } }),
    db.user.count({ where: { role: "EXPERT" } }),
    db.user.count({ where: { role: "ADMIN" } }),
    db.farm.count(),
    db.crop.count(),
    db.diseaseReport.count(),
    db.consultation.count(),
    db.governmentScheme.count(),
    db.market.count(),
    db.diseaseDatabase.count(),
  ]);

  const openConsultations = await db.consultation.count({
    where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
  });
  const activeUsers = await db.user.count({ where: { isActive: true } });

  // recent signups
  const recentUsers = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, fullName: true, email: true, role: true, createdAt: true },
  });

  // user role distribution for chart
  const roleDistribution = [
    { name: "Farmers", value: farmers, color: "#16a34a" },
    { name: "Experts", value: experts, color: "#ca8a04" },
    { name: "Admins", value: admins, color: "#9a3412" },
  ];

  return ok({
    totals: {
      totalUsers,
      farmers,
      experts,
      admins,
      farms,
      crops,
      diseaseReports,
      consultations,
      openConsultations,
      schemes,
      markets,
      diseaseDb,
      activeUsers,
    },
    recentUsers,
    roleDistribution,
  });
}
