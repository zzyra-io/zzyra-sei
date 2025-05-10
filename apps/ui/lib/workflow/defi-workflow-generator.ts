import { v4 as uuidv4 } from "uuid";
import type { Node, Edge } from "@xyflow/react";
import { BlockType } from "@zyra/types";
import {
  BASE_SEPOLIA_CONFIG,
  BASE_SEPOLIA_GAS_DEFAULTS,
} from "./base-sepolia-config";

// Define the structure for the workflow generation
interface WorkflowBlock {
  id: string;
  type: BlockType;
  position: { x: number; y: number };
  data: {
    label: string;
    config: any;
  };
}

interface WorkflowConnection {
  id: string;
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
}

interface DefiWorkflow {
  blocks: WorkflowBlock[];
  connections: WorkflowConnection[];
}

// Map of keywords to relevant DeFi blocks
const KEYWORD_TO_BLOCK_MAP: Record<string, BlockType[]> = {
  price: [BlockType.DEFI_PRICE_MONITOR],
  monitor: [
    BlockType.DEFI_PRICE_MONITOR,
    BlockType.DEFI_YIELD_MONITOR,
    BlockType.DEFI_PROTOCOL,
  ],
  yield: [BlockType.DEFI_YIELD_MONITOR, BlockType.DEFI_YIELD_STRATEGY],
  portfolio: [BlockType.DEFI_PORTFOLIO],
  balance: [BlockType.DEFI_PORTFOLIO],
  rebalance: [BlockType.DEFI_REBALANCE],
  swap: [BlockType.DEFI_SWAP],
  gas: [BlockType.DEFI_GAS],
  optimize: [BlockType.DEFI_GAS, BlockType.DEFI_YIELD_STRATEGY],
  liquidity: [BlockType.DEFI_LIQUIDITY],
  position: [BlockType.DEFI_POSITION],
  risk: [BlockType.DEFI_POSITION],
  strategy: [BlockType.DEFI_YIELD_STRATEGY],
};

// Asset symbols commonly found in DeFi
// Filtered to only include assets available on Base Sepolia
const ASSET_SYMBOLS = ["ETH", "USDC", "DAI", "WETH"];

// DeFi protocols available on Base Sepolia
const PROTOCOLS = ["aave", "uniswap"];

/**
 * Parse a user prompt to extract key information
 * @param prompt User's request for a DeFi workflow
 */
function parsePrompt(prompt: string): {
  keywords: string[];
  assets: string[];
  protocols: string[];
  optimizationGoal?: string;
} {
  const keywords = Object.keys(KEYWORD_TO_BLOCK_MAP).filter((keyword) =>
    prompt.toLowerCase().includes(keyword.toLowerCase())
  );

  // Extract assets
  const assets = ASSET_SYMBOLS.filter(
    (asset) => prompt.includes(asset) || prompt.includes(asset.toLowerCase())
  );

  // Extract protocols
  const protocols = PROTOCOLS.filter((protocol) =>
    prompt.toLowerCase().includes(protocol.toLowerCase())
  );

  // Determine optimization goal
  let optimizationGoal: string | undefined;
  if (
    prompt.toLowerCase().includes("high yield") ||
    prompt.toLowerCase().includes("maximum return")
  ) {
    optimizationGoal = "max_yield";
  } else if (
    prompt.toLowerCase().includes("low risk") ||
    prompt.toLowerCase().includes("safe")
  ) {
    optimizationGoal = "min_risk";
  } else if (
    prompt.toLowerCase().includes("balance") ||
    prompt.toLowerCase().includes("moderate")
  ) {
    optimizationGoal = "balanced";
  }

  return { keywords, assets, protocols, optimizationGoal };
}

/**
 * Determine which blocks are needed based on parsed prompt
 * @param parsed Parsed information from the prompt
 */
