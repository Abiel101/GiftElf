import type { CSSProperties } from "react"

type Palette = Record<string, string>

type PixelSpriteProps = {
  rows: string[]
  palette: Palette
  className?: string
  // "bottom-up" builds the sprite from the ground; "scatter" pops pixels in
  // pseudo-randomly; "left-right" sweeps like a typewriter.
  order?: "bottom-up" | "scatter" | "left-right"
  stepMs?: number
}

function jitter(x: number, y: number) {
  return ((x * 73856093) ^ (y * 19349663)) >>> 0
}

export function PixelSprite({
  rows,
  palette,
  className,
  order = "bottom-up",
  stepMs = 45,
}: PixelSpriteProps) {
  const width = Math.max(...rows.map((row) => row.length))
  const height = rows.length
  const pixels: { x: number; y: number; fill: string; delay: number }[] = []

  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const fill = palette[row[x]]
      if (!fill) continue
      const noise = jitter(x, y) % 6
      const delay =
        order === "bottom-up"
          ? (height - 1 - y) * stepMs + noise * (stepMs / 3)
          : order === "left-right"
            ? x * stepMs + noise * (stepMs / 3)
            : (jitter(x, y) % 40) * stepMs
      pixels.push({ x, y, fill, delay })
    }
  })

  return (
    <svg
      aria-hidden="true"
      className={className}
      shapeRendering="crispEdges"
      viewBox={`0 0 ${width} ${height}`}
    >
      {pixels.map(({ x, y, fill, delay }) => (
        <rect
          className="pixel-pop"
          fill={fill}
          height="1"
          stroke={fill}
          strokeWidth="0.06"
          key={`${x}-${y}`}
          style={{ animationDelay: `${delay}ms` } as CSSProperties}
          width="1"
          x={x}
          y={y}
        />
      ))}
    </svg>
  )
}

const TREE_PALETTE: Palette = {
  Y: "#ffe18b",
  y: "#f5b73b",
  g: "#6fdcb0",
  G: "#2f9e78",
  D: "#1f8f6b",
  R: "#ff4f58",
  W: "#fff7ef",
  B: "#8a5a3c",
}

const TREE_ROWS = [
  ".......y.......",
  "......yYy......",
  ".....yYYYy.....",
  "......yYy......",
  ".......g.......",
  "......ggg......",
  ".....gGgGg.....",
  "....ggRGgGg....",
  ".....gGgGD.....",
  "....ggGgGgD....",
  "...gGgWGgGDG...",
  "....gGgGgGRD...",
  "...ggGgGgGgDD..",
  "..gGgGRGgGgGDG.",
  ".gGgGgGgGWgGgDG",
  "...gGgGgGgGgD..",
  "..gGgRGgGgGgDD.",
  ".gGgGgGgGgGgGDG",
  "ggGgGgGWGgGgGDD",
  ".......BB......",
  ".......BB......",
]

export function PixelTree({ className }: { className?: string }) {
  return (
    <PixelSprite
      className={className}
      palette={TREE_PALETTE}
      rows={TREE_ROWS}
    />
  )
}

const ELF_PALETTE: Palette = {
  G: "#1f8f6b",
  g: "#3bb78f",
  W: "#fff7ef",
  Y: "#ffc94d",
  S: "#f2b986",
  K: "#50352B",
  R: "#ff4f58",
  M: "#a33f3c",
}

const ELF_ROWS = [
  ".....WW.....",
  "....GGGG....",
  "...GGgGGG...",
  "..GGGGGGGG..",
  ".GGGGGGGGGG.",
  "WWWWWWWWWWWW",
  ".SSSSSSSSSS.",
  "SSSKSSSSKSSS",
  "SSSSSSSSSSSS",
  ".SSSSMMSSSS.",
  "..SSSSSSSS..",
  "...RRRRRR...",
  "..RRRYYRRR..",
  ".SRRRRRRRRS.",
  "..RRRRRRRR..",
  "..GG....GG..",
]

export function PixelElf({ className }: { className?: string }) {
  return (
    <PixelSprite
      className={className}
      order="scatter"
      palette={ELF_PALETTE}
      rows={ELF_ROWS}
      stepMs={30}
    />
  )
}

// 7-row bitmap letters for the wordmark ("GiftElf").
const FONT: Record<string, string[]> = {
  G: [".XXX.", "X...X", "X....", "X.XXX", "X...X", "X...X", ".XXX."],
  i: [".X.", "...", "XX.", ".X.", ".X.", ".X.", "XXX"],
  f: [".XXX", ".X..", "XXX.", ".X..", ".X..", ".X..", ".X.."],
  t: [".X..", ".X..", "XXX.", ".X..", ".X..", ".X..", "..XX"],
  E: ["XXXXX", "X....", "X....", "XXXX.", "X....", "X....", "XXXXX"],
  l: ["XX.", ".X.", ".X.", ".X.", ".X.", ".X.", "XXX"],
}

// Draws the word in two colors with a 1px retro drop shadow ("S").
function wordmarkRows(word: string, split: number) {
  const height = 7
  const letters = [...word].map((letter, index) => ({
    glyph: FONT[letter],
    color: index < split ? "W" : "Y",
  }))
  const width =
    letters.reduce((sum, { glyph }) => sum + glyph[0].length + 1, -1) + 1
  const grid = Array.from({ length: height + 1 }, () =>
    Array<string>(width).fill(".")
  )
  let offset = 0
  for (const { glyph } of letters) {
    glyph.forEach((line, y) => {
      for (let x = 0; x < line.length; x++) {
        if (line[x] === "X") grid[y + 1][offset + x + 1] = "S"
      }
    })
    offset += glyph[0].length + 1
  }
  offset = 0
  for (const { glyph, color } of letters) {
    glyph.forEach((line, y) => {
      for (let x = 0; x < line.length; x++) {
        if (line[x] === "X") grid[y][offset + x] = color
      }
    })
    offset += glyph[0].length + 1
  }
  return grid.map((row) => row.join(""))
}

const LOGO_ROWS = wordmarkRows("GiftElf", 4)

export function PixelLogo({
  className,
  shadow = "#14684d",
}: {
  className?: string
  shadow?: string
}) {
  return (
    <PixelSprite
      className={className}
      order="left-right"
      palette={{ W: "#ffffff", Y: "#ffe18b", S: shadow }}
      rows={LOGO_ROWS}
      stepMs={22}
    />
  )
}
