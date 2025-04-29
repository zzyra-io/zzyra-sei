"use client";

import type React from "react";

import { useState } from "react";
import { EdgeLabelRenderer } from "reactflow";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface CustomEdgeLabelProps {
  id: string;
  label?: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  selected?: boolean;
  animated?: boolean;
  color?: string;
  labelStyle?: React.CSSProperties;
  labelClassName?: string;
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
  color = "#10b981",
  labelStyle,
  labelClassName,
}: CustomEdgeLabelProps) {
  const [isHovered, setIsHovered] = useState(false);

  // If there's no label, don't render anything
  if (!label) return null;

  // Calculate the center position of the edge manually
  const edgeCenterX = sourceX + (targetX - sourceX) / 2;
  const edgeCenterY = sourceY + (targetY - sourceY) / 2;

  // Get the transform for the label
  const transform = `translate(-50%, -50%) translate(${edgeCenterX}px,${edgeCenterY}px)`;

  // Determine if the label should be visible
  const isVisible = selected || isHovered || true; // Always visible for demo, but you can change this

  return (
    <EdgeLabelRenderer>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            style={{
              transform,
              ...labelStyle,
            }}
            className={cn(
              "absolute pointer-events-auto select-none z-10",
              labelClassName
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}>
            <Badge
              variant='outline'
              className={cn(
                "bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm shadow-sm",
                selected && "shadow-md",
                animated && "transition-all duration-300"
              )}
              style={{
                borderColor: color,
                color,
                boxShadow: selected
                  ? `0 0 0 1px ${color}20, 0 2px 4px ${color}10`
                  : undefined,
              }}>
              {label}
              {animated && (
                <motion.div
                  className='ml-1.5 h-1.5 w-1.5 rounded-full'
                  style={{ backgroundColor: color }}
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{
                    duration: 1.5,
                    repeat: Number.POSITIVE_INFINITY,
                  }}
                />
              )}
            </Badge>
          </motion.div>
        )}
      </AnimatePresence>
    </EdgeLabelRenderer>
  );
}
