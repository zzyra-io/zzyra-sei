"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Users, Zap, Clock, ArrowUpRight } from "lucide-react"

interface StatsCounterProps {
  label: string
  value: number
  icon: React.ElementType
  prefix?: string
  suffix?: string
  duration?: number
}

export function StatsCounter({ label, value, icon: Icon, prefix = "", suffix = "", duration = 2 }: StatsCounterProps) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const step = Math.ceil(value / (duration * 60))
    let current = 0
    const timer = setInterval(() => {
      current += step
      if (current >= value) {
        setCount(value)
        clearInterval(timer)
      } else {
        setCount(current)
      }
    }, 1000 / 60)

    return () => clearInterval(timer)
  }, [value, duration])

  return (
    <motion.div
      className="flex flex-col rounded-xl border bg-background/50 p-4 backdrop-blur-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ y: -5, boxShadow: "0 10px 30px -15px rgba(0, 0, 0, 0.1)" }}
    >
      <div className="flex items-center justify-between">
        <div className="rounded-full bg-primary/10 p-2">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <motion.div
          className="rounded-full bg-primary/5 p-1"
          whileHover={{ scale: 1.2, backgroundColor: "rgba(124, 58, 237, 0.2)" }}
        >
          <ArrowUpRight className="h-3 w-3 text-primary" />
        </motion.div>
      </div>
      <div className="mt-3 text-2xl font-bold">
        {prefix}
        {count.toLocaleString()}
        {suffix}
      </div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </motion.div>
  )
}

export function StatsCounterGroup() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
      <StatsCounter label="Target: Early Adopters" value={1000} icon={Users} />
      <StatsCounter label="Goal: Workflows" value={10000} icon={Zap} />
      <StatsCounter label="Vision: Daily Operations" value={100000} icon={Clock} suffix="+" />
      <StatsCounter label="Projected: Time Savings" value={20} icon={Clock} suffix=" hrs/week" />
    </div>
  )
}
