"use client"

import { motion } from "framer-motion"
import { Shield, Lock, Award, CheckCircle } from "lucide-react"

export function TrustBadges() {
  const badges = [
    {
      icon: Shield,
      title: "Security-First Development",
      description: "Built with enterprise security principles from day one",
    },
    {
      icon: Lock,
      title: "Local Key Management",
      description: "Development focus on client-side key protection",
    },
    {
      icon: Award,
      title: "Open Source Foundation",
      description: "Transparent development with community review",
    },
    {
      icon: CheckCircle,
      title: "Beta Testing Program",
      description: "Rigorous testing with early development partners",
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {badges.map((badge, index) => (
        <motion.div
          key={badge.title}
          className="flex flex-col items-center rounded-xl border bg-background/50 p-4 text-center backdrop-blur-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
          whileHover={{ y: -5, boxShadow: "0 10px 30px -15px rgba(0, 0, 0, 0.1)" }}
        >
          <div className="mb-3 rounded-full bg-primary/10 p-3">
            <badge.icon className="h-6 w-6 text-primary" />
          </div>
          <h3 className="mb-1 text-sm font-medium">{badge.title}</h3>
          <p className="text-xs text-muted-foreground">{badge.description}</p>
        </motion.div>
      ))}
    </div>
  )
}
