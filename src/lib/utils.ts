import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function platformColor(p: "LINKEDIN" | "TWITTER" | "INSTAGRAM") {
  switch (p) {
    case "LINKEDIN":
      return "#0A66C2";
    case "TWITTER":
      return "#0F1419";
    case "INSTAGRAM":
      return "#E1306C";
  }
}

export function platformLabel(p: "LINKEDIN" | "TWITTER" | "INSTAGRAM") {
  return { LINKEDIN: "LinkedIn", TWITTER: "Twitter / X", INSTAGRAM: "Instagram" }[p];
}

export function platformLimit(p: "LINKEDIN" | "TWITTER" | "INSTAGRAM") {
  return { LINKEDIN: 3000, TWITTER: 280, INSTAGRAM: 2200 }[p];
}
