"use client";

import { create } from "zustand";
import { type Lang, translate } from "@/lib/translations";

interface I18nState {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

function getInitialLang(): Lang {
  if (typeof window === "undefined") return "en";
  const stored = localStorage.getItem("ecocrop-lang");
  if (stored === "en" || stored === "te" || stored === "ta" || stored === "hi") return stored;
  return "en";
}

export const useI18n = create<I18nState>((set) => ({
  lang: getInitialLang(),
  setLang: (lang) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("ecocrop-lang", lang);
    }
    set({ lang });
  },
}));

// Convenience hook — subscribes to lang so components re-render on lang change
export function useT() {
  const lang = useI18n((s) => s.lang);
  return (key: string, fallback?: string) => translate(lang, key, fallback);
}

export function useLang() {
  return useI18n((s) => s.lang);
}

export function useSetLang() {
  return useI18n((s) => s.setLang);
}
