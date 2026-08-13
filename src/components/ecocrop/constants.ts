export const INDIAN_STATES = [
  "Andhra Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Odisha", "Punjab", "Rajasthan", "Tamil Nadu", "Telangana",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

export const CROP_NAMES = [
  "Rice", "Wheat", "Maize", "Tomato", "Onion", "Cotton", "Soybean", "Groundnut",
  "Sugarcane", "Potato", "Chilli", "Banana", "Gram", "Mustard", "Brinjal",
];

export const ACTIVITY_TYPES = [
  "PLANTING",
  "IRRIGATION",
  "FERTILIZER",
  "PESTICIDE",
  "DISEASE_OBS",
  "HARVEST",
  "WEATHER",
  "DISEASE_SCAN",
  "OTHER",
];

export const CONSULTATION_CATEGORIES = [
  "CROP_DISEASE",
  "IRRIGATION",
  "SOIL",
  "FERTILIZER",
  "PEST",
  "GENERAL",
] as const;

export const SCHEME_CATEGORIES = [
  "SUBSIDY",
  "INSURANCE",
  "LOAN",
  "EQUIPMENT",
  "TRAINING",
  "INCOME_SUPPORT",
];

export function formatDate(d: string | Date | null | undefined, withTime = false) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "—";
  if (withTime) {
    return date.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function timeAgo(d: string | Date | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "—";
  const diff = Date.now() - date.getTime();
  if (diff < 0) return "just now";
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(date);
}
