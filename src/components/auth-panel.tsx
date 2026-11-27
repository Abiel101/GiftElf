import { useState, type FormEvent } from "react"
import { ArrowRight, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { GiftElfSupabaseClient } from "@/lib/supabase"

type AuthPanelProps = {
  client: GiftElfSupabaseClient
}

type AuthFaceProps = {
  isSignUp: boolean
  displayName: string
  email: string
  password: string
  errorMessage: string
  notice: string
  isSubmitting: boolean
  onDisplayNameChange: (value: string) => void
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>, isSignUp: boolean) => void
  onGoogle: () => void
  onSwitchMode: () => void
}

function AuthFace({
  isSignUp,
  displayName,
  email,
  password,
  errorMessage,
  notice,
  isSubmitting,
  onDisplayNameChange,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onGoogle,
  onSwitchMode,
}: AuthFaceProps) {
  return (
    <div className="rounded-[1.5rem] border-t-4 border-t-[#2f9e78] bg-white p-5 shadow-[0_24px_70px_-32px_rgba(31,87,68,0.4)] sm:rounded-[1.75rem] sm:p-7 lg:p-8">
      <div className="mb-5">
        <span className="mb-3 inline-flex size-10 items-center justify-center rounded-xl bg-[#eaf7f0] text-[#238663]">
          <Sparkles aria-hidden="true" className="size-5" />
        </span>
        <p className="mb-1.5 font-mono text-xs tracking-[0.18em] text-accent-red uppercase">
          {isSignUp
            ? "Your family’s holiday starts here"
            : "Your holiday, together"}
        </p>
        <h2 className="text-2xl font-extrabold tracking-tight text-lighter-black sm:text-3xl">
          {isSignUp ? "Let’s make some magic." : "Welcome back."}
        </h2>
        <p className="mt-2 max-w-md text-sm leading-5 text-muted-foreground">
          {isSignUp
            ? "Create your account to start a family wish list and make gift giving easier."
            : "Sign in to see your family’s wish lists and pick up right where the magic left off."}
        </p>
      </div>

      <Button
        className="h-11 w-full gap-3 rounded-xl border-border bg-white text-sm font-semibold text-lighter-black shadow-sm hover:border-[#c9c9c9] hover:bg-[#fafafa]"
        disabled={isSubmitting}
        onClick={onGoogle}
        type="button"
        variant="outline"
      >
        <span aria-hidden="true" className="text-base font-bold text-[#4285f4]">
          G
        </span>
        Continue with Google
      </Button>

      <div className="my-4 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs font-medium text-muted-foreground">
          or continue with email
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <form
        className="space-y-3"
        onSubmit={(event) => onSubmit(event, isSignUp)}
      >
        {isSignUp && (
          <label className="block space-y-2 text-sm font-semibold text-lighter-black">
            Display name
            <Input
              autoComplete="name"
              className="h-11 rounded-xl bg-white px-4 text-base"
              maxLength={80}
              onChange={(event) => onDisplayNameChange(event.target.value)}
              placeholder="How your family knows you"
              required
              value={displayName}
            />
          </label>
        )}
        <label className="block space-y-2 text-sm font-semibold text-lighter-black">
          Email address
          <Input
            autoComplete="email"
            className="h-11 rounded-xl bg-white px-4 text-base"
            onChange={(event) => onEmailChange(event.target.value)}
            placeholder="you@example.com"
            required
            type="email"
            value={email}
          />
        </label>
        <label className="block space-y-2 text-sm font-semibold text-lighter-black">
          Password
          <Input
            autoComplete={isSignUp ? "new-password" : "current-password"}
            className="h-11 rounded-xl bg-white px-4 text-base"
            minLength={8}
            onChange={(event) => onPasswordChange(event.target.value)}
            placeholder="At least 8 characters"
            required
            type="password"
            value={password}
          />
        </label>

        {errorMessage && (
          <p
            aria-live="polite"
            className="rounded-xl bg-red-50 px-4 py-3 text-sm text-destructive"
          >
            {errorMessage}
          </p>
        )}
        {notice && (
          <p
            aria-live="polite"
            className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700"
          >
            {notice}
          </p>
        )}

        <Button
          className="h-11 w-full gap-2 rounded-xl bg-accent-red text-sm font-bold text-white shadow-[0_8px_18px_-8px_rgba(251,77,84,0.75)] transition hover:-translate-y-0.5 hover:bg-[#e23e46] hover:shadow-[0_12px_22px_-8px_rgba(251,77,84,0.65)]"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting
            ? "Please wait..."
            : isSignUp
              ? "Create your account"
              : "Sign in"}
          {!isSubmitting && (
            <ArrowRight aria-hidden="true" className="size-4" />
          )}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        {isSignUp ? "Already part of GiftElf?" : "New to GiftElf?"}{" "}
        <button
          className="font-bold text-[#238663] underline-offset-4 hover:underline"
          onClick={onSwitchMode}
          type="button"
        >
          {isSignUp ? "Sign in" : "Create an account"}
        </button>
      </p>
    </div>
  )
}

// Supabase returns OAuth failures in the redirect URL; surface them.
function readOAuthError() {
  const url = new URL(window.location.href)
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""))
  return (
    url.searchParams.get("error_description") ??
    hash.get("error_description") ??
    ""
  )
}

export function AuthPanel({ client }: AuthPanelProps) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [displayName, setDisplayName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [errorMessage, setErrorMessage] = useState(readOAuthError)
  const [notice, setNotice] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function submitAuth(
    event: FormEvent<HTMLFormElement>,
    signingUp: boolean
  ) {
    event.preventDefault()
    setErrorMessage("")
    setNotice("")
    setIsSubmitting(true)

    try {
      if (signingUp) {
        const { data, error } = await client.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: displayName.trim() } },
        })

        if (error) {
          setErrorMessage(error.message)
        } else if (data.session) {
          setNotice("Your account is ready. Create or join a family below.")
        } else {
          setNotice("Check your email to confirm your account, then sign in.")
        }
      } else {
        const { error } = await client.auth.signInWithPassword({
          email: email.trim(),
          password,
        })

        if (error) setErrorMessage(error.message)
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not connect to Supabase. Check your connection and try again."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  async function signInWithGoogle() {
    setErrorMessage("")
    setNotice("")
    setIsSubmitting(true)
    try {
      const { error } = await client.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      })
      if (error) setErrorMessage(error.message)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not start Google sign-in."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  function switchMode() {
    setIsSignUp((current) => !current)
    setErrorMessage("")
    setNotice("")
  }

  const faceProps = {
    displayName,
    email,
    errorMessage,
    isSubmitting,
    notice,
    onDisplayNameChange: setDisplayName,
    onEmailChange: setEmail,
    onGoogle: () => void signInWithGoogle(),
    onPasswordChange: setPassword,
    onSubmit: (event: FormEvent<HTMLFormElement>, signingUp: boolean) =>
      void submitAuth(event, signingUp),
    onSwitchMode: switchMode,
    password,
  }

  return (
    <div
      className={`auth-flip-card mx-auto w-full max-w-lg ${isSignUp ? "is-flipped" : ""}`}
    >
      <div className="auth-flip-inner">
        <section
          aria-hidden={isSignUp}
          className="auth-card-face"
          inert={isSignUp}
        >
          <AuthFace {...faceProps} isSignUp={false} />
        </section>
        <section
          aria-hidden={!isSignUp}
          className="auth-card-face auth-card-back"
          inert={!isSignUp}
        >
          <AuthFace {...faceProps} isSignUp />
        </section>
      </div>
    </div>
  )
}
