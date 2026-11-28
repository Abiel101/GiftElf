import {
  Bell,
  Candy,
  CandyCane,
  Cookie,
  Gem,
  Gift,
  Heart,
  Puzzle,
  Rocket,
  Snowflake,
  Star,
  type LucideIcon,
} from "lucide-react"

import type { AppTheme, AvatarIcon, TreeTheme } from "@/lib/database.types"

export const ORNAMENT_ICONS: Record<AvatarIcon, LucideIcon> = {
  gift: Gift,
  bell: Bell,
  "candy-cane": CandyCane,
  snowflake: Snowflake,
  cookie: Cookie,
  gem: Gem,
  rocket: Rocket,
  puzzle: Puzzle,
  candy: Candy,
  heart: Heart,
  star: Star,
}

export const ORNAMENT_COLORS = [
  "#ff4f58",
  "#f5b73b",
  "#3db58a",
  "#4f8cff",
  "#a569ff",
  "#ff8fc7",
  "#ff8a3d",
  "#2ec4d6",
]

export type TreeThemeDef = {
  label: string
  tiers: [string, string, string, string]
  trunk: string
  star: string
  background: string
}

export const TREE_THEMES: Record<TreeTheme, TreeThemeDef> = {
  classic: {
    label: "Classic",
    tiers: ["#6fdcb0", "#3db58a", "#2f9e78", "#1f8f6b"],
    trunk: "#8a5a3c",
    star: "#f5b73b",
    background: "#ffffff",
  },
  "tokyo-night": {
    label: "Tokyo Night",
    tiers: ["#7aa2f7", "#6183d6", "#bb9af7", "#7e5fc2"],
    trunk: "#565f89",
    star: "#e0af68",
    background: "#1a1b26",
  },
  mist: {
    label: "Mist",
    tiers: ["#d5e3e8", "#b8cfd6", "#9ab7c1", "#7f9faa"],
    trunk: "#8d8d94",
    star: "#f2f2f2",
    background: "#eef3f5",
  },
  amber: {
    label: "Amber",
    tiers: ["#ffd58a", "#f5b73b", "#e0952a", "#c77a1c"],
    trunk: "#6b4226",
    star: "#fff1c4",
    background: "#fff6e6",
  },
}

export const PERSONAL_TREE_THEMES: Record<
  Exclude<AppTheme, "family">,
  TreeThemeDef
> = {
  ...TREE_THEMES,
  cyberpunk: {
    label: "Cyberpunk",
    tiers: ["#56e8e1", "#32b7e9", "#c264f2", "#9235d4"],
    trunk: "#a665e0",
    star: "#ffe768",
    background: "#291451",
  },
}

export function isTreeTheme(value: string): value is TreeTheme {
  return value in TREE_THEMES
}
