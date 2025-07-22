import { Injectable, Logger } from '@nestjs/common';
import { DataTransformationService } from './data-transformation.service';
import { DataStateService } from './data-state.service';
import { DatabaseService } from './database.service';

export interface ExecutionGroup {
  id: string;
  nodes: any[];
  dependencies: string[];
  canRunInParallel: boolean;
  estimatedDuration?: number;
}

export interface ParallelExecutionContext {
  executionId: string;
  sharedDataStore: Map<string, any>;
  nodeResults: Map<string, any>;
  executionGroups: ExecutionGroup[];
  completedGroups: Set<string>;
  failedNodes: Set<string>;
  activeExecutions: Set<string>;
}

export interface NodeExecutionPlan {
  nodeId: string;
  groupId: string;
  dependencies: string[];
  canExecuteInParallel: boolean;
  requiredData: string[];
  dataTransformations?: any[];
}

@Injectable()
export class ParallelExecutionService {
  private readonly logger = new Logger(ParallelExecutionService.name);
  
  // Track active parallel execution contexts
  private activeContexts = new Map<string, ParallelExecutionContext>();

  constructor(
    private readonly dataTransformationService: DataTransformationService,
    private readonly dataStateService: DataStateService,
    private readonly databaseService: DatabaseService
  ) {}

  /**
   * Analyze workflow and create execution groups for parallel processing
   */
  async createExecutionPlan(
    nodes: any[],
    edges: any[],
    executionId: string
  ): Promise<{
    groups: ExecutionGroup[];
    canUseParallelExecution: boolean;
    estimatedSpeedup: number;
  }> {
    // Build dependency graph
    const dependencyMap = this.buildDependencyMap(nodes, edges);
    
    // Identify nodes that can run in parallel
    const parallelGroups = this.identifyParallelGroups(nodes, dependencyMap);
    
    // Calculate potential speedup
    const estimatedSpeedup = this.calculateEstimatedSpeedup(parallelGroups);
    
    const canUseParallelExecution = parallelGroups.some(group => group.canRunInParallel && group.nodes.length > 1);

    this.logger.log(`Created execution plan for ${nodes.length} nodes: ${parallelGroups.length} groups, estimated speedup: ${estimatedSpeedup}x`);

    return {
      groups: parallelGroups,
      canUseParallelExecution,
      estimatedSpeedup
    };
  }

  /**
   * Initialize parallel execution context
   */
  async initializeParallelContext(
    executionId: string,
    executionPlan: ExecutionGroup[]
  ): Promise<ParallelExecutionContext> {
    const context: ParallelExecutionContext = {
      executionId,
      sharedDataStore: new Map(),
      nodeResults: new Map(),
      executionGroups: executionPlan,
      completedGroups: new Set(),
      failedNodes: new Set(),
      activeExecutions: new Set()
    };

    this.activeContexts.set(executionId, context);
    
    this.logger.log(`Initialized parallel execution context for ${executionId}`);
    return context;
  }

  /**
   * Share data between parallel executing nodes
   */
  async shareData(
    executionId: string,
    nodeId: string,
    data: any,
    dataKey?: string
  ): Promise<void> {
    const context = this.activeContexts.get(executionId);
    if (!context) {
      throw new Error(`No parallel execution context found for ${executionId}`);
    }

    const key = dataKey || nodeId;
    context.sharedDataStore.set(key, data);
    context.nodeResults.set(nodeId, data);

    // Persist to data state service
    await this.dataStateService.saveDataState(executionId, nodeId, data, {
      tags: ['parallel', 'shared']
    });

    // Track data dependency updates
    await this.dataStateService.trackDataDependency(nodeId, [], [key]);

    this.logger.debug(`Shared data for node ${nodeId} with key ${key}`);
  }

