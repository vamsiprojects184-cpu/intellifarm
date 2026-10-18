"use client";

import { create } from "zustand";
import { api } from "@/lib/api-client";

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  role: "FARMER" | "EXPERT" | "ADMIN";
  preferredLang: string;
  state: string | null;
  district: string | null;
  village: string | null;
  farmingExp: string | null;
  primaryCrop: string | null;
  farmSizeAcres: number | null;
  avatarUrl: string | null;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  expertProfile: {
    id: string;
    specialization: string;
    experience: number;
    qualification: string | null;
    bio: string | null;
    isVerified: boolean;
    rating: number;
    totalConsultations: number;
  } | null;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  initialized: boolean;
  view: "public" | "app";
  fetchUser: () => Promise<void>;
  logout: () => Promise<void>;
  setView: (v: "public" | "app") => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: false,
  initialized: false,
  view: "public",
  fetchUser: async () => {
    set({ loading: true });
    try {
      const data = await api.get<{ user: AuthUser }>("/api/v1/auth/me");
      set({ user: data.user, view: "app", loading: false, initialized: true });
    } catch {
      set({ user: null, view: "public", loading: false, initialized: true });
    }
  },
  logout: async () => {
    try {
      await api.post("/api/v1/auth/logout");
    } catch {}
    set({ user: null, view: "public" });
    window.location.href = "/";
  },
  setView: (v) => set({ view: v }),
}));
