"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Bot, Code, Database, DollarSign, Workflow, Zap, X, Check, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Node {
  id: string
  type: string
  label: string
  x: number
  y: number
  icon: any
  color: string
}

interface Connection {
  id: string
  from: string
  to: string
  fromX: number
  fromY: number
  toX: number
  toY: number
}

export function InteractiveDemo() {
  const [step, setStep] = useState(0)
  const [nodes, setNodes] = useState<Node[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [dragging, setDragging] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showError, setShowError] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null)

  // Available node types
  const nodeTypes = [
    { id: "trigger", label: "Trigger", icon: Zap, color: "bg-blue-500" },
    { id: "data", label: "Data Source", icon: Database, color: "bg-purple-500" },
    { id: "condition", label: "Condition", icon: Code, color: "bg-emerald-500" },
    { id: "action", label: "Action", icon: DollarSign, color: "bg-orange-500" },
    { id: "notification", label: "Notification", icon: Bot, color: "bg-red-500" },
  ]

  // Initialize demo with some nodes
  useEffect(() => {
    if (step === 0 && nodes.length === 0) {
      setNodes([
        {
          id: "node-1",
          type: "trigger",
          label: "Price Trigger",
          x: 100,
          y: 100,
          icon: Zap,
          color: "bg-blue-500",
        },
      ])
    }
  }, [step, nodes.length])

  // Handle node drag
  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    const node = nodes.find((n) => n.id === id)
    if (!node) return

    const rect = (e.target as HTMLElement).getBoundingClientRect()
    const offsetX = e.clientX - rect.left
    const offsetY = e.clientY - rect.top

    setDragging({ id, offsetX, offsetY })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return

    const containerRect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = e.clientX - containerRect.left - dragging.offsetX
    const y = e.clientY - containerRect.top - dragging.offsetY

    setNodes((prev) =>
      prev.map((node) => {
        if (node.id === dragging.id) {
          return { ...node, x, y }
        }
        return node
      }),
    )

    // Update connections
    setConnections((prev) =>
      prev.map((conn) => {
        if (conn.from === dragging.id) {
          return { ...conn, fromX: x + 50, fromY: y + 25 }
        }
        if (conn.to === dragging.id) {
          return { ...conn, toX: x + 50, toY: y + 25 }
        }
        return conn
      }),
    )
  }

  const handleMouseUp = () => {
    setDragging(null)
  }

  // Add a new node
  const addNode = (type: string) => {
    const nodeType = nodeTypes.find((n) => n.id === type) || nodeTypes[0]
    const newNode = {
      id: `node-${nodes.length + 1}`,
      type: nodeType.id,
      label: nodeType.label,
      x: 250,
      y: 200,
      icon: nodeType.icon,
      color: nodeType.color,
    }

    setNodes([...nodes, newNode])

    // If there's at least one node, create a connection
    if (nodes.length > 0) {
      const lastNode = nodes[nodes.length - 1]
      const newConnection = {
        id: `conn-${connections.length + 1}`,
        from: lastNode.id,
        to: newNode.id,
        fromX: lastNode.x + 50,
        fromY: lastNode.y + 25,
        toX: newNode.x + 50,
        toY: newNode.y + 25,
      }
      setConnections([...connections, newConnection])
    }

    // Progress the tutorial
    if (step === 0) setStep(1)
    else if (step === 1) setStep(2)
    else if (step === 2) setStep(3)
  }

  // Remove a node
  const removeNode = (id: string) => {
    setNodes(nodes.filter((node) => node.id !== id))
    setConnections(connections.filter((conn) => conn.from !== id && conn.to !== id))
  }

  // Run the workflow
  const runWorkflow = () => {
    setIsRunning(true)
    setActiveNodeId(null)

    // Simulate workflow execution
    const runNodes = async () => {
      for (const node of nodes) {
        setActiveNodeId(node.id)
        await new Promise((resolve) => setTimeout(resolve, 800))
      }

      setActiveNodeId(null)
      setIsRunning(false)

      // Show success message
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    }

    runNodes()
  }

  // Tutorial steps
  const tutorialSteps = [
    "Start by adding a condition node to check token price",
    "Now add an action node to execute the purchase",
    "Finally, add a notification node to alert you when complete",
    "Great job! Now you can run your workflow",
  ]

  return (
    <div className="rounded-xl border bg-background/80 p-4 shadow-lg backdrop-blur-sm overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Workflow className="h-5 w-5 text-primary" />
          <span className="font-medium">Token Purchase Workflow</span>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={runWorkflow}
            disabled={isRunning || nodes.length < 2}
          >
            {isRunning ? "Running..." : "Run Workflow"}
          </Button>
        </div>
      </div>

      {/* Tutorial message */}
      <AnimatePresence>
        {step < tutorialSteps.length && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 rounded-lg bg-primary/10 p-3 text-sm"
          >
            <div className="flex items-start space-x-2">
              <Bot className="h-4 w-4 text-primary mt-0.5" />
              <div>
                <p>{tutorialSteps[step]}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Success message */}
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 rounded-lg bg-green-500/10 p-3 text-sm"
          >
            <div className="flex items-start space-x-2">
              <Check className="h-4 w-4 text-green-500 mt-0.5" />
              <div>
                <p>Workflow executed successfully! Token purchase completed.</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Error message */}
        {showError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm"
          >
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
              <div>
                <p>Error executing workflow. Please check your configuration.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Workflow canvas */}
      <div
        className="relative h-[300px] border rounded-lg bg-muted/30 mb-4 overflow-hidden"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Connection lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {connections.map((conn) => (
            <g key={conn.id}>
              <path
                d={`M${conn.fromX},${conn.fromY} C${conn.fromX + 50},${conn.fromY} ${conn.toX - 50},${conn.toY} ${conn.toX},${conn.toY}`}
                fill="none"
                stroke="rgba(124, 58, 237, 0.5)"
                strokeWidth="2"
                strokeDasharray={isRunning && activeNodeId ? "4" : "0"}
                className="transition-all duration-300"
              />
              <circle cx={conn.toX} cy={conn.toY} r="3" fill="rgba(124, 58, 237, 0.8)" />
            </g>
          ))}
        </svg>

        {/* Nodes */}
        {nodes.map((node) => (
          <motion.div
            key={node.id}
            className={`absolute flex items-center rounded-lg border px-3 py-2 cursor-move ${
              activeNodeId === node.id ? node.color : "bg-background"
            } ${activeNodeId === node.id ? "text-white" : "text-foreground"} shadow-sm transition-colors duration-300`}
            style={{ left: node.x, top: node.y, width: 100, zIndex: 10 }}
            whileHover={{ scale: 1.02 }}
            onMouseDown={(e) => handleMouseDown(e, node.id)}
            animate={{
              boxShadow: activeNodeId === node.id ? "0 0 15px rgba(124, 58, 237, 0.5)" : "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <node.icon className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="text-xs truncate">{node.label}</span>
            <button className="ml-auto text-xs opacity-50 hover:opacity-100" onClick={() => removeNode(node.id)}>
              <X className="h-3 w-3" />
            </button>
          </motion.div>
        ))}
      </div>

      {/* Node palette */}
      <div className="flex flex-wrap gap-2 justify-center">
        {nodeTypes.map((type) => (
          <motion.button
            key={type.id}
            className={`flex items-center rounded-md px-3 py-1.5 text-xs ${type.color} text-white`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => addNode(type.id)}
          >
            <type.icon className="h-3 w-3 mr-1" />
            {type.label}
          </motion.button>
        ))}
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
        <div className="rounded-md border p-2">
          <div className="font-medium mb-1">Nodes</div>
          <div className="text-foreground">{nodes.length}</div>
        </div>
        <div className="rounded-md border p-2">
          <div className="font-medium mb-1">Connections</div>
          <div className="text-foreground">{connections.length}</div>
        </div>
        <div className="rounded-md border p-2">
          <div className="font-medium mb-1">Status</div>
          <div className="text-foreground">{isRunning ? "Running" : "Ready"}</div>
        </div>
      </div>
    </div>
  )
}
