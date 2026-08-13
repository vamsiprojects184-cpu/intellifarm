"use client";

import { useNav } from "@/lib/nav-store";
import { ExpertDashboard } from "./dashboard";
import { ConsultationsView } from "./consultations";
import { DiseaseCasesView } from "./disease-cases";
import { ExpertProfileView } from "./profile";

export function ExpertViews() {
  const { view } = useNav();
  switch (view) {
    case "expert-dashboard":
      return <ExpertDashboard />;
    case "consultations":
    case "consultation-detail":
      return <ConsultationsView />;
    case "disease-cases":
      return <DiseaseCasesView />;
    case "expert-profile":
      return <ExpertProfileView />;
    default:
      return <ExpertDashboard />;
  }
}