  /**
   * Get shared data for a node
   */
  async getSharedData(
    executionId: string,
    requestingNodeId: string,
    dataKeys: string[]
  ): Promise<Record<string, any>> {
    const context = this.activeContexts.get(executionId);
    if (!context) {
      throw new Error(`No parallel execution context found for ${executionId}`);
    }

    const sharedData: Record<string, any> = {};

    for (const key of dataKeys) {
      // First check in-memory shared store
      if (context.sharedDataStore.has(key)) {
        sharedData[key] = context.sharedDataStore.get(key);
      } else {
        // Fallback to persistent storage
        const persistedData = await this.dataStateService.getDataState(executionId, key);
        if (persistedData) {
          sharedData[key] = persistedData.data;
          // Cache in memory for future access
          context.sharedDataStore.set(key, persistedData.data);
        }
      }
    }

    // Check data freshness
    const freshness = await this.dataStateService.checkDataFreshness(requestingNodeId);
    if (!freshness.isFresh) {
      this.logger.warn(`Data for node ${requestingNodeId} may be stale due to dependencies: [${freshness.staleDependencies.join(', ')}]`);
    }

    this.logger.debug(`Retrieved shared data for node ${requestingNodeId}: [${dataKeys.join(', ')}]`);
    return sharedData;
  }

  /**
   * Broadcast data to all parallel executing nodes
   */
  async broadcastData(
    executionId: string,
    sourceNodeId: string,
    data: any,
    targetNodes?: string[]
  ): Promise<void> {
    const context = this.activeContexts.get(executionId);
    if (!context) {
      throw new Error(`No parallel execution context found for ${executionId}`);
    }

    const broadcastKey = `broadcast:${sourceNodeId}:${Date.now()}`;
    context.sharedDataStore.set(broadcastKey, data);

    // If specific target nodes are provided, only broadcast to them
    const targets = targetNodes || Array.from(context.activeExecutions);
    
    for (const targetNodeId of targets) {
      if (targetNodeId !== sourceNodeId) {
        const targetKey = `broadcast:${sourceNodeId}:${targetNodeId}`;
        context.sharedDataStore.set(targetKey, data);
        
        this.logger.debug(`Broadcasted data from ${sourceNodeId} to ${targetNodeId}`);
      }
    }
  }

