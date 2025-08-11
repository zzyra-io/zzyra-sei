import { DefiNode, DefiEdge } from '@/types/defi-blocks';
import { OllamaProvider } from '@/lib/ai/providers/ollama';
import { BlockType } from '@zzyra/types';

// Custom block types for the workflow optimizer
type ExtendedBlockType = BlockType | 'gas_monitor' | 'network_monitor' | 'error_handler' | 'fallback';

export class WorkflowOptimizer {
  constructor(private ollamaProvider: OllamaProvider) {}

  async optimize(workflow: {
    nodes: DefiNode[];
    edges: DefiEdge[];
  }): Promise<{ nodes: DefiNode[]; edges: DefiEdge[] }> {
    const optimizedNodes = await this.optimizeNodes(workflow.nodes);
    const optimizedEdges = await this.optimizeEdges(
      workflow.edges,
      optimizedNodes
    );

    // Add monitoring nodes
    const monitoringNodes = await this.addMonitoringNodes(optimizedNodes);

    // Add error handling nodes
    const errorHandlingNodes = await this.addErrorHandlingNodes(optimizedNodes);

    // Update nodes array
    const allNodes = [
      ...optimizedNodes,
      ...monitoringNodes,
      ...errorHandlingNodes,
    ];

    // Update edges to connect new nodes
    const allEdges = await this.updateEdges(allNodes, optimizedEdges);

    return { nodes: allNodes, edges: allEdges };
  }

  private async optimizeNodes(nodes: DefiNode[]): Promise<DefiNode[]> {
    const optimizedNodes = [...nodes];

    // Optimize gas usage for swap nodes
    const swapNodes = nodes.filter(
      (n) => n.type === 'swap_executor' as ExtendedBlockType
    );
    for (const node of swapNodes) {
      const optimizedConfig = await this.optimizeSwapConfig(node.data.config);
      node.data.config = optimizedConfig;
    }

    // Optimize rebalance thresholds
    const rebalanceNodes = nodes.filter(
      (n) => n.type === 'rebalance_calculator' as ExtendedBlockType
    );
    for (const node of rebalanceNodes) {
      const optimizedConfig = await this.optimizeRebalanceConfig(
        node.data.config
      );
      node.data.config = optimizedConfig;
    }

    return optimizedNodes;
  }

  private async optimizeEdges(
    edges: DefiEdge[],
    nodes: DefiNode[]
  ): Promise<DefiEdge[]> {
    const optimizedEdges = [...edges];

    // Add error handling edges
    const errorHandlingEdges = await this.addErrorHandlingEdges(nodes);
    optimizedEdges.push(...errorHandlingEdges);

    // Add monitoring edges
    const monitoringEdges = await this.addMonitoringEdges(nodes);
    optimizedEdges.push(...monitoringEdges);

    return optimizedEdges;
  }

  private async optimizeSwapConfig(config: any): Promise<any> {
    // Use AI to optimize swap parameters
    const aiResponse = await this.ollamaProvider.optimizeSwapConfig(config);

    return {
      ...config,
      gasLimit: aiResponse.gasLimit || config.gasLimit,
      slippage: aiResponse.slippage || config.slippage,
      maxFee: aiResponse.maxFee || config.maxFee,
      optimizationStrategy: aiResponse.optimizationStrategy || "gas_price",
    };
  }

  private async optimizeRebalanceConfig(config: any): Promise<any> {
    // Use AI to optimize rebalance parameters
    const aiResponse =
      await this.ollamaProvider.optimizeRebalanceConfig(config);

    return {
      ...config,
      rebalanceThreshold:
        aiResponse.rebalanceThreshold || config.rebalanceThreshold,
      slippage: aiResponse.slippage || config.slippage,
      optimizationGoal: aiResponse.optimizationGoal || "min_risk",
    };
  }

