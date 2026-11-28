import { Star } from "lucide-react"

import type { AvatarIcon, TreeTheme } from "@/lib/database.types"
import { ORNAMENT_ICONS, TREE_THEMES } from "@/lib/tree-theme"

export type TreeMember = {
  id: string
  display_name: string
  avatar_color: string
  avatar_icon: AvatarIcon
}

type FamilyTreeProps = {
  members: TreeMember[]
  currentUserId: string
  theme?: TreeTheme
  onSelect: (memberId: string) => void
}

function layoutRows(count: number) {
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
  onSelect,
}: FamilyTreeProps) {
  const palette = TREE_THEMES[theme]
  const rows = layoutRows(members.length)
  const top = 24
  const bottom = 86
  const rowGap = rows.length > 1 ? (bottom - top) / (rows.length - 1) : 0
  let index = 0

  return (
    <div
      className="family-tree relative mx-auto w-full max-w-xl rounded-2xl"
      style={{ backgroundColor: palette.background }}
    >
      <svg
        aria-hidden="true"
        className="block h-auto w-full"
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
                    height="5"
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
        <rect fill={palette.trunk} height="12" width="12" x="44" y="98" />
      </svg>
      <Star
        aria-hidden="true"
        className="family-tree-topper absolute top-[1%] left-1/2 size-9 -translate-x-1/2"
        style={{ color: palette.star, fill: palette.star }}
      />
      {rows.map((rowSize, rowIndex) => {
        const y = rows.length === 1 ? 50 : top + rowIndex * rowGap
        const halfWidth = 10 + (y - 12) * 0.42
        return Array.from({ length: rowSize }, (_, column) => {
          const member = members[index++]
          const Icon = ORNAMENT_ICONS[member.avatar_icon] ?? ORNAMENT_ICONS.gift
          const x = 50 + ((column + 1) / (rowSize + 1) - 0.5) * 2 * halfWidth
          return (
            <button
              aria-label={`${member.display_name}'s wish list`}
              className="family-ornament absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
              key={member.id}
              onClick={() => onSelect(member.id)}
              style={{ left: `${x}%`, top: `${(y / 112) * 100}%` }}
              type="button"
            >
              <span
                className="family-ornament-icon flex size-10 items-center justify-center sm:size-12"
                style={{ backgroundColor: colorOf(member.avatar_color) }}
              >
                <Icon
                  aria-hidden="true"
                  className="size-5 text-white sm:size-6"
                />
              </span>
              <span className="family-ornament-name max-w-24 truncate">
                {member.id === currentUserId ? "You" : member.display_name}
              </span>
            </button>
          )
        })
      })}
    </div>
  )
}
