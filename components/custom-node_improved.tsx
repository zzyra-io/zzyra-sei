"use client";

import { memo, useState, useEffect } from "react";
import { Position, type NodeProps, NodeResizer } from "reactflow";
import { cn } from "@/lib/utils";
import {
  DollarSign,
  Clock,
  Webhook,
  Mail,
  Bell,
  Database,
  Wallet,
  ArrowRight,
  GitBranch,
  Clock3,
  Zap,
  Coins,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  BlockType,
  NodeCategory,
  getBlockType,
  getBlockMetadata,
} from "@/types/workflow";
import { HandleHelper } from "@/components/handle-helper";

// alias to avoid JSX member expression parsing issues
const MotionDiv = motion.div;

// Enhanced color palette with gradients
const categoryColors = {
  [NodeCategory.TRIGGER]: {
    light: "from-blue-500 to-indigo-600",
    border: "border-blue-400",
    text: "text-blue-700",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    handle: "#3b82f6",
    glow: "shadow-blue-500/20",
  },
  [NodeCategory.ACTION]: {
    light: "from-emerald-500 to-green-600",
    border: "border-emerald-400",
    text: "text-emerald-700",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    handle: "#10b981",
    glow: "shadow-emerald-500/20",
  },
  [NodeCategory.LOGIC]: {
    light: "from-violet-500 to-purple-600",
    border: "border-violet-400",
    text: "text-violet-700",
    badge: "bg-violet-50 text-violet-700 border-violet-200",
    handle: "#8b5cf6",
    glow: "shadow-violet-500/20",
  },
  [NodeCategory.FINANCE]: {
    light: "from-amber-500 to-yellow-600",
    border: "border-amber-400",
    text: "text-amber-700",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    handle: "#f59e0b",
    glow: "shadow-amber-500/20",
  },
};

// Map of block types to icon components
const blockIcons = {
  [BlockType.PRICE_MONITOR]: DollarSign,
  [BlockType.SCHEDULE]: Clock,
  [BlockType.WEBHOOK]: Webhook,
  [BlockType.EMAIL]: Mail,
  [BlockType.NOTIFICATION]: Bell,
  [BlockType.DATABASE]: Database,
  [BlockType.WALLET]: Wallet,
  [BlockType.TRANSACTION]: ArrowRight,
  [BlockType.CONDITION]: GitBranch,
  [BlockType.DELAY]: Clock3,
  [BlockType.TRANSFORM]: Zap,
  [BlockType.GOAT_FINANCE]: Coins,
  [BlockType.UNKNOWN]: MoreHorizontal,
};

