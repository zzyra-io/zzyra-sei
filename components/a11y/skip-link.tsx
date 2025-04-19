"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

export function SkipLink() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <a
      href="#main-content"
      className={cn(
        "sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50",
        "focus:block focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground",
        "focus:rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary",
      )}
    >
      Skip to main content
    </a>
  )
}