function determineRequiredBlocks(
  parsed: ReturnType<typeof parsePrompt>
): BlockType[] {
  const blocks: BlockType[] = [];

  // Add blocks based on keywords
  parsed.keywords.forEach((keyword) => {
    const relatedBlocks = KEYWORD_TO_BLOCK_MAP[keyword];
    if (relatedBlocks) {
      relatedBlocks.forEach((block) => {
        if (!blocks.includes(block)) {
          blocks.push(block);
        }
      });
    }
  });

  // Ensure we have at least one monitoring block
  if (
    !blocks.some((block) =>
      [
        BlockType.DEFI_PRICE_MONITOR,
        BlockType.DEFI_YIELD_MONITOR,
        BlockType.DEFI_PROTOCOL,
      ].includes(block)
    )
  ) {
    blocks.push(BlockType.DEFI_PRICE_MONITOR);
  }

  // If we have a monitoring block and rebalance or swap, add portfolio block if not present
  if (
    !blocks.includes(BlockType.DEFI_PORTFOLIO) &&
    (blocks.includes(BlockType.DEFI_REBALANCE) ||
      blocks.includes(BlockType.DEFI_SWAP)) &&
    blocks.some((block) =>
      [BlockType.DEFI_PRICE_MONITOR, BlockType.DEFI_YIELD_MONITOR].includes(
        block
      )
    )
  ) {
    blocks.push(BlockType.DEFI_PORTFOLIO);
  }

  // If we have swap operations, add gas optimizer if not present
  if (
    blocks.includes(BlockType.DEFI_SWAP) &&
    !blocks.includes(BlockType.DEFI_GAS)
  ) {
    blocks.push(BlockType.DEFI_GAS);
  }

  return blocks;
}

/**
 * Create default configurations for each block type
 * @param blockType The type of block to configure
 * @param parsed Parsed information from the prompt
 */
function createDefaultConfig(
  blockType: BlockType,
  parsed: ReturnType<typeof parsePrompt>
): any {
  // Always include Base Sepolia network configuration
  const networkConfig = {
    networkId: BASE_SEPOLIA_CONFIG.networkId,
    rpcUrl: BASE_SEPOLIA_CONFIG.rpcUrl,
  };
  // Use extracted assets, with defaults if none found
  const assets = parsed.assets.length > 0 ? parsed.assets : ["ETH", "USDC"];

  // Use extracted protocols, with defaults if none found
  const protocols =
    parsed.protocols.length > 0 ? parsed.protocols : ["aave", "uniswap"];

  // Default configurations for each block type
  switch (blockType) {
    case BlockType.DEFI_PRICE_MONITOR:
      return {
        type: "PRICE_MONITOR",
        assets: assets.length ? assets : ["ETH"],
        threshold: 5, // 5% price change threshold
        monitoringInterval: 60, // 1 hour in minutes
        ...networkConfig,
      };

    case BlockType.DEFI_YIELD_MONITOR:
      return {
        type: "YIELD_MONITOR",
        protocol: protocols[0] || "aave",
        assets: assets.length ? assets : ["USDC", "DAI"],
        monitoringInterval: 1440, // 24 hours in minutes
        yieldThreshold: 2, // 2% minimum yield
        ...networkConfig,
      };

    case BlockType.DEFI_PORTFOLIO:
      return {
        type: "PORTFOLIO_BALANCE",
        wallets: [],
        protocols,
        networks: ["ethereum"],
        refreshInterval: 360, // 6 hours
        ...networkConfig,
      };

    case BlockType.DEFI_REBALANCE:
      const targetWeights: Record<string, number> = {};
      const assetList = assets.length ? assets : ["ETH", "USDC", "DAI"];

      // Create equal target weights
      const equalWeight = 100 / assetList.length;
      assetList.forEach((asset) => {
        targetWeights[asset] = equalWeight;
      });

      return {
        type: "REBALANCE_CALCULATOR",
        assets: assetList,
        targetWeights,
        rebalanceThreshold: 5, // 5% deviation threshold
        ...networkConfig,
      };

    case BlockType.DEFI_SWAP:
      return {
        type: "SWAP_EXECUTOR",
        sourceAsset: assets[0] || "ETH",
        targetAsset: assets[1] || "USDC",
        amount: "0.1",
        slippage: 0.5,
        gasLimit: BASE_SEPOLIA_GAS_DEFAULTS.gasLimit,
        maxFeePerGas: BASE_SEPOLIA_GAS_DEFAULTS.maxFeePerGas,
        maxPriorityFeePerGas: BASE_SEPOLIA_GAS_DEFAULTS.maxPriorityFeePerGas,
        ...networkConfig,
      };

    case BlockType.DEFI_GAS:
      return {
        type: "GAS_OPTIMIZER",
        gasLimit: BASE_SEPOLIA_GAS_DEFAULTS.gasLimit,
        maxFeePerGas: BASE_SEPOLIA_GAS_DEFAULTS.maxFeePerGas,
        maxPriorityFeePerGas: BASE_SEPOLIA_GAS_DEFAULTS.maxPriorityFeePerGas,
        optimizationStrategy: "gas_price",
        ...networkConfig,
      };

    case BlockType.DEFI_PROTOCOL:
      return {
        type: "PROTOCOL_MONITOR",
        protocol: protocols[0] || "aave",
        monitoringInterval: 60, // 1 hour in minutes
        healthThreshold: 80, // 80% health threshold
        ...networkConfig,
      };

    case BlockType.DEFI_YIELD_STRATEGY:
      return {
        type: "YIELD_STRATEGY",
        strategy: "yield_farming",
        optimizationGoal: parsed.optimizationGoal || "balanced",
        assets,
        protocols,
        rebalancingInterval: 24,
        minYieldThreshold: 3,
        ...networkConfig,
      };

    case BlockType.DEFI_LIQUIDITY:
      return {
        type: "LIQUIDITY_PROVIDER",
        poolAddress: "",
        tokenA: assets[0] || "ETH",
        tokenB: assets[1] || "USDC",
        amount: "0.1",
        slippage: 0.5,
        ...networkConfig,
      };

    case BlockType.DEFI_POSITION:
      return {
        type: "POSITION_MANAGER",
        assets,
        protocols,
        riskThreshold: 70, // 70% risk threshold
        monitoringInterval: 360, // 6 hours
        ...networkConfig,
      };

    default:
      return {};
  }
}

