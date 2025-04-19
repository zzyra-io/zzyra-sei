"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { motion } from "framer-motion"
import dynamic from "next/dynamic"

// Create a loading component with animation
const LoadingCanvas = () => (
  <div className="flex h-full w-full items-center justify-center bg-muted/30">
    <motion.div
      className="text-center"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="mb-4 flex flex-col items-center">
        <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
        <motion.div
          className="text-2xl font-semibold"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Loading Flow Canvas...
        </motion.div>
      </div>
      <motion.div
        className="text-sm text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        Please wait while we initialize the canvas
      </motion.div>
    </motion.div>
  </div>
)

// Import ReactFlow types directly to avoid SSR issues
export interface Node {
  id: string
  type?: string
  position: {
    x: number
    y: number
  }
  data: any
  selected?: boolean
}

export interface Edge {
  id: string
  source: string
  target: string
  type?: string
  animated?: boolean
  label?: string
  style?: any
}

// Dynamically import ReactFlow components with no SSR
const ReactFlowWrapper = dynamic(() => import("./react-flow-wrapper"), {
  ssr: false,
  loading: () => <LoadingCanvas />,
})

interface FlowCanvasProps {
  nodes: Node[]
  edges: Edge[]
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>
  onNodeSelect?: (node: Node | null) => void
  readOnly?: boolean
}

export function FlowCanvas(props: FlowCanvasProps) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return <LoadingCanvas />
  }

  return <ReactFlowWrapper {...props} />
}
