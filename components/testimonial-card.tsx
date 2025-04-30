"use client"

import { motion } from "framer-motion"
import { Quote } from "lucide-react"

interface TestimonialCardProps {
  name: string
  role: string
  content: string
  avatar: string
}

export function TestimonialCard({ name, role, content, avatar }: TestimonialCardProps) {
  return (
    <motion.div
      className="group relative rounded-xl border bg-background p-6 shadow-sm transition-all hover:shadow-md"
      whileHover={{ y: -5 }}
      transition={{ type: "spring", stiffness: 400, damping: 10 }}
    >
      <div className="absolute -top-3 -left-3">
        <Quote className="h-6 w-6 text-primary/40" />
      </div>

      <div className="mb-4 mt-2">
        <p className="text-sm text-muted-foreground">{content}</p>
      </div>

      <div className="flex items-center space-x-3">
        <motion.div
          className="relative h-10 w-10 overflow-hidden rounded-full"
          whileHover={{ scale: 1.1 }}
          transition={{ duration: 0.2 }}
        >
          <img src={avatar || "/placeholder.svg"} alt={name} className="h-full w-full object-cover" />
        </motion.div>

        <div>
          <h4 className="text-sm font-medium">{name}</h4>
          <p className="text-xs text-muted-foreground">{role}</p>
        </div>
      </div>

      <motion.div
        className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-br from-primary/5 to-purple-500/5 opacity-0 group-hover:opacity-100"
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      />
    </motion.div>
  )
}
