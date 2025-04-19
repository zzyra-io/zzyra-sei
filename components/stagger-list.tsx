import React from "react"
;('"use client')

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface StaggerListProps {
  children: React.ReactNode
  className?: string
  delayIncrement?: number
  initialDelay?: number
}

export function StaggerList({ children, className, delayIncrement = 0.1, initialDelay = 0 }: StaggerListProps) {
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

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: "easeInOut",
      },
    },
  }

  return (
    <motion.div className={cn("stagger-animation", className)} variants={container} initial="hidden" animate="show">
      {React.Children.map(children, (child) => (
        <motion.div variants={item}>{child}</motion.div>
      ))}
    </motion.div>
  )
}
