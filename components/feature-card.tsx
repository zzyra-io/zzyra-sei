"use client"

import { motion } from "framer-motion"
import type { LucideIcon } from "lucide-react"

interface FeatureCardProps {
  title: string
  description: string
  icon: LucideIcon
  gradientClass: string
}

export function FeatureCard({ title, description, icon: Icon, gradientClass }: FeatureCardProps) {
  return (
    <motion.div
      className="group relative flex flex-col items-center space-y-4 rounded-xl border p-6 shadow-sm transition-all hover:shadow-md"
      whileHover={{ y: -5 }}
      transition={{ type: "spring", stiffness: 400, damping: 10 }}
    >
      <div
        className={`relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${gradientClass}`}
      >
        <Icon className="h-6 w-6 text-white" />
        <motion.div
          className="absolute inset-0 rounded-full bg-background opacity-0 group-hover:opacity-20"
          initial={{ scale: 0 }}
          whileHover={{ scale: 1.2, opacity: 0.2 }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <h3 className="text-xl font-bold text-center">{title}</h3>

      <p className="text-sm text-center text-muted-foreground">{description}</p>

      <motion.div
        className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-br opacity-0 group-hover:opacity-10"
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 0.1 }}
        transition={{ duration: 0.3 }}
      />
    </motion.div>
  )
}
