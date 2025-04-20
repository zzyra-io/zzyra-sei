"use client"

import { memo } from "react"
import { Handle, Position, type NodeProps } from "reactflow"
import { cn } from "@/lib/utils"
import {
  AlertCircle,
  ArrowRight,
  Bell,
  Clock,
  Code,
  Coins,
  Database,
  DollarSign,
  Mail,
  Wallet,
  Webhook,
  Zap,
  MoreHorizontal,
} from "lucide-react"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const nodeIcons: Record<string, any> = {
  "price-monitor": DollarSign,
  email: Mail,
  notification: Bell,
  database: Database,
  condition: Code,
  delay: Clock,
  transform: Zap,
  webhook: Webhook,
  wallet: Wallet,
  transaction: ArrowRight,
  "goat-finance": Coins,
  schedule: Clock,
  default: AlertCircle,
}

export const CustomNode = memo(({ data, isConnectable, selected, id }: NodeProps) => {
  // Get the node type from either data.blockType or data.nodeType
  const nodeType = data.blockType || data.nodeType || "default"

  // Get the icon component
  const IconComponent = nodeIcons[nodeType] || nodeIcons.default

  // Get style settings from data or use defaults
  const style = data.style || {
    backgroundColor: "bg-card",
    borderColor: "border-border",
    textColor: "text-foreground",
    accentColor: "primary",
    width: 220,
  }

  // Determine if the node is enabled
  const isEnabled = data.isEnabled !== false

  // Get the number of input and output handles
  const inputCount = data.inputCount || 1
  const outputCount = data.outputCount || 1

  // Determine if the node has inputs and outputs
  const hasInputs = data.inputs !== false
  const hasOutputs = data.outputs !== false

  // Generate input handles
  const inputHandles = []
  if (hasInputs) {
    const inputStep = 1 / (inputCount + 1)
    for (let i = 1; i <= inputCount; i++) {
      const inputPosition = inputStep * i
      inputHandles.push(
        <Handle
          key={`input-${i}`}
          type="target"
          position={Position.Left}
          id={`input-${i}`}
          style={{ top: `${inputPosition * 100}%` }}
          isConnectable={isConnectable && isEnabled}
          className={cn(
            "!h-3 !w-3 !bg-background !border-2",
            isEnabled ? `!border-${style.accentColor}` : "!border-muted-foreground opacity-50",
          )}
        />,
      )
    }
  }

  // Generate output handles
  const outputHandles = []
  if (hasOutputs) {
    const outputStep = 1 / (outputCount + 1)
    for (let i = 1; i <= outputCount; i++) {
      const outputPosition = outputStep * i
      outputHandles.push(
        <Handle
          key={`output-${i}`}
          type="source"
          position={Position.Right}
          id={`output-${i}`}
          style={{ top: `${outputPosition * 100}%` }}
          isConnectable={isConnectable && isEnabled}
          className={cn(
            "!h-3 !w-3 !bg-background !border-2",
            isEnabled ? `!border-${style.accentColor}` : "!border-muted-foreground opacity-50",
          )}
        />,
      )
    }
  }

  // Function to render node configuration summary
  const renderConfigSummary = () => {
    if (!data.config) return null

    const config = data.config

    switch (nodeType) {
      case "price-monitor":
        return (
          <div className="text-xs text-muted-foreground mt-1">
            {config.asset || "ETH"} {config.condition || "above"} ${config.targetPrice || "0"}
          </div>
        )
      case "email":
        return <div className="text-xs text-muted-foreground mt-1">To: {config.to || "Not set"}</div>
      case "notification":
        return <div className="text-xs text-muted-foreground mt-1">{config.title || "No title"}</div>
      case "database":
        return <div className="text-xs text-muted-foreground mt-1">Table: {config.table || "Not set"}</div>
      case "condition":
        return <div className="text-xs text-muted-foreground mt-1">{config.condition || "No condition"}</div>
      case "delay":
        return (
          <div className="text-xs text-muted-foreground mt-1">
            {config.duration || "5"} {config.unit || "minutes"}
          </div>
        )
      case "schedule":
        return (
          <div className="text-xs text-muted-foreground mt-1">
            {config.interval || "hourly"} {config.time ? `at ${config.time}` : ""}
          </div>
        )
      case "webhook":
        return (
          <div className="text-xs text-muted-foreground mt-1">
            {config.method || "POST"} {config.url ? config.url.substring(0, 20) + "..." : "No URL"}
          </div>
        )
      default:
        return null
    }
  }

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", damping: 15, stiffness: 300 }}
      className={cn(
        "rounded-lg border shadow-sm transition-all duration-200",
        style.backgroundColor,
        style.borderColor,
        style.textColor,
        selected ? `ring-2 ring-${style.accentColor}` : "",
        !isEnabled && "opacity-60",
      )}
      style={{ width: style.width }}
    >
      {/* Node header */}
      <div className={cn("flex items-center gap-2 p-3 border-b", style.borderColor, `bg-${style.accentColor}/10`)}>
        <div className={cn("flex items-center justify-center rounded-md p-1", `text-${style.accentColor}`)}>
          <IconComponent className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{data.label}</div>
          {data.nodeType && (
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] px-1 py-0 h-4",
                data.nodeType === "trigger" && "bg-blue-50 text-blue-700 border-blue-200",
                data.nodeType === "action" && "bg-green-50 text-green-700 border-green-200",
                data.nodeType === "logic" && "bg-purple-50 text-purple-700 border-purple-200",
              )}
            >
              {data.nodeType}
            </Badge>
          )}
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="text-muted-foreground hover:text-foreground">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Click to configure</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Node content */}
      <div className="p-3">
        {data.description && <div className="text-xs text-muted-foreground mb-2">{data.description}</div>}

        {renderConfigSummary()}

        {!isEnabled && (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 mt-2">
            Disabled
          </Badge>
        )}
      </div>

      {/* Input and output handles */}
      {inputHandles}
      {outputHandles}
    </motion.div>
  )
})

CustomNode.displayName = "CustomNode"
