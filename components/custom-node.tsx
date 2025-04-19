"use client"

import { useState, useEffect, useRef, memo } from "react"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Handle, Position, useUpdateNodeInternals } from "reactflow"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import {
  Database,
  Wallet,
  Webhook,
  Code,
  Mail,
  MessageSquare,
  BellRing,
  Clock,
  Zap,
  FileText,
  BarChart,
  Coins,
  Repeat,
  Sparkles,
  Cpu,
  Bot,
  Braces,
  Layers,
  Workflow,
  Blocks,
  Puzzle,
  Cog,
  Wand2,
  Rocket,
  Landmark,
  Banknote,
  Gem,
  Wallet2,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Copy,
  Trash2,
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface CustomNodeProps {
  id: string
  data: any
  selected?: boolean
  isConnectable?: boolean
  dragging?: boolean
}

const CustomNode = memo(({ id, data, selected, isConnectable = true, dragging }: CustomNodeProps) => {
  const [isEnabled, setIsEnabled] = useState(data.isEnabled !== false)
  const [isMounted, setIsMounted] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [showHandles, setShowHandles] = useState(false)
  const nodeRef = useRef<HTMLDivElement>(null)
  const updateNodeInternals = useUpdateNodeInternals()
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  const isResizingRef = useRef(false)
  const debouncedUpdateRef = useRef<NodeJS.Timeout | null>(null)

  // Get node style from data or use defaults
  const nodeStyle = data.style || {
    backgroundColor: data.backgroundColor || "bg-card",
    borderColor: data.borderColor || "border-border",
    textColor: data.textColor || "text-foreground",
    accentColor: "primary",
    width: data.width || 220,
  }

  useEffect(() => {
    setIsMounted(true)

    // Update node internals when mounted to ensure handles are positioned correctly
    updateNodeInternals(id)

    // Show handles briefly on mount for better discoverability
    setShowHandles(true)
    const timer = setTimeout(() => {
      setShowHandles(false)
    }, 1500)

    return () => clearTimeout(timer)
  }, [id, updateNodeInternals])

  useEffect(() => {
    // Update node internals when expanded state changes to reposition handles
    updateNodeInternals(id)
  }, [isExpanded, id, updateNodeInternals])

  // Fix for ResizeObserver loop error
  useEffect(() => {
    if (!nodeRef.current) return

    // Clean up previous observer
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect()
    }

    try {
      // Create new observer with improved error handling
      resizeObserverRef.current = new ResizeObserver(() => {
        // Skip if already processing a resize
        if (isResizingRef.current) return

        // Set flag to prevent loops
        isResizingRef.current = true

        // Clear any existing timeout
        if (debouncedUpdateRef.current) {
          clearTimeout(debouncedUpdateRef.current)
        }

        // Use a longer debounce to prevent rapid updates
        debouncedUpdateRef.current = setTimeout(() => {
          try {
            updateNodeInternals(id)
          } catch (error) {
            console.error("Error updating node internals:", error)
          } finally {
            // Reset the flag after a delay
            setTimeout(() => {
              isResizingRef.current = false
            }, 100)
          }
        }, 300)
      })

      // Start observing with error handling
      try {
        resizeObserverRef.current.observe(nodeRef.current)
      } catch (error) {
        console.error("Error observing node:", error)
      }
    } catch (error) {
      console.error("Error creating ResizeObserver:", error)
    }

    // Cleanup function
    return () => {
      if (resizeObserverRef.current) {
        try {
          resizeObserverRef.current.disconnect()
        } catch (error) {
          console.error("Error disconnecting ResizeObserver:", error)
        }
      }

      if (debouncedUpdateRef.current) {
        clearTimeout(debouncedUpdateRef.current)
      }
    }
  }, [id, updateNodeInternals])

  const handleToggle = (checked: boolean) => {
    setIsEnabled(checked)
    if (data.onToggle) {
      data.onToggle(checked)
    }
  }

  const getIcon = (type: string) => {
    const iconProps = { size: 16 }

    switch (type) {
      case "database":
        return <Database {...iconProps} />
      case "wallet":
        return <Wallet {...iconProps} />
      case "webhook":
        return <Webhook {...iconProps} />
      case "code":
        return <Code {...iconProps} />
      case "email":
        return <Mail {...iconProps} />
      case "chat":
        return <MessageSquare {...iconProps} />
      case "notification":
        return <BellRing {...iconProps} />
      case "schedule":
        return <Clock {...iconProps} />
      case "trigger":
        return <Zap {...iconProps} />
      case "document":
        return <FileText {...iconProps} />
      case "analytics":
        return <BarChart {...iconProps} />
      case "crypto":
        return <Coins {...iconProps} />
      case "swap":
        return <Repeat {...iconProps} />
      case "ai":
        return <Sparkles {...iconProps} />
      case "compute":
        return <Cpu {...iconProps} />
      case "bot":
        return <Bot {...iconProps} />
      case "api":
        return <Braces {...iconProps} />
      case "integration":
        return <Layers {...iconProps} />
      case "workflow":
        return <Workflow {...iconProps} />
      case "block":
        return <Blocks {...iconProps} />
      case "module":
        return <Puzzle {...iconProps} />
      case "settings":
        return <Cog {...iconProps} />
      case "magic":
        return <Wand2 {...iconProps} />
      case "deploy":
        return <Rocket {...iconProps} />
      case "defi":
        return <Landmark {...iconProps} />
      case "payment":
        return <Banknote {...iconProps} />
      case "nft":
        return <Gem {...iconProps} />
      case "finance":
        return <Wallet2 {...iconProps} />
      default:
        return <Blocks {...iconProps} />
    }
  }

  if (!isMounted) {
    return null
  }

  // Determine if node has inputs and outputs
  const hasInputs = data.inputs !== false
  const hasOutputs = data.outputs !== false
  const inputCount = data.inputCount || 1
  const outputCount = data.outputCount || 1

  // Generate multiple input/output handles if specified
  const renderInputHandles = () => {
    if (!hasInputs) return null

    const handles = []
    for (let i = 0; i < inputCount; i++) {
      const position = inputCount > 1 ? (1 / (inputCount + 1)) * (i + 1) : 0.5

      handles.push(
        <Handle
          key={`input-${i}`}
          type="target"
          position={Position.Left}
          id={`input-${i}`}
          style={{
            top: `${position * 100}%`,
            opacity: showHandles || isHovered || selected ? 1 : 0.3,
            transition: "opacity 0.2s, background-color 0.2s",
            backgroundColor: selected ? "#5E5BFF" : "#888",
            width: 8,
            height: 8,
          }}
          className={cn("border-2 border-background", isConnectable ? "cursor-crosshair" : "cursor-not-allowed")}
          isConnectable={isConnectable}
        />,
      )
    }
    return handles
  }

  const renderOutputHandles = () => {
    if (!hasOutputs) return null

    const handles = []
    for (let i = 0; i < outputCount; i++) {
      const position = outputCount > 1 ? (1 / (outputCount + 1)) * (i + 1) : 0.5

      handles.push(
        <Handle
          key={`output-${i}`}
          type="source"
          position={Position.Right}
          id={`output-${i}`}
          style={{
            top: `${position * 100}%`,
            opacity: showHandles || isHovered || selected ? 1 : 0.3,
            transition: "opacity 0.2s, background-color 0.2s",
            backgroundColor: selected ? "#5E5BFF" : "#888",
            width: 8,
            height: 8,
          }}
          className={cn("border-2 border-background", isConnectable ? "cursor-crosshair" : "cursor-not-allowed")}
          isConnectable={isConnectable}
        />,
      )
    }
    return handles
  }

  return (
    <>
      {renderInputHandles()}

      <motion.div
        ref={nodeRef}
        className={cn(
          "p-4 rounded-lg border shadow-sm transition-all",
          nodeStyle.backgroundColor,
          nodeStyle.borderColor,
          selected && "ring-2 ring-primary border-primary",
          !isEnabled && "opacity-60",
          dragging && "opacity-80 shadow-md cursor-grabbing",
        )}
        style={{
          width: nodeStyle.width,
          zIndex: selected ? 10 : 0,
        }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{
          opacity: 1,
          scale: 1,
          boxShadow: selected
            ? "0 0 0 2px rgba(94, 91, 255, 0.5), 0 4px 10px rgba(0, 0, 0, 0.1)"
            : isHovered
              ? "0 4px 12px rgba(0, 0, 0, 0.08)"
              : "0 1px 3px rgba(0, 0, 0, 0.05)",
        }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 30,
        }}
        whileHover={{
          y: -2,
          boxShadow: "0 6px 20px rgba(0, 0, 0, 0.1)",
        }}
        onHoverStart={() => {
          setIsHovered(true)
          setShowHandles(true)
        }}
        onHoverEnd={() => {
          setIsHovered(false)
          setShowHandles(false)
        }}
        drag={false}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <motion.div
              className={cn(
                "flex items-center justify-center w-8 h-8 rounded-md mr-2",
                `bg-${nodeStyle.accentColor}/10`,
              )}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              {getIcon(data.icon)}
            </motion.div>
            <div className={cn("font-medium truncate", nodeStyle.textColor)}>{data.label}</div>
          </div>

          <div className="flex items-center gap-1">
            <Switch
              checked={isEnabled}
              onCheckedChange={handleToggle}
              size="sm"
              aria-label="Toggle node"
              onClick={(e) => e.stopPropagation()}
            />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.button
                  className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-muted"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </motion.button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem className="cursor-pointer">
                  <Cog className="mr-2 h-4 w-4" />
                  Edit Configuration
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate Node
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Node
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <AnimatePresence>
          {(isExpanded || selected || isHovered) && data.description && (
            <motion.div
              className={cn("text-xs mb-2 line-clamp-2", nodeStyle.textColor, "opacity-70")}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              {data.description}
            </motion.div>
          )}
        </AnimatePresence>

        {data.tags && data.tags.length > 0 && (
          <motion.div
            className="flex flex-wrap gap-1 mt-2"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {data.tags.map((tag: string, index: number) => (
              <Badge key={index} variant="outline" className="text-xs px-1 py-0">
                {tag}
              </Badge>
            ))}
          </motion.div>
        )}

        <motion.div
          className={cn(
            "flex items-center justify-between mt-2 pt-2 border-t text-xs",
            nodeStyle.textColor,
            "opacity-70",
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div>{data.status || (isEnabled ? "Active" : "Disabled")}</div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.button
                  className="h-5 w-5 rounded-full flex items-center justify-center hover:bg-muted"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsExpanded(!isExpanded)
                    // Update node internals to reposition handles
                    setTimeout(() => updateNodeInternals(id), 50)
                  }}
                >
                  {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </motion.button>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="end">
                {isExpanded ? "Collapse" : "Expand"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </motion.div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              className="mt-2 pt-2 border-t text-xs"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              {data.config && Object.keys(data.config).length > 0 ? (
                <div className="space-y-1">
                  {Object.entries(data.config).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="font-medium">{key}:</span>
                      <span className="truncate max-w-[120px]">{String(value)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-1">No configuration</div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {renderOutputHandles()}
    </>
  )
})

CustomNode.displayName = "CustomNode"

export default CustomNode
