"use client";

import { useNav } from "@/lib/nav-store";
import { FarmerDashboard } from "./dashboard";
import { FarmsView } from "./farms";
import { FarmDetailView } from "./farm-detail";
import { CropsView } from "./crops";
import { WeatherView } from "./weather";
import { IrrigationView } from "./irrigation";
import { DiseaseView } from "./disease";
import { MarketView } from "./market";
import { SchemesView } from "./schemes";
import { ExpertConnectView } from "./expert-connect";
import { TimelineView } from "./timeline";
import { NotificationsView } from "./notifications";
import { AnalyticsView } from "./analytics";
import { SoilTestsView } from "./soil-tests";
import { HarvestsView } from "./harvests";
import { CropCalendarView } from "./crop-calendar";
import { PestsView } from "./pests";
import { ExpensesView } from "./expenses";
import { TasksView } from "./tasks";
import { FarmMapView } from "./farm-map";
import { AdvisoryView } from "./advisory";
import { BenchmarkView } from "./benchmark";
import { ProfileView } from "./profile";
import { SettingsView } from "./settings";

export function FarmerViews() {
  const { view } = useNav();
  switch (view) {
    case "dashboard":
      return <FarmerDashboard />;
    case "farms":
      return <FarmsView />;
    case "farm-detail":
      return <FarmDetailView />;
    case "crops":
      return <CropsView />;
    case "weather":
      return <WeatherView />;
    case "irrigation":
      return <IrrigationView />;
    case "disease":
      return <DiseaseView />;
    case "market":
      return <MarketView />;
    case "schemes":
      return <SchemesView />;
    case "expert-connect":
      return <ExpertConnectView />;
    case "timeline":
      return <TimelineView />;
    case "notifications":
      return <NotificationsView />;
    case "analytics":
      return <AnalyticsView />;
    case "soil-tests":
      return <SoilTestsView />;
    case "harvests":
      return <HarvestsView />;
    case "crop-calendar":
      return <CropCalendarView />;
    case "pests":
      return <PestsView />;
    case "expenses":
      return <ExpensesView />;
    case "tasks":
      return <TasksView />;
    case "farm-map":
      return <FarmMapView />;
    case "advisory":
      return <AdvisoryView />;
    case "benchmark":
      return <BenchmarkView />;
    case "profile":
      return <ProfileView />;
    case "settings":
      return <SettingsView />;
    default:
      return <FarmerDashboard />;
  }
}
