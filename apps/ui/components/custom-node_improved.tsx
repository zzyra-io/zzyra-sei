"use client";

import { memo, useState, useEffect } from "react";
import { Position, type NodeProps, NodeResizer } from "@xyflow/react";
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
  Loader2,
  AlertCircle,
  Sparkles,
  Code,
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
  NodeCategory,
  getBlockType,
  getBlockMetadata,
  BlockType,
} from "@zyra/types";
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

// Status-based styles and animations
const statusConfig = {
  started: {
    icon: Loader2,
    iconClass: "text-yellow-500 animate-spin",
    ringClass: "ring-2 ring-yellow-500",
    bgClass: "bg-yellow-50/80",
    pulseEffect: true,
    badge: {
      text: "Processing",
      class: "bg-yellow-100 text-yellow-800 border-yellow-200",
    },
    animation: {
      y: [0, -3, 0],
      transition: {
        duration: 1.5,
        repeat: Number.POSITIVE_INFINITY,
        repeatType: "loop",
      },
    },
    handleEffect: {
      pulse: true,
      color: "yellow",
    },
  },
  success: {
    icon: CheckCircle2,
    iconClass: "text-green-500",
    ringClass: "ring-2 ring-green-500",
    bgClass: "bg-green-50/80",
    pulseEffect: false,
    badge: {
      text: "Success",
      class: "bg-green-100 text-green-800 border-green-200",
    },
    animation: {
      scale: [1, 1.03, 1],
      transition: {
        duration: 0.5,
      },
    },
    handleEffect: {
      pulse: false,
      color: "green",
    },
  },
  error: {
    icon: XCircle,
    iconClass: "text-red-500",
    ringClass: "ring-2 ring-red-500",
    bgClass: "bg-red-50/80",
    pulseEffect: false,
    badge: {
      text: "Failed",
      class: "bg-red-100 text-red-800 border-red-200",
    },
    animation: {
      rotate: [-1, 1, -1, 0],
      transition: {
        duration: 0.4,
      },
    },
    handleEffect: {
      pulse: false,
      color: "red",
    },
  },
  warning: {
    icon: AlertCircle,
    iconClass: "text-orange-500",
    ringClass: "ring-2 ring-orange-500",
    bgClass: "bg-orange-50/80",
    pulseEffect: false,
    badge: {
      text: "Warning",
      class: "bg-orange-100 text-orange-800 border-orange-200",
    },
    animation: {
      scale: [1, 1.02, 1],
      transition: {
        duration: 0.5,
        repeat: 3,
      },
    },
    handleEffect: {
      pulse: false,
      color: "orange",
    },
  },
  idle: {
    icon: null,
    iconClass: "",
    ringClass: "",
    bgClass: "",
    pulseEffect: false,
    badge: null,
    animation: {},
    handleEffect: {
      pulse: false,
      color: null,
    },
  },
};

// Map of block types to icon components
// Using proper typing for the icon components
const blockIcons: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
  // Trigger blocks
  'price-monitor': DollarSign,
  'schedule': Clock,
  'webhook': Webhook,
  
  // Action blocks
  'email': Mail,
  'notification': Bell,
  'database': Database,
  'wallet': Wallet,
  'transaction': ArrowRight,
  
  // Logic blocks
  'condition': GitBranch,
  'delay': Clock3,
  'transform': Zap,
  
  // Finance blocks
  'defi-price-monitor': DollarSign,
  'ai-blockchain': Code,
  
  // Custom blocks
  'goat-finance': Coins,
  'custom': Sparkles,
  
  // Default/fallback
  'unknown': MoreHorizontal,
};