/**
 * Generate a workflow based on a user's prompt
 * @param prompt User's description of their DeFi strategy
 */
export async function generateDefiWorkflow(
  prompt: string,
  userId?: string
): Promise<{ nodes: Node[]; edges: Edge[] }> {
  // Log userId for future analytics if needed
  if (userId) {
    console.log(`Generating DeFi workflow for user: ${userId}`);
  }
  // Parse the prompt
  const parsed = parsePrompt(prompt);

  // Determine required blocks
  const requiredBlockTypes = determineRequiredBlocks(parsed);

  // Create blocks with positions
  const blocks: WorkflowBlock[] = requiredBlockTypes.map((blockType, index) => {
    const id = `block_${uuidv4()}`;

    return {
      id,
      type: blockType,
      position: {
        x: 100 + (index % 3) * 300,
        y: 100 + Math.floor(index / 3) * 200,
      },
      data: {
        label: blockType,
        config: createDefaultConfig(blockType, parsed),
      },
    };
  });

  // Create connections between blocks
  const connections: WorkflowConnection[] = [];

  // Connect blocks in a logical flow
  for (let i = 0; i < blocks.length - 1; i++) {
    const current = blocks[i];
    const next = blocks[i + 1];

    // Create logical connections based on block types
    // For example, price monitor -> portfolio -> rebalance -> swap

    connections.push({
      id: `connection_${uuidv4()}`,
      source: current.id,
      sourceHandle: "output",
      target: next.id,
      targetHandle: "input",
    });
  }

  // Special connections for certain workflows

  // If we have a gas optimizer, connect it to swap executors
  const gasOptimizer = blocks.find(
    (block) => block.type === BlockType.DEFI_GAS
  );
  const swapExecutors = blocks.filter(
    (block) => block.type === BlockType.DEFI_SWAP
  );

  if (gasOptimizer && swapExecutors.length > 0) {
    swapExecutors.forEach((swap) => {
      // Avoid duplicate connections
      if (
        !connections.some(
          (conn) => conn.source === gasOptimizer.id && conn.target === swap.id
        )
      ) {
        connections.push({
          id: `connection_${uuidv4()}`,
          source: gasOptimizer.id,
          sourceHandle: "output",
          target: swap.id,
          targetHandle: "input",
        });
      }
    });
  }

  // Transform blocks and connections into the format expected by Flow Canvas
  const nodes: Node[] = blocks.map((block) => ({
    id: block.id,
    position: block.position,
    type: "custom", // Use 'custom' as the node type for React Flow
    data: {
      blockType: block.type,
      label: getBlockMetadata(block.type).label || block.type,
      description: getBlockMetadata(block.type).description || "",
      nodeType: "FINANCE", // All DeFi blocks are in the FINANCE category
      iconName: getBlockMetadata(block.type).icon || "Workflow",
      isEnabled: true,
      config: block.data.config || {},
      inputs: [],
      outputs: [],
    },
    width: 180,
    height: 100,
  }));

  const edges: Edge[] = connections.map((connection) => ({
    id: `edge_${uuidv4()}`,
    source: connection.source,
    target: connection.target,
    type: "custom",
    animated: false,
    sourceHandle: connection.sourceHandle,
    targetHandle: connection.targetHandle,
  }));

  // Return the workflow in the format expected by the Flow Canvas
  return {
    nodes,
    edges,
  };
}
