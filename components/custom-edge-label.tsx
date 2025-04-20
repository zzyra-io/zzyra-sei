import type React from "react"
import { EdgeLabelRenderer } from "reactflow"
import { cn } from "@/lib/utils"

interface CustomEdgeLabelProps {
  id: string
  label?: string
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  selected?: boolean
  animated?: boolean
  labelStyle?: React.CSSProperties
  labelClassName?: string
}

export function CustomEdgeLabel({
  id,
  label,
  sourceX,
  sourceY,
  targetX,
  targetY,
  selected,
  animated,
  labelStyle,
  labelClassName,
}: CustomEdgeLabelProps) {
  // If there's no label, don't render anything
  if (!label) return null

  // Calculate the center position of the edge manually
  const edgeCenterX = sourceX + (targetX - sourceX) / 2
  const edgeCenterY = sourceY + (targetY - sourceY) / 2

  // Get the transform for the label
  const transform = `translate(-50%, -50%) translate(${edgeCenterX}px,${edgeCenterY}px)`

  return (
    <EdgeLabelRenderer>
      <div
        style={{
          transform,
          ...labelStyle,
        }}
        className={cn(
          "absolute px-2 py-1 pointer-events-auto bg-background border rounded text-xs select-none",
          animated && "animate-pulse",
          selected ? "border-primary shadow-sm" : "border-border",
          labelClassName,
        )}
      >
        {label}
      </div>
    </EdgeLabelRenderer>
  )
}
