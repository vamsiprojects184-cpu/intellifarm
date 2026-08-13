"use client";

import { create } from "zustand";

export type FarmerView =
  | "dashboard"
  | "farms"
  | "farm-detail"
  | "crops"
  | "weather"
  | "irrigation"
  | "disease"
  | "market"
  | "schemes"
  | "expert"
  | "timeline"
  | "notifications"
  | "analytics"
  | "profile"
  | "settings";

export type ExpertView =
  | "expert-dashboard"
  | "consultations"
  | "consultation-detail"
  | "disease-cases"
  | "expert-profile";

export type AdminView =
  | "admin-dashboard"
  | "admin-users"
  | "admin-farms"
  | "admin-schemes"
  | "admin-market"
  | "admin-disease-db"
  | "admin-stats";

export type AppView = FarmerView | ExpertView | AdminView;

interface NavState {
  view: AppView;
  params: Record<string, string>;
  navigate: (view: AppView, params?: Record<string, string>) => void;
}

export const useNav = create<NavState>((set) => ({
  view: "dashboard",
  params: {},
  navigate: (view, params = {}) => {
    set({ view, params });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  },
}));
