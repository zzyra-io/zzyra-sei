"use client"

import { Button } from "@/components/ui/button"
import { RefreshCw, AlertTriangle } from "lucide-react"
import { motion } from "framer-motion"

interface FallbackFlowCanvasProps {
  onRetry: () => void
}

export function FallbackFlowCanvas({ onRetry }: FallbackFlowCanvasProps) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-muted/30">
      <motion.div
        className="text-center max-w-md p-6 bg-background rounded-lg shadow-lg"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          className="flex justify-center mb-4 text-amber-500"
          initial={{ rotate: 0 }}
          animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
          transition={{ duration: 1, delay: 0.5 }}
        >
          <AlertTriangle size={48} />
        </motion.div>
        <h2 className="text-xl font-semibold mb-2">Canvas Loading Error</h2>
        <p className="text-muted-foreground mb-4">
          We encountered an issue while loading the workflow canvas. This might be due to a network issue or browser
          compatibility problem.
        </p>
        <div className="flex flex-col gap-4">
          <Button onClick={onRetry} className="w-full">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry Loading Canvas
          </Button>
          <div className="text-xs text-muted-foreground">
            If the problem persists, try refreshing the page or using a different browser.
          </div>
        </div>
      </motion.div>
    </div>
  )
}