  private async addMonitoringNodes(nodes: DefiNode[]): Promise<DefiNode[]> {
    const monitoringNodes: DefiNode[] = [];

    // Add gas price monitor
    monitoringNodes.push({
      id: `gas_monitor_${Date.now()}`,
      type: 'gas_monitor' as ExtendedBlockType,
      position: { x: 100, y: 400 },
      data: {
        label: "Gas Price Monitor",
        config: {
          type: 'gas_monitor' as any, // Using any to bypass type checking for custom monitoring types
          monitoringInterval: 60,
          threshold: 100,
        } as any, // Using any to allow custom monitoring properties
      },
    });

    // Add network health monitor
    monitoringNodes.push({
      id: `network_monitor_${Date.now()}`,
      type: 'network_monitor' as ExtendedBlockType,
      position: { x: 300, y: 400 },
      data: {
        label: "Network Health Monitor",
        config: {
          type: 'network_monitor' as any, // Using any to bypass type checking for custom monitoring types
          monitoringInterval: 300,
          healthThreshold: 95,
        } as any, // Using any to allow custom monitoring properties
      },
    });

    return monitoringNodes;
  }

  private async addErrorHandlingNodes(nodes: DefiNode[]): Promise<DefiNode[]> {
    const errorHandlingNodes: DefiNode[] = [];

    // Add error handler
    errorHandlingNodes.push({
      id: `error_handler_${Date.now()}`,
      type: 'error_handler' as ExtendedBlockType,
      position: { x: 500, y: 400 },
      data: {
        label: "Error Handler",
        config: {
          type: 'error_handler' as any, // Using any to bypass type checking for custom error handling types
          retryCount: 3,
          retryDelay: 60,
          notificationLevel: "critical",
        } as any, // Using any to allow custom error handling properties
      },
    });

    // Add fallback strategy
    errorHandlingNodes.push({
      id: `fallback_${Date.now()}`,
      type: 'fallback' as ExtendedBlockType,
      position: { x: 700, y: 400 },
      data: {
        label: "Fallback Strategy",
        config: {
          type: 'fallback' as any, // Using any to bypass type checking for custom fallback types
          alternativeActions: [],
          notificationLevel: "warning",
        } as any, // Using any to allow custom fallback properties
      },
    });

    return errorHandlingNodes;
  }

  private async addErrorHandlingEdges(nodes: DefiNode[]): Promise<DefiEdge[]> {
    const errorEdges: DefiEdge[] = [];
    const errorNode = nodes.find((n) => n.type === 'error_handler' as ExtendedBlockType);

    if (errorNode) {
      nodes.forEach((node) => {
        if (node.type !== 'error_handler' as ExtendedBlockType && node.type !== 'fallback' as ExtendedBlockType) {
          errorEdges.push({
            id: `error_edge_${node.id}_${errorNode.id}`,
            source: node.id,
            target: errorNode.id,
            animated: true,
            style: { stroke: 'red' },
          });
        }
      });
    }

    return errorEdges;
  }

  private async addMonitoringEdges(nodes: DefiNode[]): Promise<DefiEdge[]> {
    const monitoringEdges: DefiEdge[] = [];
    const gasMonitor = nodes.find((n) => n.type === 'gas_monitor' as ExtendedBlockType);
    const networkMonitor = nodes.find((n) => n.type === 'network_monitor' as ExtendedBlockType);

    if (gasMonitor && networkMonitor) {
      nodes.forEach((node) => {
        if (node.type !== 'gas_monitor' as ExtendedBlockType && node.type !== 'network_monitor' as ExtendedBlockType) {
          monitoringEdges.push({
            id: `gas_monitor_edge_${gasMonitor.id}_${node.id}`,
            source: gasMonitor.id,
            target: node.id,
            animated: true,
            style: { stroke: 'blue', strokeDasharray: '5,5' }
          });

          monitoringEdges.push({
            id: `network_monitor_edge_${networkMonitor.id}_${node.id}`,
            source: networkMonitor.id,
            target: node.id,
            animated: true,
            style: { stroke: 'green', strokeDasharray: '5,5' }
          });
        }
      });
    }

    return monitoringEdges;
  }

  private async updateEdges(
    nodes: DefiNode[],
    edges: DefiEdge[]
  ): Promise<DefiEdge[]> {
    const updatedEdges = [...edges];

    // Update edge positions based on new nodes
    nodes.forEach((node) => {
      const nodeEdges = edges.filter(
        (e) => e.source === node.id || e.target === node.id
      );
      nodeEdges.forEach((edge) => {
        const sourceNode = nodes.find((n) => n.id === edge.source);
        const targetNode = nodes.find((n) => n.id === edge.target);

        if (sourceNode && targetNode) {
          // Update edge positions based on node positions
          // This is a placeholder - actual implementation would calculate optimal edge paths
          edge.animated = true;
        }
      });
    });

    return updatedEdges;
  }
}
