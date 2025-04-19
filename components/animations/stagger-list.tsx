"use client"

import React from "react"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface StaggerListProps {
  children: React.ReactNode
  className?: string
  delayIncrement?: number
  initialDelay?: number
  as?: React.ElementType
}

export function StaggerList({
  children,
  className,
  delayIncrement = 0.1,
  initialDelay = 0,
  as: Component = "div",
}: StaggerListProps) {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: delayIncrement,
        delayChildren: initialDelay,
      },
    },
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className={className}>
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child

        return (
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 15 },
              show: {
                opacity: 1,
                y: 0,
                transition: {
                  type: "spring",
                  damping: 20,
                  stiffness: 300,
                },
              },
            }}
            key={index}
            className={cn("w-full")}
          >
            {child}
          </motion.div>
        )
      })}
    </motion.div>
  )
}
