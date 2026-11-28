import { useEffect, useState, type ReactNode } from "react"
import { Sparkles } from "lucide-react"

import { PixelElf, PixelLogo, PixelTree } from "@/components/pixel-art"

type BrandShellProps = {
  children: ReactNode
  variant?: "landing" | "app"
}

export function BrandShell({ children, variant = "landing" }: BrandShellProps) {
  return variant === "app" ? (
    <AppShell>{children}</AppShell>
  ) : (
    <LandingShell>{children}</LandingShell>
  )
}

function AppShell({ children }: { children: ReactNode }) {
  return (
    <main className="app-background relative min-h-dvh">
      <div
        aria-hidden="true"
        className="snow-overlay pointer-events-none absolute inset-0 z-0"
      />
      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-6">
        {children}
      </div>
    </main>
  )
}

function LandingShell({ children }: { children: ReactNode }) {
  const [introComplete, setIntroComplete] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setIntroComplete(true), 3600)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <main className="brand-background relative min-h-dvh overflow-hidden">
      {!introComplete && (
        <div
          aria-hidden="true"
          className="intro-overlay fixed inset-0 z-30 overflow-hidden text-white"
        >
          <div className="intro-stage absolute inset-0 overflow-hidden">
            <div className="absolute inset-x-0 top-[8dvh] z-10 flex justify-center">
              <div className="intro-lockup flex items-center gap-3">
                <h1 className="drop-shadow-[0_4px_16px_rgba(80,0,8,0.3)]">
                  <span className="sr-only">GiftElf</span>
                  <PixelLogo className="h-12 w-auto sm:h-16" shadow="#9c2433" />
                </h1>
                <Sparkles className="intro-sparkle size-6 text-[#ffe18b]" />
              </div>
            </div>
            <div className="intro-tree absolute bottom-0 left-1/2 z-10 -translate-x-1/2">
              <PixelTree className="block h-auto w-full" />
            </div>
          </div>
        </div>
      )}

      <section
        className="relative z-10 grid min-h-dvh w-full grid-cols-1 lg:grid-cols-2"
        id="gift-exchange"
      >
        <header className="brand-panel relative isolate flex min-h-56 items-center justify-center overflow-hidden px-5 py-6 text-white sm:min-h-72 sm:px-6 sm:py-10 lg:min-h-dvh lg:px-12 xl:px-20">
          <div className="relative flex max-w-xl flex-col items-center text-center">
            <div className="flex items-center gap-3 sm:flex-col sm:gap-0">
              <div className="elf-mascot-enter mb-0 shrink-0 sm:mb-5">
                <PixelElf className="h-14 w-auto sm:h-24 lg:h-28" />
              </div>
              <h1>
                <span className="sr-only">GiftElf</span>
                <PixelLogo className="h-12 w-auto sm:h-16 lg:h-20" />
              </h1>
            </div>
            <p className="mt-2 text-sm font-semibold text-white/90 sm:mt-3 sm:text-lg">
              Make Christmas special, together.
            </p>
            <p className="mt-1 max-w-md text-xs leading-4 text-white/75 sm:mt-3 sm:text-sm sm:leading-6 lg:mt-4 lg:text-base">
              Share gift links, favorite shops, and the activities you love—so
              your family can find a gift that feels just right.
            </p>
          </div>
        </header>

        <section
          aria-label="Gift Elf account"
          className="auth-background relative isolate flex min-h-dvh w-full items-center justify-center px-5 py-10 sm:px-8 lg:px-10 xl:px-16"
        >
          <div
            aria-hidden="true"
            className="snow-overlay pointer-events-none absolute inset-0 z-0"
          />
          <div
            aria-hidden="true"
            className="holiday-lights pointer-events-none absolute inset-x-0 top-0 z-1 h-20 overflow-hidden"
          >
            <svg
              className="mx-auto block h-auto w-full"
              fill="none"
              preserveAspectRatio="xMidYMin meet"
              viewBox="0 0 800 80"
            >
              <path
                className="holiday-light-wire"
                d="M0 12C120 36 195 39 290 25S470 7 555 22 710 43 800 17"
              />
              <g
                className="holiday-light holiday-light--gold"
                transform="translate(20 18)"
              >
                <path className="holiday-light-stem" d="M0-3v7" />
                <circle className="holiday-light-glow" cx="0" cy="12" r="9" />
                <circle className="holiday-light-bulb" cx="0" cy="12" r="4" />
              </g>
              <g
                className="holiday-light holiday-light--mint"
                transform="translate(115 33)"
              >
                <path className="holiday-light-stem" d="M0-3v7" />
                <circle className="holiday-light-glow" cx="0" cy="12" r="9" />
                <circle className="holiday-light-bulb" cx="0" cy="12" r="4" />
              </g>
              <g
                className="holiday-light holiday-light--coral"
                transform="translate(210 34)"
              >
                <path className="holiday-light-stem" d="M0-3v7" />
                <circle className="holiday-light-glow" cx="0" cy="12" r="9" />
                <circle className="holiday-light-bulb" cx="0" cy="12" r="4" />
              </g>
              <g
                className="holiday-light holiday-light--gold"
                transform="translate(305 22)"
              >
                <path className="holiday-light-stem" d="M0-3v7" />
                <circle className="holiday-light-glow" cx="0" cy="12" r="9" />
                <circle className="holiday-light-bulb" cx="0" cy="12" r="4" />
              </g>
              <g
                className="holiday-light holiday-light--mint"
                transform="translate(400 10)"
              >
                <path className="holiday-light-stem" d="M0-3v7" />
                <circle className="holiday-light-glow" cx="0" cy="12" r="9" />
                <circle className="holiday-light-bulb" cx="0" cy="12" r="4" />
              </g>
              <g
                className="holiday-light holiday-light--coral"
                transform="translate(495 12)"
              >
                <path className="holiday-light-stem" d="M0-3v7" />
                <circle className="holiday-light-glow" cx="0" cy="12" r="9" />
                <circle className="holiday-light-bulb" cx="0" cy="12" r="4" />
              </g>
              <g
                className="holiday-light holiday-light--gold"
                transform="translate(590 25)"
              >
                <path className="holiday-light-stem" d="M0-3v7" />
                <circle className="holiday-light-glow" cx="0" cy="12" r="9" />
                <circle className="holiday-light-bulb" cx="0" cy="12" r="4" />
              </g>
              <g
                className="holiday-light holiday-light--mint"
                transform="translate(685 38)"
              >
                <path className="holiday-light-stem" d="M0-3v7" />
                <circle className="holiday-light-glow" cx="0" cy="12" r="9" />
                <circle className="holiday-light-bulb" cx="0" cy="12" r="4" />
              </g>
              <g
                className="holiday-light holiday-light--coral"
                transform="translate(780 20)"
              >
                <path className="holiday-light-stem" d="M0-3v7" />
                <circle className="holiday-light-glow" cx="0" cy="12" r="9" />
                <circle className="holiday-light-bulb" cx="0" cy="12" r="4" />
              </g>
            </svg>
          </div>
          <div className="relative z-10 w-full">{children}</div>
        </section>
      </section>
    </main>
  )
}
