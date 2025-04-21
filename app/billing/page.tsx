"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSupabase } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"

export default function BillingPage() {
  const { session } = useSupabase()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleCheckout = async () => {
    if (!session?.user) return
    setLoading(true)
    try {
      const res = await fetch('/api/billing/checkout', { method: 'POST' })
      const { url, error } = await res.json()
      if (error) throw new Error(error)
      window.location.assign(url)
    } catch (err) {
      console.error('Billing error:', err)
      // Optionally show toast
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6 p-6">
      <h1 className="text-2xl font-bold">Billing</h1>
      <p>Upgrade to Premium to unlock higher quotas and premium features.</p>
      <Button onClick={handleCheckout} disabled={loading}>
        {loading ? 'Redirecting...' : 'Upgrade to Premium'}
      </Button>
    </div>
  )
}