export const ImprovedCustomNode = memo(
  ({ data, isConnectable, selected, id }: NodeProps) => {
    // Get the block type using our helper function
    const blockType = getBlockType(data);
    const blockMetadata = getBlockMetadata(blockType);
    const [isHovered, setIsHovered] = useState(false);
    const [showSuccessEffect, setShowSuccessEffect] = useState(false);
    const [animationKey, setAnimationKey] = useState(0);
    const [previousStatus, setPreviousStatus] = useState(data.status || "idle");
    // Remove excessive logging

    // Derive isActive from status
    const isActive = data.status === "started";

    // Get the icon component using the string value of blockType
    // Safely convert blockType to string regardless of its type
    const blockTypeString = String(blockType || '').toLowerCase();
    const IconComponent = blockIcons[blockTypeString] || blockIcons['unknown'];

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

    // Current status configuration
    // Get status from execution data if available or fallback to data.status
    let status = "idle";

    // If we have nodeStatus explicitly set on data (from execution hook)
    if (data.nodeStatus) {
      status = data.nodeStatus;
    }
    // Legacy status from data.status
    else if (data.status) {
      status = data.status;
    }

    // Execution metadata from our hook
    const isCompleted = data.isCompleted === true;
    const isFailed = data.isFailed === true;
    const isExecuting = data.isExecuting === true;

    // Use execution status to override generic status
    if (isCompleted) status = "success";
    if (isFailed) status = "error";
    if (isExecuting) status = "started";

    const currentStatusConfig = statusConfig[status] || statusConfig.idle;

    // Status icon component
    const StatusIcon = currentStatusConfig.icon;

    // Effect to show success animation when status changes to success
    useEffect(() => {
      if (status !== previousStatus) {
        if (status === "success" && previousStatus !== "success") {
          setShowSuccessEffect(true);
          const timer = setTimeout(() => {
            setShowSuccessEffect(false);
          }, 2000);
          return () => clearTimeout(timer);
        }

        // Trigger animation key change to restart animations when status changes
        setAnimationKey((prev) => prev + 1);
        setPreviousStatus(status);
      }
    }, [status, previousStatus]);

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
            handleColor={
              currentStatusConfig.handleEffect?.color || categoryColor.handle
            }
            label={`Input ${i}`}
            isEnabled={isEnabled}
            isSelected={selected}
            pulse={currentStatusConfig.handleEffect?.pulse}
            status={status}
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
            handleColor={
              currentStatusConfig.handleEffect?.color || categoryColor.handle
            }
            label={`Output ${i}`}
            isEnabled={isEnabled}
            isSelected={selected}
            pulse={currentStatusConfig.handleEffect?.pulse}
            status={status}
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
        case BlockType.CUSTOM:
          // For custom blocks, show inputs and outputs
          if (data.customBlockDefinition) {
            const customBlock = data.customBlockDefinition;
            return (
              <div className='text-xs text-muted-foreground mt-1'>
                <div className='flex items-center gap-1'>
                  <Code className='h-3 w-3' />
                  <span>{customBlock.logicType || "JavaScript"}</span>
                </div>
                <div className='mt-1'>
                  {customBlock.inputs?.length || 0} inputs,{" "}
                  {customBlock.outputs?.length || 0} outputs
                </div>
              </div>
            );
          }
          return (
            <div className='text-xs text-muted-foreground mt-1'>
              Custom Block: {data.customBlockId || "Unknown"}
            </div>
          );
        default:
          return null;
      }
    };

    return (
      <>
        <MotionDiv
          key={`node-${id}-animation-${animationKey}`}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{
            scale: 1,
            opacity: isEnabled ? 1 : 0.6,
            ...currentStatusConfig.animation,
          }}
          transition={{
            type: "spring",
            damping: 15,
            stiffness: 300,
          }}
          onHoverStart={() => setIsHovered(true)}
          onHoverEnd={() => setIsHovered(false)}
          className={cn(
            "relative rounded-lg border transition-all duration-300",
            "backdrop-blur-sm bg-white/90 dark:bg-slate-900/90",
            categoryColor.border,
            selected || isHovered
              ? `shadow-lg ${categoryColor.glow}`
              : "shadow-md",
            !isEnabled && "opacity-60 grayscale",
            currentStatusConfig.ringClass,
            currentStatusConfig.bgClass,
            currentStatusConfig.pulseEffect && "animate-pulse"
          )}
          style={{
            width: data.style?.width || 220,
            height: data.height,
          }}>
          {selected && (
            <NodeResizer
              minWidth={180}
              minHeight={100}
              isVisible={true}
              lineClassName={cn(
                "border-2",
                categoryColor.border.replace("border-", "border-")
              )}
              handleClassName={cn(
                "h-3 w-3 bg-white dark:bg-slate-800 border-2",
                categoryColor.border
              )}
            />
          )}

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
              whileHover={{ rotate: 15, scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className={cn(
                "flex items-center justify-center rounded-md p-1.5",
                "bg-white/20 backdrop-blur-sm",
                "text-white"
              )}>
              <IconComponent className='h-4 w-4' />
            </motion.div>
            <div className='flex-1 min-w-0'>
              <div className='font-medium truncate text-white'>
                {blockType === BlockType.CUSTOM && data.customBlockDefinition
                  ? data.customBlockDefinition.name
                  : data.label || blockMetadata.label}
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
                    whileHover={{ scale: 1.2, rotate: 90 }}
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
                  transition={{
                    duration: 2,
                    repeat: Number.POSITIVE_INFINITY,
                  }}
                  className='absolute inset-0 rounded-full bg-green-500 opacity-60'
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Connection lines animation for active nodes */}
          <AnimatePresence>
            {isActive && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className='absolute inset-0 overflow-hidden rounded-lg pointer-events-none'>
                <motion.div
                  animate={{
                    x: ["-100%", "100%"],
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "linear",
                  }}
                  className={cn(
                    "h-[1px] w-full absolute top-1/2",
                    "bg-gradient-to-r from-transparent via-green-500 to-transparent"
                  )}
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
      </>
    );
  }
);

ImprovedCustomNode.displayName = "ImprovedCustomNode";
