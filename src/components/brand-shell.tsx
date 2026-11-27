import { useState, type AnimationEvent, type ReactNode } from "react"
import { Sparkles } from "lucide-react"

type BrandShellProps = {
  children: ReactNode
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

function GiftArtwork() {
  return (
    <g>
      <rect x="8" y="24" width="48" height="34" rx="4" fill="#FF4F58" />
      <path d="M28 24h8v34h-8z" fill="#FFF7EF" />
      <rect x="4" y="18" width="56" height="12" rx="4" fill="#FFC94D" />
      <path
        d="M32 18C17 18 17 7 25 7c5 0 8 5 8 11Zm1 0c1-11 13-15 18-9 4 5-4 9-18 9Z"
        fill="#FFE18B"
        stroke="#FFC94D"
        strokeWidth="2"
      />
      <circle cx="32" cy="21" r="3" fill="#F5B73B" />
    </g>
  )
}

function WalkingElf({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 200 240"
    >
      <ellipse cx="99" cy="228" rx="55" ry="8" fill="#551925" opacity=".22" />
      <g className="intro-elf-leg intro-elf-leg--back">
        <path
          d="m81 157-8 39"
          stroke="#176F53"
          strokeLinecap="round"
          strokeWidth="17"
        />
        <path
          d="M75 191c-11 0-20 6-20 13 0 4 4 7 9 7h19c7 0 10-5 7-11-3-5-8-8-15-9Z"
          fill="#A33F3C"
        />
      </g>
      <g className="intro-elf-leg intro-elf-leg--front">
        <path
          d="m112 159 5 39"
          stroke="#238A65"
          strokeLinecap="round"
          strokeWidth="17"
        />
        <path
          d="M117 193c10 0 19 6 19 13 0 4-4 7-9 7h-19c-7 0-10-5-7-11 3-5 8-8 16-9Z"
          fill="#A33F3C"
        />
      </g>
      <path
        d="M62 103c21-13 51-14 72 0l12 61c-29 17-70 16-108 0l13-48c2-6 5-10 11-13Z"
        fill="#238A65"
      />
      <path
        d="m66 112-17 8-11 22 17 11 19-16m49-24 18 7 13 21-16 12-21-15"
        fill="#3BB78F"
        stroke="#176F53"
        strokeLinejoin="round"
        strokeWidth="4"
      />
      <path
        d="m77 101 18 17 19-17"
        fill="#FFF7EF"
        stroke="#FFF7EF"
        strokeLinejoin="round"
        strokeWidth="4"
      />
      <path
        d="M73 151c15 7 35 8 51 1"
        stroke="#FFC94D"
        strokeLinecap="round"
        strokeWidth="7"
      />
      <circle cx="96" cy="68" r="35" fill="#F2B986" />
      <path
        d="M61 65c2-28 20-45 43-44 21 1 36 18 37 43-24-9-53-9-80 1Z"
        fill="#1F8F6B"
      />
      <path
        d="M111 27c13-23 36-25 51-14-14 2-20 11-19 27-9-7-19-11-32-13Z"
        fill="#3BB78F"
        stroke="#FFF7EF"
        strokeLinejoin="round"
        strokeWidth="3"
      />
      <circle cx="161" cy="12" r="7" fill="#FFC94D" />
      <path
        d="M72 73c4-4 8-4 12 0m22 0c4-4 8-4 12 0"
        stroke="#50352B"
        strokeLinecap="round"
        strokeWidth="4"
      />
      <path
        d="M89 89c5 5 11 5 16 0"
        stroke="#A33F3C"
        strokeLinecap="round"
        strokeWidth="4"
      />
      <g
        className="intro-carried-present"
        transform="translate(124 116) scale(.7)"
      >
        <GiftArtwork />
      </g>
    </svg>
  )
}

function GiftBox({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 64 64"
    >
      <GiftArtwork />
    </svg>
  )
}

export function BrandShell({ children }: BrandShellProps) {
  const [introComplete, setIntroComplete] = useState(false)

  function finishIntro(event: AnimationEvent<HTMLDivElement>) {
    if (
      event.target === event.currentTarget &&
      event.animationName === "intro-exit"
    ) {
      setIntroComplete(true)
    }
  }

  return (
    <main className="brand-background relative min-h-dvh overflow-hidden">
      {!introComplete && (
        <div
          aria-hidden="true"
          className="intro-overlay fixed inset-0 z-30 overflow-hidden text-white"
          onAnimationEnd={finishIntro}
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
            <img
              className="intro-tree absolute right-[8vw] bottom-0 z-10 h-auto"
              src="/img/ChristmasTree.png"
              alt=""
            />
            <div className="intro-walker absolute bottom-[4dvh] left-[4vw] z-20">
              <WalkingElf className="intro-walking-elf block h-auto w-full" />
            </div>
            <GiftBox className="intro-delivered-present absolute z-20" />
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
