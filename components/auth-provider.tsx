"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { SupabaseClient, Session } from "@supabase/supabase-js"

type SupabaseContext = {
  supabase: SupabaseClient
  session: Session | null
  isLoading: boolean
}

const SupabaseContext = createContext<SupabaseContext | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Validate required environment variables
  const [envError, setEnvError] = useState<string | null>(null)

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setEnvError("Missing Supabase environment variables")
    }
  }, [])

  const [supabase] = useState(() => createClient())
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const getSession = async () => {
      try {
        // Handle the initial session
        const {
          data: { session },
        } = await supabase.auth.getSession()
        setSession(session)

        // Set up auth state change listener
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
          setSession(session)
        })

        return () => {
          subscription.unsubscribe()
        }
      } catch (error) {
        console.error("Auth error:", error)
      } finally {
        setIsLoading(false)
      }
    }

    getSession()
  }, [supabase])

  if (envError) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center p-4 text-center">
        <div className="rounded-md bg-destructive/10 p-4 text-destructive">
          <h2 className="text-lg font-semibold">Configuration Error</h2>
          <p>{envError}</p>
          <p className="mt-2 text-sm">Please check your environment variables and restart the application.</p>
        </div>
      </div>
    )
  }

  return <SupabaseContext.Provider value={{ supabase, session, isLoading }}>{children}</SupabaseContext.Provider>
}

export const useSupabase = () => {
  const context = useContext(SupabaseContext)
  if (context === undefined) {
    throw new Error("useSupabase must be used within a SupabaseProvider")
  }
  return context
}
