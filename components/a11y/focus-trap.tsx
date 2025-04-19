"use client"

import type React from "react"

import { useEffect, useRef } from "react"

interface FocusTrapProps {
  children: React.ReactNode
  active?: boolean
  onEscape?: () => void
}

export function FocusTrap({ children, active = true, onEscape }: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!active) return

    const container = containerRef.current
    if (!container) return

    // Find all focusable elements
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )

    if (focusableElements.length === 0) return

    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    // Focus the first element when the trap becomes active
    firstElement.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle escape key
      if (e.key === "Escape" && onEscape) {
        e.preventDefault()
        onEscape()
        return
      }

      // Handle tab key
      if (e.key === "Tab") {
        // Shift + Tab
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault()
            lastElement.focus()
          }
        }
        // Tab
        else {
          if (document.activeElement === lastElement) {
            e.preventDefault()
            firstElement.focus()
          }
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown)

    // Save the previously focused element
    const previouslyFocused = document.activeElement as HTMLElement

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      // Restore focus when unmounted
      if (previouslyFocused) {
        previouslyFocused.focus()
      }
    }
  }, [active, onEscape])

  return (
    <div ref={containerRef} className="outline-none" tabIndex={-1}>
      {children}
    </div>
  )
}
