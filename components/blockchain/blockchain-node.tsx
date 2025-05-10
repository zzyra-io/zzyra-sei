"use client";

import { useState, useEffect } from "react";
import { Handle, Position } from "@xyflow/react";
import { motion } from "framer-motion";
import { 
  Wallet, 
  ArrowRight, 
  Shield, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Activity,
  RefreshCw,
  Database,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BlockchainNodeType, getBlockchainNodeMetadata } from "@/lib/web3/blockchain-nodes";
import { NodeCategory } from "@/types/workflow";

// Enhanced color palette with gradients for blockchain nodes
const categoryColors = {
  [NodeCategory.FINANCE]: {
    light: "from-amber-500 to-yellow-600",
    border: "border-amber-400",
    text: "text-amber-700",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    handle: "#f59e0b",
    glow: "shadow-amber-500/20",
  },
};

// Map of blockchain node types to icon components
const blockchainIcons: Record<string, any> = {
  [BlockchainNodeType.TRANSACTION_MONITOR]: Activity,
  [BlockchainNodeType.TRANSACTION_VERIFY]: CheckCircle,
  [BlockchainNodeType.TRANSACTION_HISTORY]: Clock,
  [BlockchainNodeType.TOKEN_TRANSFER]: ArrowRight,
  [BlockchainNodeType.TOKEN_APPROVAL]: Shield,
  [BlockchainNodeType.TOKEN_BALANCE]: Wallet,
  [BlockchainNodeType.CONTRACT_INTERACTION]: Database,
  [BlockchainNodeType.GAS_OPTIMIZER]: Zap,
  [BlockchainNodeType.CHAIN_MONITOR]: Activity,
  [BlockchainNodeType.DEFI_SWAP]: RefreshCw,
};

// Status-based styles and animations
const statusConfig = {
  started: {
    icon: RefreshCw,
    iconClass: "text-yellow-500 animate-spin",
    ringClass: "ring-2 ring-yellow-500",
    bgClass: "bg-yellow-50/80",
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
  },
  success: {
    icon: CheckCircle,
    iconClass: "text-green-500",
    ringClass: "ring-2 ring-green-500",
    bgClass: "bg-green-50/80",
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
  },
  error: {
    icon: AlertCircle,
    iconClass: "text-red-500",
    ringClass: "ring-2 ring-red-500",
    bgClass: "bg-red-50/80",
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
  },
  idle: {
    icon: null,
    iconClass: "",
    ringClass: "",
    bgClass: "",
    badge: null,
    animation: {},
  },
};

// Alias to avoid JSX member expression parsing issues
const MotionDiv = motion.div;

interface BlockchainNodeProps {
  data: any;
  isConnectable: boolean;
  selected: boolean;
  id: string;
}

