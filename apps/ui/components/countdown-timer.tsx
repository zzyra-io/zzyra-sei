"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Clock } from "lucide-react"

export function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState({
    days: 7,
    hours: 23,
    minutes: 59,
    seconds: 59,
  })

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 }
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 }
        } else if (prev.hours > 0) {
          return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 }
        } else if (prev.days > 0) {
          return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 }
        }
        return prev
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  return (
    <motion.div
      className="rounded-xl border bg-background/80 p-4 backdrop-blur-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Clock className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium">Limited Time Offer</h3>
        </div>
        <div className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">50% OFF</div>
      </div>

      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          { label: "Days", value: timeLeft.days },
          { label: "Hours", value: timeLeft.hours },
          { label: "Minutes", value: timeLeft.minutes },
          { label: "Seconds", value: timeLeft.seconds },
        ].map((item) => (
          <div key={item.label} className="flex flex-col">
            <motion.div
              className="rounded-md bg-primary/5 py-2 text-xl font-bold"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 0.5, repeat: item.value === 0 ? 0 : Number.POSITIVE_INFINITY, repeatDelay: 59 }}
            >
              {item.value.toString().padStart(2, "0")}
            </motion.div>
            <span className="mt-1 text-xs text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        Early access pricing ends soon. Lock in your discount today!
      </p>
    </motion.div>
  )
}
