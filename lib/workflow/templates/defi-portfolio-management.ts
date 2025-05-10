import { v4 as uuidv4 } from 'uuid';
// Define simplified types for nodes and edges to match the expected structure
interface FlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
  [key: string]: unknown;
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  animated?: boolean;
  sourceHandle?: string;
  targetHandle?: string;
  [key: string]: unknown;
}
import { BlockType } from '@/types/workflow';
import { BASE_SEPOLIA_CONFIG, BASE_SEPOLIA_GAS_DEFAULTS } from '../base-sepolia-config';

/**
 * Template for DeFi portfolio management on Base Sepolia
 * This template creates a complete workflow for:
 * 1. Monitoring portfolio balances across protocols
 * 2. Checking for rebalancing opportunities
 * 3. Optimizing gas for transactions
 * 4. Executing swaps when needed
 * 5. Sending notifications about portfolio status
 */
export function createDeFiPortfolioTemplate(_userId: string): { nodes: FlowNode[]; edges: FlowEdge[] } {
  // Create unique IDs for each node
  const scheduleId = `schedule_${uuidv4()}`;
  const portfolioId = `portfolio_${uuidv4()}`;
  const rebalanceId = `rebalance_${uuidv4()}`;
  const conditionId = `condition_${uuidv4()}`;
  const gasOptimizerId = `gas_${uuidv4()}`;
  const swapId = `swap_${uuidv4()}`;
  const notificationId = `notification_${uuidv4()}`;

  // Create the nodes
  const nodes: FlowNode[] = [
    // Schedule trigger - runs every day
    {
      id: scheduleId,
      type: 'custom',
      position: { x: 100, y: 100 },
      data: {
        blockType: BlockType.SCHEDULE,
        label: 'Daily Check',
        description: 'Trigger workflow daily',
        nodeType: 'TRIGGER',
        iconName: 'schedule',
        isEnabled: true,
        config: {
          interval: 'daily',
          time: '09:00'
        },
        inputs: [],
        outputs: []
      }
    },
    
    // Portfolio balance check
    {
      id: portfolioId,
      type: 'custom',
      position: { x: 100, y: 250 },
      data: {
        blockType: BlockType.DEFI_PORTFOLIO,
        label: 'Portfolio Balance',
        description: 'Check portfolio balance across protocols',
        nodeType: 'FINANCE',
        iconName: 'portfolio',
        isEnabled: true,
        config: {
          type: 'PORTFOLIO_BALANCE',
          assets: ['ETH', 'USDC', 'DAI'],
          protocols: ['aave', 'uniswap'],
          monitoringInterval: 60,
          networkId: BASE_SEPOLIA_CONFIG.networkId,
          rpcUrl: BASE_SEPOLIA_CONFIG.rpcUrl
        },
        inputs: [],
        outputs: []
      }
    },
    
    // Rebalance calculator
    {
      id: rebalanceId,
      type: 'custom',
      position: { x: 100, y: 400 },
      data: {
        blockType: BlockType.DEFI_REBALANCE,
        label: 'Rebalance Calculator',
        description: 'Calculate if rebalancing is needed',
        nodeType: 'FINANCE',
        iconName: 'rebalance',
        isEnabled: true,
        config: {
          type: 'REBALANCE_CALCULATOR',
          assets: ['ETH', 'USDC', 'DAI'],
          targetWeights: {
            'ETH': 40,
            'USDC': 40,
            'DAI': 20
          },
          rebalanceThreshold: 5,
          networkId: BASE_SEPOLIA_CONFIG.networkId,
          rpcUrl: BASE_SEPOLIA_CONFIG.rpcUrl
        },
        inputs: [],
        outputs: []
      }
    },
    
    // Condition to check if rebalance is needed
    {
      id: conditionId,
      type: 'custom',
      position: { x: 100, y: 550 },
      data: {
        blockType: BlockType.CONDITION,
        label: 'Rebalance Needed?',
        description: 'Check if rebalancing is required',
        nodeType: 'LOGIC',
        iconName: 'condition',
        isEnabled: true,
        config: {
          condition: '{{data.needsRebalance}}',
          description: 'Check if portfolio needs rebalancing'
        },
        inputs: [],
        outputs: []
      }
    },
    
    // Gas optimizer
    {
      id: gasOptimizerId,
      type: 'custom',
      position: { x: 300, y: 650 },
      data: {
        blockType: BlockType.DEFI_GAS,
        label: 'Gas Optimizer',
        description: 'Optimize gas for transactions',
        nodeType: 'FINANCE',
        iconName: 'gas',
        isEnabled: true,
        config: {
          type: 'GAS_OPTIMIZER',
          gasLimit: BASE_SEPOLIA_GAS_DEFAULTS.gasLimit,
          maxFeePerGas: BASE_SEPOLIA_GAS_DEFAULTS.maxFeePerGas,
          maxPriorityFeePerGas: BASE_SEPOLIA_GAS_DEFAULTS.maxPriorityFeePerGas,
          optimizationStrategy: 'gas_price',
          networkId: BASE_SEPOLIA_CONFIG.networkId,
          rpcUrl: BASE_SEPOLIA_CONFIG.rpcUrl
        },
        inputs: [],
        outputs: []
      }
    },
    
    // Swap executor
    {
      id: swapId,
      type: 'custom',
      position: { x: 300, y: 800 },
      data: {
        blockType: BlockType.DEFI_SWAP,
        label: 'Token Swap',
        description: 'Execute token swap for rebalancing',
        nodeType: 'FINANCE',
        iconName: 'swap',
        isEnabled: true,
        config: {
          type: 'SWAP_EXECUTOR',
          sourceAsset: '{{data.swapFrom}}',
          targetAsset: '{{data.swapTo}}',
          amount: '{{data.swapAmount}}',
          slippage: 0.5,
          gasLimit: BASE_SEPOLIA_GAS_DEFAULTS.gasLimit,
          maxFeePerGas: '{{data.recommendedMaxFeePerGas}}',
          maxPriorityFeePerGas: '{{data.recommendedMaxPriorityFeePerGas}}',
          networkId: BASE_SEPOLIA_CONFIG.networkId,
          rpcUrl: BASE_SEPOLIA_CONFIG.rpcUrl
        },
        inputs: [],
        outputs: []
      }
    },
    
    // Notification
    {
      id: notificationId,
      type: 'custom',
      position: { x: 100, y: 900 },
      data: {
        blockType: BlockType.NOTIFICATION,
        label: 'Portfolio Update',
        description: 'Send portfolio update notification',
        nodeType: 'ACTION',
        iconName: 'notification',
        isEnabled: true,
        config: {
          type: 'info',
          title: 'Portfolio Update on Base Sepolia',
          message: 'Current portfolio value: {{data.totalValue}} USD. {{#if data.needsRebalance}}Rebalancing executed.{{else}}No rebalancing needed.{{/if}}'
        },
        inputs: [],
        outputs: []
      }
    }
  ];

  // Create the edges
  const edges: FlowEdge[] = [
    // Connect schedule to portfolio balance
    {
      id: `edge_${uuidv4()}`,
      source: scheduleId,
      target: portfolioId,
      type: 'custom',
      animated: false
    },
    
    // Connect portfolio to rebalance calculator
    {
      id: `edge_${uuidv4()}`,
      source: portfolioId,
      target: rebalanceId,
      type: 'custom',
      animated: false
    },
    
    // Connect rebalance calculator to condition
    {
      id: `edge_${uuidv4()}`,
      source: rebalanceId,
      target: conditionId,
      type: 'custom',
      animated: false
    },
    
    // Connect condition to gas optimizer (true path)
    {
      id: `edge_${uuidv4()}`,
      source: conditionId,
      target: gasOptimizerId,
      type: 'custom',
      animated: false,
      sourceHandle: 'true'
    },
    
    // Connect gas optimizer to swap executor
    {
      id: `edge_${uuidv4()}`,
      source: gasOptimizerId,
      target: swapId,
      type: 'custom',
      animated: false
    },
    
    // Connect swap executor to notification
    {
      id: `edge_${uuidv4()}`,
      source: swapId,
      target: notificationId,
      type: 'custom',
      animated: false
    },
    
    // Connect condition to notification (false path)
    {
      id: `edge_${uuidv4()}`,
      source: conditionId,
      target: notificationId,
      type: 'custom',
      animated: false,
      sourceHandle: 'false'
    }
  ];

  return { nodes, edges };
}