export const BlockchainNode = ({ data, isConnectable, selected, id }: BlockchainNodeProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const [previousStatus, setPreviousStatus] = useState<string>("idle");

  // Get blockchain node type
  const nodeType = data.blockchainNodeType || BlockchainNodeType.TRANSACTION_MONITOR;
  const metadata = getBlockchainNodeMetadata(nodeType);
  
  // Handle counts
  const inputCount = data.inputCount || 1;
  const outputCount = data.outputCount || 1;
  const hasInputs = data.inputs !== false;
  const hasOutputs = data.outputs !== false;

  // Current status configuration
  let status = "idle";
  if (data.nodeStatus) {
    status = data.nodeStatus;
  } else if (data.status) {
    status = data.status;
  }

  const currentStatusConfig = statusConfig[status as keyof typeof statusConfig] || statusConfig.idle;
  const StatusIcon = currentStatusConfig.icon;

  // Animation effect when status changes
  useEffect(() => {
    if (status !== previousStatus) {
      setAnimationKey((prev) => prev + 1);
      setPreviousStatus(status);
    }
  }, [status, previousStatus]);

  // Get color scheme based on category
  const colors = categoryColors[NodeCategory.FINANCE];

  // Function to render node configuration summary
  const renderConfigSummary = () => {
    if (!data.config) return null;

    // Extract key configuration details based on node type
    switch (nodeType) {
      case BlockchainNodeType.TRANSACTION_MONITOR:
        return (
          <div className="text-xs text-gray-600 mt-1">
            <div>Address: {truncateAddress(data.config.address)}</div>
            <div>Chain: {getChainName(data.config.chainId)}</div>
            <div>Interval: {data.config.interval}s</div>
          </div>
        );
      
      case BlockchainNodeType.TRANSACTION_VERIFY:
        return (
          <div className="text-xs text-gray-600 mt-1">
            <div>Tx: {truncateAddress(data.config.txHash)}</div>
            <div>Chain: {getChainName(data.config.chainId)}</div>
            <div>Confirmations: {data.config.confirmations}</div>
          </div>
        );
      
      case BlockchainNodeType.TOKEN_TRANSFER:
        return (
          <div className="text-xs text-gray-600 mt-1">
            <div>Token: {data.config.tokenAddress ? truncateAddress(data.config.tokenAddress) : "ETH"}</div>
            <div>To: {truncateAddress(data.config.recipient)}</div>
            <div>Amount: {data.config.amount}</div>
          </div>
        );
      
      case BlockchainNodeType.TOKEN_BALANCE:
        return (
          <div className="text-xs text-gray-600 mt-1">
            <div>Token: {data.config.tokenAddress ? truncateAddress(data.config.tokenAddress) : "ETH"}</div>
            <div>Address: {truncateAddress(data.config.address)}</div>
            <div>Chain: {getChainName(data.config.chainId)}</div>
          </div>
        );
      
      case BlockchainNodeType.GAS_OPTIMIZER:
        return (
          <div className="text-xs text-gray-600 mt-1">
            <div>Strategy: {data.config.strategy}</div>
            <div>Max Gas: {data.config.maxGasPrice} gwei</div>
            <div>Chain: {getChainName(data.config.chainId)}</div>
          </div>
        );
      
      case BlockchainNodeType.DEFI_SWAP:
        return (
          <div className="text-xs text-gray-600 mt-1">
            <div>From: {data.config.fromToken}</div>
            <div>To: {data.config.toToken}</div>
            <div>Amount: {data.config.amount}</div>
            <div>Slippage: {data.config.slippage}%</div>
          </div>
        );
      
      default:
        return (
          <div className="text-xs text-gray-600 mt-1">
            <div>Chain: {getChainName(data.config.chainId || 1)}</div>
            {data.config.address && <div>Address: {truncateAddress(data.config.address)}</div>}
          </div>
        );
    }
  };

  // Helper function to truncate addresses
  const truncateAddress = (address?: string) => {
    if (!address) return "Not set";
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Helper function to get chain name
  const getChainName = (chainId: number) => {
    const chainNames: Record<number, string> = {
      1: "Ethereum",
      10: "Optimism",
      56: "BSC",
      137: "Polygon",
      42161: "Arbitrum",
      8453: "Base",
    };
    return chainNames[chainId] || `Chain ${chainId}`;
  };

  // Get the appropriate icon
  const IconComponent = blockchainIcons[nodeType] || Wallet;

  return (
    <>
      <MotionDiv
        key={`node-${id}-${animationKey}`}
        initial={{ scale: 0.8 }}
        animate={{ 
          scale: 1,
          ...currentStatusConfig.animation
        }}
        whileHover={{ scale: 1.02 }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "relative p-3 rounded-lg border shadow-sm transition-all duration-200",
          "bg-gradient-to-br from-white to-amber-50",
          colors.border,
          selected ? "shadow-md ring-2 ring-amber-300" : "shadow-sm",
          currentStatusConfig.ringClass,
          currentStatusConfig.bgClass,
          selected && "z-10"
        )}
        style={{
          minWidth: 180,
          maxWidth: 280,
        }}
      >
        {/* Node header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <div className={cn(
              "p-1.5 rounded-md mr-2 bg-gradient-to-br",
              colors.light
            )}>
              <IconComponent className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-800">{metadata.label}</h3>
              <p className="text-xs text-gray-500">{metadata.description}</p>
            </div>
          </div>
        </div>

        {/* Status indicator */}
        {status !== "idle" && StatusIcon && (
          <div className="absolute -top-2 -right-2 bg-white rounded-full p-0.5 shadow-sm">
            <StatusIcon className={cn("h-4 w-4", currentStatusConfig.iconClass)} />
          </div>
        )}

        {/* Configuration summary */}
        {renderConfigSummary()}

        {/* Status badge */}
        {currentStatusConfig.badge && (
          <div className="mt-2">
            <Badge variant="outline" className={currentStatusConfig.badge.class}>
              {currentStatusConfig.badge.text}
            </Badge>
          </div>
        )}

        {/* Handles */}
        {hasInputs && (
          <Handle
            type="target"
            position={Position.Left}
            style={{
              background: colors.handle,
              width: 8,
              height: 8,
              borderRadius: 4,
            }}
            isConnectable={isConnectable}
          />
        )}

        {hasOutputs && (
          <Handle
            type="source"
            position={Position.Right}
            style={{
              background: colors.handle,
              width: 8,
              height: 8,
              borderRadius: 4,
            }}
            isConnectable={isConnectable}
          />
        )}
      </MotionDiv>
    </>
  );
};

export default BlockchainNode;