export const ImprovedCustomNode = memo(
  ({ data, isConnectable, selected, id }: NodeProps) => {
    // Get the block type using our helper function
    const blockType = getBlockType(data);
    const blockMetadata = getBlockMetadata(blockType);
    const [isHovered, setIsHovered] = useState(false);
    const [isActive, setIsActive] = useState(false);

    // Simulate activity for demo purposes
    useEffect(() => {
      if (data.isActive) {
        const interval = setInterval(() => {
          setIsActive((prev) => !prev);
        }, 3000);
        return () => clearInterval(interval);
      }
    }, [data.isActive]);

    // Get the icon component
    const IconComponent =
      blockIcons[blockType] || blockIcons[BlockType.UNKNOWN];

    // Determine node category and get appropriate colors
    const nodeCategory = data.nodeType || NodeCategory.ACTION;
    const categoryColor =
      categoryColors[nodeCategory] || categoryColors[NodeCategory.ACTION];

    // Determine if the node is enabled
    const isEnabled = data.isEnabled !== false;

    // Get the number of input and output handles
    const inputCount = data.inputCount || 1;
    const outputCount = data.outputCount || 1;

    // Determine if the node has inputs and outputs
    const hasInputs = data.inputs !== false;
    const hasOutputs = data.outputs !== false;

    // Generate input handles
    const inputHandles = [];
    if (hasInputs) {
      const inputStep = 1 / (inputCount + 1);
      for (let i = 1; i <= inputCount; i++) {
        const inputPosition = inputStep * i;
        inputHandles.push(
          <HandleHelper
            key={`input-${i}`}
            type='target'
            position={Position.Left}
            id={`input-${i}`}
            isConnectable={isConnectable && isEnabled}
            handleColor={categoryColor.handle}
            label={`Input ${i}`}
            isEnabled={isEnabled}
            isSelected={selected}
          />
        );
      }
    }

    // Generate output handles
    const outputHandles = [];
    if (hasOutputs) {
      const outputStep = 1 / (outputCount + 1);
      for (let i = 1; i <= outputCount; i++) {
        const outputPosition = outputStep * i;
        outputHandles.push(
          <HandleHelper
            key={`output-${i}`}
            type='source'
            position={Position.Right}
            id={`output-${i}`}
            isConnectable={isConnectable && isEnabled}
            handleColor={categoryColor.handle}
            label={`Output ${i}`}
            isEnabled={isEnabled}
            isSelected={selected}
          />
        );
      }
    }

    // Function to render node configuration summary
    const renderConfigSummary = () => {
      if (!data.config) return null;

      const config = data.config;

      switch (blockType) {
        case BlockType.PRICE_MONITOR:
          return (
            <div className='text-xs text-muted-foreground mt-1'>
              {config.asset || "ETH"} {config.condition || "above"} $
              {config.targetPrice || "0"}
            </div>
          );
        case BlockType.EMAIL:
          return (
            <div className='text-xs text-muted-foreground mt-1'>
              To: {config.to || "Not set"}
            </div>
          );
        case BlockType.NOTIFICATION:
          return (
            <div className='text-xs text-muted-foreground mt-1'>
              {config.title || "No title"}
            </div>
          );
        case BlockType.DATABASE:
          return (
            <div className='text-xs text-muted-foreground mt-1'>
              Table: {config.table || "Not set"}
            </div>
          );
        case BlockType.CONDITION:
          return (
            <div className='text-xs text-muted-foreground mt-1'>
              {config.condition || "No condition"}
            </div>
          );
        case BlockType.DELAY:
          return (
            <div className='text-xs text-muted-foreground mt-1'>
              {config.duration || "5"} {config.unit || "minutes"}
            </div>
          );
        case BlockType.SCHEDULE:
          return (
            <div className='text-xs text-muted-foreground mt-1'>
              {config.interval || "hourly"}{" "}
              {config.time ? `at ${config.time}` : ""}
            </div>
          );
        case BlockType.WEBHOOK:
          return (
            <div className='text-xs text-muted-foreground mt-1'>
              {config.method || "POST"}{" "}
              {config.url ? config.url.substring(0, 20) + "..." : "No URL"}
            </div>
          );
        case BlockType.TRANSFORM:
          return (
            <div className='text-xs text-muted-foreground mt-1'>
              Type: {config.transformType || "javascript"}
            </div>
          );
        case BlockType.WALLET:
          return (
            <div className='text-xs text-muted-foreground mt-1'>
              {config.operation || "connect"} on{" "}
              {config.blockchain || "ethereum"}
            </div>
          );
        case BlockType.TRANSACTION:
          return (
            <div className='text-xs text-muted-foreground mt-1'>
              {config.type || "transfer"} on {config.blockchain || "ethereum"}
            </div>
          );
        case BlockType.GOAT_FINANCE:
          return (
            <div className='text-xs text-muted-foreground mt-1'>
              {config.operation || "balance"} on{" "}
              {config.blockchain || "ethereum"}
            </div>
          );
        default:
          return null;
      }
    };

    return (
      <MotionDiv
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{
          scale: 1,
          opacity: isEnabled ? 1 : 0.6,
          y: [0, isActive ? -3 : 0, 0],
        }}
        transition={{
          type: "spring",
          damping: 15,
          stiffness: 300,
          y: {
            duration: 1.5,
            repeat: isActive ? Number.POSITIVE_INFINITY : 0,
            repeatType: "loop",
          },
        }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        className={cn(
          "rounded-lg border transition-all duration-300",
          "backdrop-blur-sm bg-white/90 dark:bg-slate-900/90",
          categoryColor.border,
          selected || isHovered
            ? `shadow-lg ${categoryColor.glow}`
            : "shadow-md",
          !isEnabled && "opacity-60 grayscale"
        )}
        style={{
          width: data.style?.width || 220,
          height: data.height,
        }}>
        <NodeResizer
          minWidth={180}
          minHeight={100}
          isVisible={selected}
          lineClassName={cn(
            "border-2",
            categoryColor.border.replace("border-", "border-")
          )}
          handleClassName={cn(
            "h-3 w-3 bg-white dark:bg-slate-800 border-2",
            categoryColor.border
          )}
        />

        {/* Node header with gradient */}
        <div
          className={cn(
            "flex items-center gap-2 p-3 border-b rounded-t-lg",
            "bg-gradient-to-r",
            categoryColor.light,
            categoryColor.border,
            "transition-all duration-300"
          )}>
          <motion.div
            whileHover={{ rotate: 15 }}
            className={cn(
              "flex items-center justify-center rounded-md p-1.5",
              "bg-white/20 backdrop-blur-sm",
              "text-white"
            )}>
            <IconComponent className='h-4 w-4' />
          </motion.div>
          <div className='flex-1 min-w-0'>
            <div className='font-medium truncate text-white'>
              {data.label || blockMetadata.label}
            </div>
            {data.nodeType && (
              <Badge
                className={cn(
                  "text-[10px] px-1 py-0 h-4 font-medium",
                  "bg-white/20 text-white border-white/20"
                )}>
                {data.nodeType}
              </Badge>
            )}
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.button
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  className='text-white/80 hover:text-white'>
                  <MoreHorizontal className='h-4 w-4' />
                </motion.button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Click to configure</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Node content */}
        <div className='p-3'>
          {data.description && (
            <div className='text-xs text-muted-foreground mb-2'>
              {data.description}
            </div>
          )}

          {renderConfigSummary()}

          {/* Status indicators */}
          <div className='mt-2 flex items-center gap-2'>
            {!isEnabled && (
              <Badge
                variant='outline'
                className='bg-yellow-50 text-yellow-700 border-yellow-200'>
                <XCircle className='h-3 w-3 mr-1' />
                Disabled
              </Badge>
            )}

            {data.isActive && (
              <Badge
                variant='outline'
                className='bg-green-50 text-green-700 border-green-200'>
                <motion.div
                  animate={{ opacity: isActive ? 1 : 0.5 }}
                  transition={{
                    duration: 1,
                    repeat: Number.POSITIVE_INFINITY,
                    repeatType: "reverse",
                  }}
                  className='flex items-center'>
                  <CheckCircle2 className='h-3 w-3 mr-1' />
                  Active
                </motion.div>
              </Badge>
            )}
          </div>
        </div>

        {/* Activity indicator */}
        <AnimatePresence>
          {isActive && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              className='absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-500'>
              <motion.div
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                className='absolute inset-0 rounded-full bg-green-500 opacity-60'
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Position the handles along the sides of the node */}
        <div className='absolute inset-0'>
          {/* Input handles on the left side */}
          {inputHandles.map((handle, index) => {
            const inputStep = 1 / (inputCount + 1);
            const inputPosition = inputStep * (index + 1);
            return (
              <div
                key={`input-position-${index}`}
                className='absolute'
                style={{
                  left: 0,
                  top: `${inputPosition * 100}%`,
                  transform: "translate(-50%, -50%)",
                }}>
                {handle}
              </div>
            );
          })}

          {/* Output handles on the right side */}
          {outputHandles.map((handle, index) => {
            const outputStep = 1 / (outputCount + 1);
            const outputPosition = outputStep * (index + 1);
            return (
              <div
                key={`output-position-${index}`}
                className='absolute'
                style={{
                  right: 0,
                  top: `${outputPosition * 100}%`,
                  transform: "translate(50%, -50%)",
                }}>
                {handle}
              </div>
            );
          })}
        </div>
      </MotionDiv>
    );
  }
);

ImprovedCustomNode.displayName = "ImprovedCustomNode";