  /**
   * Wait for dependencies to complete before allowing node execution
   */
  async waitForDependencies(
    executionId: string,
    nodeId: string,
    dependencies: string[],
    timeoutMs: number = 30000
  ): Promise<Record<string, any>> {
    const context = this.activeContexts.get(executionId);
    if (!context) {
      throw new Error(`No parallel execution context found for ${executionId}`);
    }

    const startTime = Date.now();
    const dependencyData: Record<string, any> = {};

    this.logger.debug(`Node ${nodeId} waiting for dependencies: [${dependencies.join(', ')}]`);

    while (Date.now() - startTime < timeoutMs) {
      let allDependenciesReady = true;

      for (const depNodeId of dependencies) {
        if (context.failedNodes.has(depNodeId)) {
          throw new Error(`Dependency node ${depNodeId} failed, cannot execute ${nodeId}`);
        }

        if (context.nodeResults.has(depNodeId)) {
          dependencyData[depNodeId] = context.nodeResults.get(depNodeId);
        } else {
          // Check persistent storage
          const persistedData = await this.dataStateService.getDataState(executionId, depNodeId);
          if (persistedData) {
            dependencyData[depNodeId] = persistedData.data;
            context.nodeResults.set(depNodeId, persistedData.data);
          } else {
            allDependenciesReady = false;
            break;
          }
        }
      }

      if (allDependenciesReady) {
        this.logger.debug(`All dependencies ready for node ${nodeId}`);
        return dependencyData;
      }

      // Wait a short time before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    throw new Error(`Timeout waiting for dependencies for node ${nodeId}`);
  }

  /**
   * Mark node execution as started
   */
  async markNodeStarted(executionId: string, nodeId: string): Promise<void> {
    const context = this.activeContexts.get(executionId);
    if (context) {
      context.activeExecutions.add(nodeId);
    }
  }

  /**
   * Mark node execution as completed
   */
  async markNodeCompleted(
    executionId: string,
    nodeId: string,
    result: any,
    groupId?: string
  ): Promise<void> {
    const context = this.activeContexts.get(executionId);
    if (!context) {
      return;
    }

    context.activeExecutions.delete(nodeId);
    context.nodeResults.set(nodeId, result);

    // Share the result data
    await this.shareData(executionId, nodeId, result);

    // Check if group is completed
    if (groupId) {
      const group = context.executionGroups.find(g => g.id === groupId);
      if (group) {
        const groupNodesCompleted = group.nodes.every(node => 
          context.nodeResults.has(node.id) || context.failedNodes.has(node.id)
        );
        
        if (groupNodesCompleted) {
          context.completedGroups.add(groupId);
          this.logger.log(`Execution group ${groupId} completed`);
        }
      }
    }

    this.logger.debug(`Node ${nodeId} completed in parallel execution`);
  }

  /**
   * Mark node execution as failed
   */
  async markNodeFailed(
    executionId: string,
    nodeId: string,
    error: string,
    groupId?: string
  ): Promise<void> {
    const context = this.activeContexts.get(executionId);
    if (!context) {
      return;
    }

    context.activeExecutions.delete(nodeId);
    context.failedNodes.add(nodeId);

    // Check if group should be marked as failed
    if (groupId) {
      const group = context.executionGroups.find(g => g.id === groupId);
      if (group) {
        // Mark group as failed if any critical node fails
        context.completedGroups.add(groupId); // Mark as "completed" (with failure)
        this.logger.error(`Execution group ${groupId} failed due to node ${nodeId}: ${error}`);
      }
    }

    this.logger.error(`Node ${nodeId} failed in parallel execution: ${error}`);
  }

  /**
   * Get execution progress for parallel context
   */
  getExecutionProgress(executionId: string): {
    totalNodes: number;
    completedNodes: number;
    failedNodes: number;
    activeNodes: number;
    completedGroups: number;
    totalGroups: number;
  } | null {
    const context = this.activeContexts.get(executionId);
    if (!context) {
      return null;
    }

    const totalNodes = context.executionGroups.reduce((sum, group) => sum + group.nodes.length, 0);
    
    return {
      totalNodes,
      completedNodes: context.nodeResults.size,
      failedNodes: context.failedNodes.size,
      activeNodes: context.activeExecutions.size,
      completedGroups: context.completedGroups.size,
      totalGroups: context.executionGroups.length
    };
  }

  /**
   * Clean up parallel execution context
   */
  async cleanupContext(executionId: string): Promise<void> {
    const context = this.activeContexts.get(executionId);
    if (context) {
      context.sharedDataStore.clear();
      context.nodeResults.clear();
      context.activeExecutions.clear();
      this.activeContexts.delete(executionId);
      
      this.logger.log(`Cleaned up parallel execution context for ${executionId}`);
    }
  }

  /**
   * Private helper methods
   */
  private buildDependencyMap(nodes: any[], edges: any[]): Map<string, string[]> {
    const dependencyMap = new Map<string, string[]>();
    
    // Initialize all nodes with empty dependencies
    nodes.forEach(node => {
      dependencyMap.set(node.id, []);
    });

    // Add dependencies based on edges
    edges.forEach(edge => {
      const dependencies = dependencyMap.get(edge.target) || [];
      if (!dependencies.includes(edge.source)) {
        dependencies.push(edge.source);
        dependencyMap.set(edge.target, dependencies);
      }
    });

    return dependencyMap;
  }

  private identifyParallelGroups(
    nodes: any[],
    dependencyMap: Map<string, string[]>
  ): ExecutionGroup[] {
    const groups: ExecutionGroup[] = [];
    const processedNodes = new Set<string>();
    let groupIndex = 0;

    // Sort nodes by dependency depth
    const nodesByDepth = this.sortNodesByDependencyDepth(nodes, dependencyMap);
    
    for (const depthGroup of nodesByDepth) {
      const parallelNodes = depthGroup.filter(node => !processedNodes.has(node.id));
      
      if (parallelNodes.length > 0) {
        const group: ExecutionGroup = {
          id: `group-${groupIndex++}`,
          nodes: parallelNodes,
          dependencies: this.getGroupDependencies(parallelNodes, dependencyMap, processedNodes),
          canRunInParallel: parallelNodes.length > 1,
          estimatedDuration: this.estimateGroupDuration(parallelNodes)
        };

        groups.push(group);
        parallelNodes.forEach(node => processedNodes.add(node.id));
      }
    }

    return groups;
  }

  private sortNodesByDependencyDepth(
    nodes: any[],
    dependencyMap: Map<string, string[]>
  ): any[][] {
    const depths = new Map<string, number>();
    const visited = new Set<string>();

    // Calculate depth for each node
    const calculateDepth = (nodeId: string): number => {
      if (visited.has(nodeId)) return depths.get(nodeId) || 0;
      
      visited.add(nodeId);
      const dependencies = dependencyMap.get(nodeId) || [];
      
      if (dependencies.length === 0) {
        depths.set(nodeId, 0);
        return 0;
      }

      const maxDepth = Math.max(...dependencies.map(dep => calculateDepth(dep)));
      const nodeDepth = maxDepth + 1;
      depths.set(nodeId, nodeDepth);
      
      return nodeDepth;
    };

    // Calculate depths for all nodes
    nodes.forEach(node => calculateDepth(node.id));

    // Group nodes by depth
    const maxDepth = Math.max(...Array.from(depths.values()));
    const depthGroups: any[][] = [];

    for (let depth = 0; depth <= maxDepth; depth++) {
      const nodesAtDepth = nodes.filter(node => depths.get(node.id) === depth);
      if (nodesAtDepth.length > 0) {
        depthGroups.push(nodesAtDepth);
      }
    }

    return depthGroups;
  }

  private getGroupDependencies(
    groupNodes: any[],
    dependencyMap: Map<string, string[]>,
    processedNodes: Set<string>
  ): string[] {
    const allDependencies = new Set<string>();
    
    groupNodes.forEach(node => {
      const nodeDeps = dependencyMap.get(node.id) || [];
      nodeDeps.forEach(dep => {
        if (processedNodes.has(dep)) {
          allDependencies.add(dep);
        }
      });
    });

    return Array.from(allDependencies);
  }

  private estimateGroupDuration(nodes: any[]): number {
    // Simple estimation based on node types
    // In a real implementation, this could be based on historical data
    const avgNodeDuration = 2000; // 2 seconds average
    const typeMultipliers: Record<string, number> = {
      'HTTP_REQUEST': 3,
      'WEBHOOK': 2,
      'EMAIL': 2,
      'CONDITION': 0.5,
      'DATA_TRANSFORM': 1,
      'CUSTOM': 2,
      'BLOCKCHAIN': 4
    };

    const totalDuration = nodes.reduce((sum, node) => {
      const nodeType = node.data?.type || node.type || 'CUSTOM';
      const multiplier = typeMultipliers[nodeType] || 1;
      return sum + (avgNodeDuration * multiplier);
    }, 0);

    return Math.max(totalDuration / nodes.length, avgNodeDuration); // Parallel execution time
  }

  private calculateEstimatedSpeedup(groups: ExecutionGroup[]): number {
    const sequentialTime = groups.reduce((sum, group) => {
      return sum + group.nodes.length * (group.estimatedDuration || 2000);
    }, 0);

    const parallelTime = groups.reduce((sum, group) => {
      return sum + (group.estimatedDuration || 2000);
    }, 0);

    return sequentialTime > 0 ? sequentialTime / parallelTime : 1;
  }
}