import { OllamaProvider } from './providers/ollama';
import { DefiBlockType, DefiBlockConfig } from '@/types/defi-blocks';
import { BlockType } from '@zyra/types';


export class DefiPromptParser {
  constructor(private ollamaProvider: OllamaProvider) {}

  async parse(prompt: string): Promise<DefiWorkflowConfig> {
    const aiResponse = await this.ollamaProvider.analyzeDefiPrompt(prompt);
    
    const workflowConfig = await this.extractWorkflowConfig(aiResponse);
    
    return {
      type: workflowConfig.type,
      nodes: await this.generateNodes(workflowConfig),
      edges: await this.generateEdges(workflowConfig, await this.generateNodes(workflowConfig))
    };
  }

  private async extractWorkflowConfig(response: any): Promise<DefiWorkflowConfig> {
    const workflowConfig: DefiWorkflowConfig = {
      nodes: {
        schedule: {
          type: DefiBlockType.SCHEDULE,
          config: {
            interval: 'daily',
            time: '09:00'
          }
        },
        actions: []
      },
      frequency: 'daily'
    };

    // Extract assets
    if (response.assets) {
      workflowConfig.nodes.assets = Array.isArray(response.assets) ? response.assets : [response.assets];
    }

    // Extract protocols
    if (response.protocols) {
      workflowConfig.nodes.protocols = Array.isArray(response.protocols) ? response.protocols : [response.protocols];
    }

    // Extract conditions
    if (response.conditions) {
      workflowConfig.nodes.conditions = Array.isArray(response.conditions) ? response.conditions : [response.conditions];
    }

    // Extract actions
    if (response.actions) {
      workflowConfig.nodes.actions = Array.isArray(response.actions) ? response.actions : [response.actions];
    }

    // Extract frequency
    if (response.frequency) {
      workflowConfig.frequency = response.frequency;
    }

    return workflowConfig;
  }

  private async generateNodes(config: DefiWorkflowConfig): Promise<DefiNode[]> {
    const nodes: DefiNode[] = [];
    const nodeId = (type: string) => `${type}_${Date.now()}_${Math.random().toString(36).substring(2)}`;

    // Add trigger node
    nodes.push({
      id: nodeId('trigger'),
      type: 'schedule',
      position: { x: 0, y: 0 },
      data: {
        label: `Trigger (${config.frequency})`,
        config: {
          type: 'schedule',
          frequency: config.frequency
        }
      }
    });

    // Add monitoring nodes
    if (config.nodes.assets?.length) {
      nodes.push({
        id: nodeId('price_monitor'),
        type: DefiBlockType.PRICE_MONITOR,
        position: { x: 200, y: 0 },
        data: {
          label: 'Price Monitor',
          config: {
            type: DefiBlockType.PRICE_MONITOR,
            assets: config.nodes.assets,
            threshold: 5,
            monitoringInterval: 60
          }
        }
      });
    }

    if (config.nodes.protocols?.length) {
      nodes.push({
        id: nodeId('protocol_monitor'),
        type: DefiBlockType.PROTOCOL_MONITOR,
        position: { x: 200, y: 100 },
        data: {
          label: 'Protocol Monitor',
          config: {
            type: DefiBlockType.PROTOCOL_MONITOR,
            protocol: config.nodes.protocols[0],
            monitoringInterval: 300,
            healthThreshold: 95
          }
        }
      });
    }

    // Add action nodes based on conditions
    if (config.nodes.conditions?.length) {
      // Add portfolio balance node
      nodes.push({
        id: nodeId('portfolio'),
        type: DefiBlockType.PORTFOLIO_BALANCE,
        position: { x: 400, y: 0 },
        data: {
          label: 'Portfolio Balance',
          config: {
            type: DefiBlockType.PORTFOLIO_BALANCE,
            assets: config.nodes.assets,
            protocols: config.nodes.protocols,
            monitoringInterval: 300
          }
        }
      });

      // Add rebalance calculator
      nodes.push({
        id: nodeId('rebalance'),
        type: DefiBlockType.REBALANCE_CALCULATOR,
        position: { x: 600, y: 0 },
        data: {
          label: 'Rebalance Calculator',
          config: {
            type: DefiBlockType.REBALANCE_CALCULATOR,
            targetWeights: {}, // Will be populated based on conditions
            rebalanceThreshold: 5,
            slippage: 0.5
          }
        }
      });

      // Add swap executor
      nodes.push({
        id: nodeId('swap'),
        type: DefiBlockType.SWAP_EXECUTOR,
        position: { x: 800, y: 0 },
        data: {
          label: 'Swap Executor',
          config: {
            type: DefiBlockType.SWAP_EXECUTOR,
            sourceAsset: '', // Will be populated based on conditions
            targetAsset: '', // Will be populated based on conditions
            amount: '0',
            slippage: 0.5,
            gasLimit: 200000,
            maxFee: 0.01
          }
        }
      });
    }

    return nodes;
  }

  private async generateEdges(config: DefiWorkflowConfig, nodes: DefiNode[]): Promise<DefiEdge[]> {
    const edges: DefiEdge[] = [];
    
    // Connect trigger to monitoring nodes
    const triggerNode = nodes.find(n => n.type === DefiBlockType.SCHEDULE);
    if (triggerNode) {
      const monitoringNodes = nodes.filter(n => 
        [DefiBlockType.PRICE_MONITOR, DefiBlockType.PROTOCOL_MONITOR].includes(n.type as DefiBlockType)
      );
      
      monitoringNodes.forEach(monitor => {
        edges.push({
          id: `edge_${triggerNode.id}_${monitor.id}`,
          source: triggerNode.id,
          target: monitor.id,
          animated: true
        });
      });
    }

    // Connect monitoring nodes to portfolio
    const portfolioNode = nodes.find(n => n.type === DefiBlockType.PORTFOLIO_BALANCE);
    if (portfolioNode) {
      const monitoringNodes = nodes.filter(n => 
        [DefiBlockType.PRICE_MONITOR, DefiBlockType.PROTOCOL_MONITOR].includes(n.type as DefiBlockType)
      );
      
      monitoringNodes.forEach(monitor => {
        edges.push({
          id: `edge_${monitor.id}_${portfolioNode.id}`,
          source: monitor.id,
          target: portfolioNode.id,
          animated: true
        });
      });
    }

    // Connect portfolio to rebalance
    const rebalanceNode = nodes.find(n => n.type === DefiBlockType.REBALANCE_CALCULATOR);
    if (portfolioNode && rebalanceNode) {
      edges.push({
        id: `edge_${portfolioNode.id}_${rebalanceNode.id}`,
        source: portfolioNode.id,
        target: rebalanceNode.id,
        animated: true
      });
    }

    // Connect rebalance to swap
    const swapNode = nodes.find(n => n.type === DefiBlockType.SWAP_EXECUTOR);
    if (rebalanceNode && swapNode) {
      edges.push({
        id: `edge_${rebalanceNode.id}_${swapNode.id}`,
        source: rebalanceNode.id,
        target: swapNode.id,
        animated: true
      });
    }

    return edges;
  }
}

export interface DefiWorkflowConfig {
  type: string;
  assets: string[];
  protocols: string[];
  conditions: string[];
  actions: string[];
  frequency: string;
}

export interface DefiNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    config: DefiBlockConfig;
  };
}

export interface DefiEdge {
  id: string;
  source: string;
  target: string;
  animated?: boolean;
}
