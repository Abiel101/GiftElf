import { useEffect, useState } from "react"
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom"
import type { Session } from "@supabase/supabase-js"

import { AuthPanel } from "@/components/auth-panel"
import { BrandShell } from "@/components/brand-shell"
import { PixelTree } from "@/components/pixel-art"
import { FamilyDashboard } from "@/components/family-dashboard"
import { SupabaseSetup } from "@/components/supabase-setup"
import { notifyError } from "@/lib/notifications"
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
  const location = useLocation()
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isActive = true
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!isActive) return
      setSession(nextSession)
      setIsLoading(false)
    })

    client.auth
      .getSession()
      .then(({ data, error }) => {
        if (!isActive) return
        if (error) {
          notifyError(error.message)
        } else {
          setSession(data.session)
        }
        setIsLoading(false)
      })
      .catch((error: unknown) => {
        if (!isActive) return
        notifyError(
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
    try {
      const { error } = await client.auth.signOut()
      if (error) notifyError(error.message)
    } catch (error) {
      notifyError(
        error instanceof Error ? error.message : "Could not sign out."
      )
    }
  }

  if (isLoading) {
    return (
      <BrandShell>
        <div
          aria-live="polite"
          className="pixel-loader mx-auto max-w-xl rounded-2xl bg-white p-8 text-lighter-black shadow-lg"
          role="status"
        >
          <PixelTree className="h-40 w-auto" />
          <p className="pixel-loader-text">Decorating your tree</p>
        </div>
      </BrandShell>
    )
  }

  if (!session) {
    return (
      <BrandShell>
        <div className="space-y-5">
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
          <Route path="/list/child/:childId" element={dashboard} />
          <Route path="/team-ups" element={dashboard} />
          <Route
            path="*"
            element={
              <Navigate
                to={{
                  pathname: new URLSearchParams(location.search).has("join")
                    ? "/family"
                    : "/tree",
                  search: location.search,
                }}
                replace
              />
            }
          />
        </Routes>
      </div>
    </BrandShell>
  )
}

export default App
