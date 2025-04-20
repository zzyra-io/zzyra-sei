"use client"

import type React from "react"

import { useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface ContextMenuProps {
  x: number
  y: number
  options: {
    label: string
    icon?: React.ReactNode
    onClick: () => void
    divider?: boolean
    disabled?: boolean
  }[]
  onClose: () => void
}

export function ContextMenu({ x, y, options, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [onClose])

  // Calculate position to keep menu in viewport
  const windowWidth = typeof window !== "undefined" ? window.innerWidth : 0
  const windowHeight = typeof window !== "undefined" ? window.innerHeight : 0

  // Assume menu width and height (can be adjusted based on content)
  const menuWidth = 200
  const menuHeight = options.length * 40 + 16

  const adjustedX = Math.min(x, windowWidth - menuWidth - 10)
  const adjustedY = Math.min(y, windowHeight - menuHeight - 10)

  return (
    <Card
      ref={ref}
      className="absolute z-50 min-w-[180px] p-1.5 shadow-md animate-in fade-in"
      style={{
        left: adjustedX,
        top: adjustedY,
      }}
    >
      <div className="flex flex-col">
        {options.map((option, index) => (
          <div key={option.label}>
            <button
              className={cn(
                "flex w-full items-center px-3 py-2 text-sm rounded-sm hover:bg-muted transition-colors",
                option.disabled && "opacity-50 cursor-not-allowed",
              )}
              onClick={() => {
                if (!option.disabled) {
                  option.onClick()
                  onClose()
                }
              }}
              disabled={option.disabled}
            >
              {option.icon && <span className="mr-2">{option.icon}</span>}
              {option.label}
            </button>
            {option.divider && index < options.length - 1 && <div className="my-1 h-px bg-border" />}
          </div>
        ))}
      </div>
    </Card>
  )
}
