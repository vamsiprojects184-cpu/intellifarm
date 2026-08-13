"use client";

import { useNav } from "@/lib/nav-store";
import { AdminDashboard } from "./dashboard";
import { AdminUsersView } from "./users";
import { AdminFarmsView } from "./farms";
import { AdminSchemesView } from "./schemes";
import { AdminMarketView } from "./market";
import { AdminDiseaseDbView } from "./disease-db";
import { AdminStatsView } from "./stats";

export function AdminViews() {
  const { view } = useNav();
  switch (view) {
    case "admin-dashboard":
      return <AdminDashboard />;
    case "admin-users":
      return <AdminUsersView />;
    case "admin-farms":
      return <AdminFarmsView />;
    case "admin-schemes":
      return <AdminSchemesView />;
    case "admin-market":
      return <AdminMarketView />;
    case "admin-disease-db":
      return <AdminDiseaseDbView />;
    case "admin-stats":
      return <AdminStatsView />;
    default:
      return <AdminDashboard />;
  }
}
