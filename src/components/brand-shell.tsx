import { useEffect, useState, type ReactNode } from "react"
import { Sparkles } from "lucide-react"

type BrandShellProps = {
  children: ReactNode
  variant?: "landing" | "app"
}

function ElfMascot({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 220 220"
    >
      <circle cx="110" cy="110" r="104" fill="#FFF7EF" />
      <circle
        cx="110"
        cy="110"
        r="101"
        stroke="#FFC94D"
        strokeOpacity=".7"
        strokeWidth="3"
      />
      <path d="m51 113-23-8 15 26 15 8m96-26 23-8-15 26-15 8" fill="#F5B73B" />
      <path
        d="M56 77c0-30 24-53 54-53s54 23 54 53v49c0 34-24 58-54 58s-54-24-54-58V77Z"
        fill="#F2B986"
      />
      <path
        d="M56 108c12-7 19-17 22-29 12 13 34 19 74 13 2 12 6 21 12 27V75c0-31-24-55-54-55S56 44 56 75v33Z"
        fill="#1F8F6B"
      />
      <path
        d="M47 75c21-3 43-16 62-49 14 29 34 42 65 43l-8 20c-32 4-59-5-78-21-9 13-21 22-37 27l-4-20Z"
        fill="#3BB78F"
      />
      <path
        d="M49 73c20-4 42-16 60-47 15 28 35 41 63 42"
        stroke="#FFF7EF"
        strokeLinecap="round"
        strokeWidth="7"
      />
      <path d="m110 20 9-10 10 5-2 12-10 4-8-11Z" fill="#FFC94D" />
      <path
        d="M85 113c5-5 11-5 16 0m18 0c5-5 11-5 16 0"
        stroke="#50352B"
        strokeLinecap="round"
        strokeWidth="5"
      />
      <path
        d="M99 143c7 7 15 7 22 0"
        stroke="#A33F3C"
        strokeLinecap="round"
        strokeWidth="5"
      />
      <path d="m76 162 34 22 34-22-9 36h-50l-9-36Z" fill="#FF4F58" />
      <path d="m102 175 8 9 8-9-8-8-8 8Z" fill="#FFC94D" />
    </svg>
  )
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
    <main className="auth-background relative min-h-dvh">
      <div
        aria-hidden="true"
        className="snow-overlay pointer-events-none absolute inset-0 z-0"
      />
      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
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
                <h1 className="font-sans text-5xl font-black tracking-[-0.07em] drop-shadow-[0_4px_16px_rgba(80,0,8,0.3)] sm:text-6xl">
                  Gift<span className="text-[#ffe18b]">Elf</span>
                </h1>
                <Sparkles className="intro-sparkle size-6 text-[#ffe18b]" />
              </div>
            </div>
            <div className="intro-tree absolute bottom-0 left-1/2 z-10 -translate-x-1/2">
              {[1, 2, 3].map((tier) => (
                <img
                  alt=""
                  className={`intro-tree-tier intro-tree-tier--${tier}`}
                  key={tier}
                  src="/img/ChristmasTree.png"
                />
              ))}
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
              <div className="elf-mascot-enter mb-0 shrink-0 rounded-full bg-white/10 p-1 ring-1 ring-white/25 sm:mb-5 sm:p-1.5">
                <ElfMascot className="size-12 sm:size-20 lg:size-24" />
              </div>
              <h1 className="text-4xl leading-none font-black tracking-[-0.075em] sm:text-6xl lg:text-7xl">
                Gift<span className="text-[#ffe18b]">Elf</span>
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
