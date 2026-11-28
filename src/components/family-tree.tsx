import type { CSSProperties } from "react"
import { Star } from "lucide-react"

import type { AppTheme, AvatarIcon } from "@/lib/database.types"
import {
  ORNAMENT_ICONS,
  PERSONAL_TREE_THEMES,
  type TreeThemeDef,
} from "@/lib/tree-theme"

export type TreeMember = {
  id: string
  display_name: string
  avatar_color: string
  avatar_icon: AvatarIcon
  avatar_photo?: string | null
  parentName?: string
}

type FamilyTreeProps = {
  members: TreeMember[]
  currentUserId: string
  theme?: Exclude<AppTheme, "family">
  palette?: TreeThemeDef
  giftCount?: number
  onSelect: (memberId: string) => void
}

const lightPositions = [
  [48, 19],
  [53, 21],
  [43, 27],
  [51, 29],
  [57, 28],
  [37, 39],
  [46, 37],
  [55, 40],
  [63, 39],
  [33, 51],
  [42, 48],
  [52, 52],
  [63, 49],
  [25, 63],
  [35, 60],
  [45, 65],
  [57, 61],
  [69, 64],
  [75, 60],
  [20, 75],
  [31, 72],
  [43, 77],
  [56, 73],
  [68, 77],
  [80, 74],
  [15, 88],
  [27, 85],
  [39, 89],
  [51, 86],
  [63, 90],
  [76, 86],
  [85, 89],
]

function layoutRows(count: number) {
  if (count > 3) return Array.from({ length: count }, () => 1)
  const rows: number[] = []
  let remaining = count
  for (let size = 1; remaining > 0; size++) {
    const rowSize = Math.min(size, remaining)
    rows.push(rowSize)
    remaining -= rowSize
  }
  return rows
}

function colorOf(value: string) {
  return /^#[0-9a-f]{3,8}$/i.test(value) ? value : "#ffc94d"
}

export function FamilyTree({
  members,
  currentUserId,
  theme = "classic",
  palette: customPalette,
  giftCount = 0,
  onSelect,
}: FamilyTreeProps) {
  const palette = customPalette ?? PERSONAL_TREE_THEMES[theme]
  const rows = layoutRows(members.length)
  const top = 24
  const bottom = 86
  const rowGap = rows.length > 1 ? (bottom - top) / (rows.length - 1) : 0
  let index = 0

  return (
    <div
      className="family-tree relative mx-auto w-full"
      style={
        {
          "--tree-rows": rows.length,
          "--star-glow": palette.star,
          "--trunk-color": palette.trunk,
          "--gift-space": giftCount
            ? `${Math.ceil(giftCount / 5) * 2.8 + 10}rem`
            : "0rem",
        } as CSSProperties
      }
    >
      <span aria-hidden="true" className="family-tree-shadow" />
      <span aria-hidden="true" className="family-tree-trunk" />
      <svg
        aria-hidden="true"
        className="family-tree-canopy"
        preserveAspectRatio="none"
        shapeRendering="crispEdges"
        viewBox="0 0 100 112"
      >
        {[0, 1, 2, 3].map((tier) => {
          const y = 12 + tier * 20
          const steps = 5
          return (
            <g fill={palette.tiers[tier]} key={tier}>
              {Array.from({ length: steps }, (_, step) => {
                const half = 6 + tier * 8 + step * 3
                return (
                  <rect
                    height={tier === 3 && step === 4 ? 24 : 5}
                    key={step}
                    width={half * 2}
                    x={50 - half}
                    y={y + step * 4}
                  />
                )
              })}
            </g>
          )
        })}
      </svg>
      {lightPositions.map(([x, y], index) => (
        <span
          aria-hidden="true"
          className="family-tree-light"
          key={`${x}-${y}`}
          style={{
            left: `${x}%`,
            top: `calc((100% - var(--tree-base)) * ${y / 112})`,
            color: palette.lights[index % palette.lights.length],
            animationDelay: `${(index % 5) * -0.55}s`,
          }}
        />
      ))}
      <Star
        aria-hidden="true"
        className="family-tree-topper pointer-events-none absolute top-[1%] left-1/2 size-10 -translate-x-1/2 sm:size-12"
        strokeWidth={1.8}
        style={{ color: palette.starOutline, fill: palette.star }}
      />
      <span className="sr-only" role="status">
        {giftCount} {giftCount === 1 ? "purchased gift" : "purchased gifts"}{" "}
        visible to you.
      </span>
      {giftCount > 0 && (
        <div aria-hidden="true" className="family-tree-gifts">
          {Array.from({ length: giftCount }, (_, index) => (
            <span
              className="family-tree-gift"
              key={index}
              style={
                {
                  "--gift-color":
                    palette.presents[index % palette.presents.length],
                  "--gift-ribbon": palette.presentRibbon,
                } as CSSProperties
              }
            >
              <span className="family-tree-gift-bow" />
            </span>
          ))}
        </div>
      )}
      {rows.map((rowSize, rowIndex) => {
        const y = rows.length === 1 ? 50 : top + rowIndex * rowGap
        const halfWidth = 10 + (y - 12) * 0.42
        return Array.from({ length: rowSize }, (_, column) => {
          const member = members[index++]
          const Icon = ORNAMENT_ICONS[member.avatar_icon] ?? ORNAMENT_ICONS.gift
          const x =
            rows.length > 3
              ? 50 + (rowIndex % 2 === 0 ? -0.5 : 0.5) * halfWidth
              : 50 + ((column + 1) / (rowSize + 1) - 0.5) * 2 * halfWidth
          return (
            <button
              aria-label={`${member.display_name}'s wish list${member.parentName ? `, child of ${member.parentName}` : ""}`}
              className="family-ornament absolute z-10 flex min-h-11 min-w-11 -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
              key={member.id}
              onClick={() => onSelect(member.id)}
              style={{
                left: `${x}%`,
                top: `calc((100% - var(--tree-base)) * ${y / 112})`,
              }}
              type="button"
            >
              <span
                className="family-ornament-icon flex size-8 items-center justify-center overflow-hidden sm:size-12"
                style={{ backgroundColor: colorOf(member.avatar_color) }}
              >
                {member.avatar_photo ? (
                  <img
                    alt=""
                    className="size-full object-cover"
                    src={member.avatar_photo}
                  />
                ) : (
                  <Icon
                    aria-hidden="true"
                    className="size-4 text-white sm:size-6"
                  />
                )}
              </span>
              <span className="family-ornament-name max-w-24 truncate">
                {member.id === currentUserId ? "You" : member.display_name}
              </span>
              {member.parentName && (
                <span className="family-ornament-name max-w-24 truncate">
                  Child of {member.parentName}
                </span>
              )}
            </button>
          )
        })
      })}
    </div>
  )
}
