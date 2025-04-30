"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { ArrowRight, Bot, Code, Cpu, Database, DollarSign, Workflow, Zap } from "lucide-react"

export function WorkflowPreview() {
  const [activeNode, setActiveNode] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Simulate workflow execution
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveNode((prev) => {
        if (prev === null || prev >= 5) return 0
        return prev + 1
      })
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  const nodes = [
    { id: 0, title: "Trigger", icon: Zap, color: "bg-blue-500" },
    { id: 1, title: "Fetch Data", icon: Database, color: "bg-purple-500" },
    { id: 2, title: "AI Analysis", icon: Bot, color: "bg-emerald-500" },
    { id: 3, title: "Smart Contract", icon: Code, color: "bg-orange-500" },
    { id: 4, title: "Execute Trade", icon: DollarSign, color: "bg-red-500" },
    { id: 5, title: "Notify", icon: Cpu, color: "bg-indigo-500" },
  ]

  return (
    <motion.div
      ref={containerRef}
      className="relative rounded-xl border bg-background/80 p-6 shadow-lg backdrop-blur-sm overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="absolute top-4 left-4 flex items-center space-x-2">
        <Workflow className="h-5 w-5 text-primary" />
        <span className="font-medium">DeFi Position Manager</span>
      </div>

      <div className="mt-12 flex flex-wrap justify-center gap-4 md:gap-6">
        {nodes.map((node, index) => (
          <div key={node.id} className="flex flex-col items-center">
            <motion.div
              className={`relative flex h-16 w-16 items-center justify-center rounded-lg ${
                activeNode === node.id ? node.color : "bg-muted"
              } transition-colors duration-300`}
              animate={{
                scale: activeNode === node.id ? 1.1 : 1,
                boxShadow: activeNode === node.id ? "0 0 15px rgba(124, 58, 237, 0.5)" : "0 0 0 rgba(0, 0, 0, 0)",
              }}
            >
              <node.icon className={`h-8 w-8 ${activeNode === node.id ? "text-white" : "text-muted-foreground"}`} />

              {/* Pulse animation when active */}
              {activeNode === node.id && (
                <motion.div
                  className="absolute inset-0 rounded-lg"
                  initial={{ opacity: 0.7, scale: 1 }}
                  animate={{ opacity: 0, scale: 1.3 }}
                  transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
                  style={{ backgroundColor: node.color }}
                />
              )}
            </motion.div>

            <span className="mt-2 text-xs font-medium">{node.title}</span>

            {/* Arrow connecting nodes */}
            {index < nodes.length - 1 && (
              <div className="flex items-center justify-center h-8 w-8 md:h-0 md:w-8">
                <ArrowRight className="h-4 w-4 text-muted-foreground hidden md:block" />
                <ArrowRight className="h-4 w-4 text-muted-foreground rotate-90 md:hidden" />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border bg-muted/50 p-4">
          <h4 className="text-sm font-medium mb-2">Workflow Details</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Status:</span>
              <span className="font-medium text-green-500">Running</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Last Run:</span>
              <span className="font-medium">2 minutes ago</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Success Rate:</span>
              <span className="font-medium">98.5%</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/50 p-4">
          <h4 className="text-sm font-medium mb-2">Performance</h4>
          <div className="h-[60px] w-full">
            {/* Simple chart visualization */}
            <div className="flex h-full items-end space-x-1">
              {[40, 65, 35, 85, 55, 70, 90, 45, 60, 75].map((height, i) => (
                <div key={i} className="flex-1 bg-primary/60 rounded-t-sm" style={{ height: `${height}%` }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
