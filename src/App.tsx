import { useEffect, useState } from "react"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import type { Session } from "@supabase/supabase-js"

import { AuthPanel } from "@/components/auth-panel"
import { BrandShell } from "@/components/brand-shell"
import { FamilyDashboard } from "@/components/family-dashboard"
import { SupabaseSetup } from "@/components/supabase-setup"
import type { GiftElfSupabaseClient } from "@/lib/supabase"
import { supabase } from "@/lib/supabase"

export function App() {
  return (
    <BrowserRouter>
      <ConnectionGate />
    </BrowserRouter>
  )
}

function ConnectionGate() {
  if (!supabase) {
    return (
      <BrandShell>
        <SupabaseSetup />
      </BrandShell>
    )
  }

  return <AuthenticatedApp client={supabase} />
}

type AuthenticatedAppProps = {
  client: GiftElfSupabaseClient
}

function AuthenticatedApp({ client }: AuthenticatedAppProps) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [authError, setAuthError] = useState("")

  useEffect(() => {
    let isActive = true
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!isActive) return
      setSession(nextSession)
      setIsLoading(false)
      setAuthError("")
    })

    client.auth
      .getSession()
      .then(({ data, error }) => {
        if (!isActive) return
        if (error) {
          setAuthError(error.message)
        } else {
          setSession(data.session)
        }
        setIsLoading(false)
      })
      .catch((error: unknown) => {
        if (!isActive) return
        setAuthError(
          error instanceof Error
            ? error.message
            : "Could not read the Supabase session."
        )
        setIsLoading(false)
      })

    return () => {
      isActive = false
      subscription.unsubscribe()
    }
  }, [client])

  async function signOut() {
    setAuthError("")

    try {
      const { error } = await client.auth.signOut()
      if (error) setAuthError(error.message)
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : "Could not sign out."
      )
    }
  }

  const errorBanner = authError && (
    <p
      aria-live="polite"
      className="rounded-lg bg-red-100 px-4 py-3 text-sm text-red-800"
    >
      {authError}
    </p>
  )

  if (isLoading) {
    return (
      <BrandShell>
        <div
          aria-live="polite"
          className="mx-auto max-w-xl rounded-2xl bg-white p-8 text-center text-sm text-muted-foreground shadow-lg"
        >
          Preparing your family space...
        </div>
      </BrandShell>
    )
  }

  if (!session) {
    return (
      <BrandShell>
        <div className="space-y-5">
          {errorBanner}
          <AuthPanel client={client} />
        </div>
      </BrandShell>
    )
  }

  const dashboard = (
    <FamilyDashboard client={client} onSignOut={signOut} user={session.user} />
  )

  return (
    <BrandShell variant="app">
      <div className="space-y-5">
        {errorBanner}
        <Routes>
          <Route path="/tree" element={dashboard} />
          <Route path="/family" element={dashboard} />
          <Route path="/profile" element={dashboard} />
          <Route path="/profile/list" element={dashboard} />
          <Route
            path="/list"
            element={<Navigate to="/profile/list" replace />}
          />
          <Route path="/list/:ownerId" element={dashboard} />
          <Route path="/team-ups" element={dashboard} />
          <Route path="*" element={<Navigate to="/tree" replace />} />
        </Routes>
      </div>
    </BrandShell>
  )
}

export default App
