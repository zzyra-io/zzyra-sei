"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
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
} from "lucide-react"

interface CustomNodeProps {
  data: any
  selected?: boolean
}

export default function CustomNode({ data, selected }: CustomNodeProps) {
  const [isEnabled, setIsEnabled] = useState(data.isEnabled !== false)
  const [isMounted, setIsMounted] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return null
  }

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

  return (
    <motion.div
      className={cn(
        "p-4 rounded-lg border bg-card shadow-sm w-[220px] transition-all",
        selected && "ring-2 ring-primary border-primary",
        !isEnabled && "opacity-60",
      )}
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
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      drag={false}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <motion.div
            className="flex items-center justify-center w-8 h-8 rounded-md bg-muted mr-2"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            {getIcon(data.icon)}
          </motion.div>
          <div className="font-medium truncate">{data.label}</div>
        </div>
        <Switch
          checked={isEnabled}
          onCheckedChange={handleToggle}
          size="sm"
          aria-label="Toggle node"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {data.description && (
        <motion.div
          className="text-xs text-muted-foreground mb-2 line-clamp-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {data.description}
        </motion.div>
      )}

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
        className="flex items-center justify-between mt-2 pt-2 border-t text-xs text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div>{data.status || (isEnabled ? "Active" : "Disabled")}</div>
      </motion.div>
    </motion.div>
  )
}
