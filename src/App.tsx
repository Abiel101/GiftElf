import { useEffect, useState } from "react"
import type { Session } from "@supabase/supabase-js"

import { AuthPanel } from "@/components/auth-panel"
import { BrandShell } from "@/components/brand-shell"
import { FamilyDashboard } from "@/components/family-dashboard"
import { SupabaseSetup } from "@/components/supabase-setup"
import type { GiftElfSupabaseClient } from "@/lib/supabase"
import { supabase } from "@/lib/supabase"

export function App() {
  return (
    <BrandShell>
      <ConnectionGate />
    </BrandShell>
  )
}

function ConnectionGate() {
  if (!supabase) return <SupabaseSetup />

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

  return (
    <div className="space-y-5">
      {authError && (
        <p
          aria-live="polite"
          className="rounded-lg bg-red-100 px-4 py-3 text-sm text-red-800"
        >
          {authError}
        </p>
      )}
      {isLoading ? (
        <div
          aria-live="polite"
          className="mx-auto max-w-xl rounded-2xl bg-white p-8 text-center text-sm text-muted-foreground shadow-lg"
        >
          Preparing your family space...
        </div>
      ) : session ? (
        <FamilyDashboard
          client={client}
          onSignOut={signOut}
          user={session.user}
        />
      ) : (
        <AuthPanel client={client} />
      )}
    </div>
  )
}

export default App
