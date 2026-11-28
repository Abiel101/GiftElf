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
  starOutline: string
  lights: [string, string, string]
  presents: [string, string, string]
  presentRibbon: string
  background: string
}

export const TREE_THEMES: Record<TreeTheme, TreeThemeDef> = {
  classic: {
    label: "Classic",
    tiers: ["#6fdcb0", "#3db58a", "#2f9e78", "#1f8f6b"],
    trunk: "#8a5a3c",
    star: "#ffe8a3",
    starOutline: "#a65b16",
    lights: ["#fff3b0", "#ffd36b", "#ffb3bd"],
    presents: ["#e76974", "#ffe4a3", "#88d6b0"],
    presentRibbon: "#58394a",
    background: "#ffffff",
  },
  "tokyo-night": {
    label: "Tokyo Night",
    tiers: ["#7aa2f7", "#6183d6", "#bb9af7", "#7e5fc2"],
    trunk: "#565f89",
    star: "#d8dfff",
    starOutline: "#7189d4",
    lights: ["#fff0bd", "#d0dcff", "#ffb4d7"],
    presents: ["#9ece6a", "#bb9af7", "#7dcfff"],
    presentRibbon: "#30405f",
    background: "#1a1b26",
  },
  mist: {
    label: "Mist",
    tiers: ["#d5e3e8", "#b8cfd6", "#9ab7c1", "#7f9faa"],
    trunk: "#6d858d",
    star: "#d1f6f2",
    starOutline: "#43838d",
    lights: ["#3c7180", "#d18b36", "#fff2ba"],
    presents: ["#74a7aa", "#d9b27c", "#e0bbc3"],
    presentRibbon: "#345c63",
    background: "#eef3f5",
  },
  amber: {
    label: "Amber",
    tiers: ["#ffd58a", "#f5b73b", "#e0952a", "#c77a1c"],
    trunk: "#8b592e",
    star: "#fff6d5",
    starOutline: "#bd7022",
    lights: ["#fff4bf", "#ffe49a", "#db6348"],
    presents: ["#b75d48", "#6eaa82", "#f7d388"],
    presentRibbon: "#553622",
    background: "#fff6e6",
  },
  cyberpunk: {
    label: "Cyberpunk",
    tiers: ["#56e8e1", "#32b7e9", "#c264f2", "#9235d4"],
    trunk: "#7545a5",
    star: "#a8fff5",
    starOutline: "#e66aff",
    lights: ["#ff74e1", "#65fff5", "#ffed83"],
    presents: ["#f177db", "#5ae1d5", "#b992f4"],
    presentRibbon: "#4b276c",
    background: "#291451",
  },
}

export const PERSONAL_TREE_THEMES: Record<
  Exclude<AppTheme, "family">,
  TreeThemeDef
> = TREE_THEMES

export function isTreeTheme(value: string): value is TreeTheme {
  return value in TREE_THEMES
}

export type CustomThemeColors = { hue: number; accent_hue: number }

function hslHex(hue: number, saturation: number, lightness: number) {
  const s = saturation / 100
  const l = lightness / 100
  const a = s * Math.min(l, 1 - l)
  const component = (offset: number) => {
    const k = (offset + hue / 30) % 12
    const value = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(255 * value)
      .toString(16)
      .padStart(2, "0")
  }
  return `#${component(0)}${component(8)}${component(4)}`
}

export function customTreePalette(colors: CustomThemeColors): TreeThemeDef {
  const { hue, accent_hue: accent } = colors
  return {
    label: "Custom",
    tiers: [
      hslHex(hue, 68, 72),
      hslHex(hue, 64, 59),
      hslHex(hue, 62, 49),
      hslHex(hue, 62, 38),
    ],
    trunk: hslHex(hue, 35, 29),
    star: hslHex(accent, 90, 83),
    starOutline: hslHex(accent, 65, 47),
    lights: [
      hslHex(accent, 90, 84),
      hslHex((accent + 45) % 360, 85, 82),
      hslHex(hue, 85, 88),
    ],
    presents: [
      hslHex(accent, 72, 70),
      hslHex((accent + 45) % 360, 65, 72),
      hslHex(hue, 67, 74),
    ],
    presentRibbon: hslHex(hue, 45, 22),
    background: hslHex(hue, 40, 13),
  }
}

export function randomTreeColors(): CustomThemeColors {
  const hue = Math.floor(Math.random() * 360)
  return { hue, accent_hue: (hue + 55 + Math.floor(Math.random() * 196)) % 360 }
}

export function customAppColors(colors: CustomThemeColors) {
  const { hue, accent_hue: accent } = colors
  return {
    "--app-from": hslHex(hue, 42, 19),
    "--app-via-target": hslHex(hue, 40, 13),
    "--app-to": hslHex(hue, 43, 9),
    "--app-fg": "#ffffff",
    "--app-surface": hslHex(hue, 26, 19),
    "--app-surface-fg": "#ffffff",
    "--app-accent": hslHex(accent, 80, 84),
    "--tree-heading": hslHex(accent, 80, 84),
    "--muted": hslHex(hue, 24, 27),
    "--muted-foreground": "#eeeeee",
    "--border": hslHex(hue, 22, 57),
    "--primary": hslHex(hue, 55, 28),
  }
}
