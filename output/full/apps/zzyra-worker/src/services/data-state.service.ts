import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from './database.service';

export interface DataState {
  id: string;
  executionId: string;
  nodeId: string;
  workflowId: string;
  data: any;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  metadata?: {
    dataSize: number;
    dataType: string;
    checksum?: string;
    tags?: string[];
  };
}

export interface DataStateSnapshot {
  id: string;
  executionId: string;
  snapshotTime: Date;
  nodeStates: Record<string, any>;
  globalState: Record<string, any>;
  metadata: {
    totalNodes: number;
    completedNodes: number;
    snapshotReason: 'manual' | 'checkpoint' | 'error' | 'pause';
  };
}

export interface DataCacheEntry {
  key: string;
  data: any;
  expiry: Date;
  hits: number;
  tags: string[];
  size: number;
}

export interface DataDependency {
  nodeId: string;
  dependsOn: string[];
  dataKeys: string[];
  lastUpdated: Date;
  isStale: boolean;
}

@Injectable()
export class DataStateService {
  private readonly logger = new Logger(DataStateService.name);

  // In-memory cache for frequently accessed data
  private dataCache = new Map<string, DataCacheEntry>();

  // Track data dependencies between nodes
  private dataDependencies = new Map<string, DataDependency>();

  // Track data versioning for rollback capability
  private dataVersions = new Map<string, DataState[]>();

  constructor(private readonly databaseService: DatabaseService) {
    // Clean up expired cache entries every 5 minutes
    setInterval(() => this.cleanupExpiredCache(), 5 * 60 * 1000);
  }

  /**
   * Save data state for a specific node in an execution
   */
  async saveDataState(
    executionId: string,
    nodeId: string,
    data: any,
    metadata?: { tags?: string[] },
  ): Promise<DataState> {
    const dataSize = JSON.stringify(data).length;
    const checksum = this.calculateChecksum(data);

    try {
      // Get workflow ID from execution
      const execution =
        await this.databaseService.executions.findById(executionId);
      if (!execution) {
        throw new Error(`Execution ${executionId} not found`);
      }

      // Create data state record
      const dataState: DataState = {
        id: `state-${executionId}-${nodeId}-${Date.now()}`,
        executionId,
        nodeId,
        workflowId: execution.workflowId,
        data,
        version: await this.getNextVersion(executionId, nodeId),
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          dataSize,
          dataType: this.detectDataType(data),
          checksum,
          tags: metadata?.tags || [],
        },
      };

      // Ensure NodeExecution exists before creating NodeOutput with proper atomic operation
      const currentTimestamp = new Date();
      await this.databaseService.prisma.$transaction(async (tx) => {
        // Use upsert with proper error handling for race conditions
        await tx.nodeExecution.upsert({
          where: {
            executionId_nodeId: {
              executionId: dataState.executionId,
              nodeId: dataState.nodeId,
            },
          },
          create: {
            executionId: dataState.executionId,
            nodeId: dataState.nodeId,
            status: 'running',
            startedAt: currentTimestamp,
            updatedAt: currentTimestamp,
          },
          update: {
            // Update timestamp and ensure status progression is valid
            updatedAt: currentTimestamp,
            // Only update completedAt if status is completed/failed
            ...(dataState.metadata?.tags?.includes('completed') && {
              completedAt: currentTimestamp,
              status: 'completed',
            }),
          },
        });
      });

      // Store in database using existing NodeOutput table for now
      await this.databaseService.prisma.nodeOutput.create({
        data: {
          executionId: dataState.executionId,
          nodeId: dataState.nodeId,
          outputData: {
            ...dataState.data,
            _metadata: dataState.metadata,
            _version: dataState.version,
          },
        },
      });

      // Update version history
      this.updateVersionHistory(executionId, nodeId, dataState);

      // Cache frequently accessed data
      await this.cacheData(`${executionId}:${nodeId}`, data, metadata?.tags);

      this.logger.log(
        `Saved data state for node ${nodeId} in execution ${executionId}`,
      );
      return dataState;
    } catch (error) {
      this.logger.error(`Failed to save data state:`, error);
      throw error;
    }
  }

  /**
   * Get data state for a specific node
   */
  async getDataState(
    executionId: string,
    nodeId: string,
    version?: number,
  ): Promise<DataState | null> {
    const cacheKey = `${executionId}:${nodeId}`;

    // Check cache first
    if (!version) {
      const cached = this.dataCache.get(cacheKey);
      if (cached && cached.expiry > new Date()) {
        cached.hits++;
        return {
          id: `cached-${cacheKey}`,
          executionId,
          nodeId,
          workflowId: 'unknown',
          data: cached.data,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }
    }

    try {
      // Query database using NodeOutput table
      const nodeOutput = await this.databaseService.prisma.nodeOutput.findFirst(
        {
          where: {
            executionId,
            nodeId,
          },
          orderBy: { createdAt: 'desc' },
        },
      );

      if (!nodeOutput || !nodeOutput.outputData) {
        return null;
      }

      const outputData = nodeOutput.outputData as any;
      const metadata = outputData._metadata || {};
      const dataVersion = outputData._version || 1;

      // Remove metadata from data
      const { _metadata, _version, ...data } = outputData;

      const result: DataState = {
        id: nodeOutput.id,
        executionId: nodeOutput.executionId,
        nodeId: nodeOutput.nodeId,
        workflowId: 'unknown', // Would need to fetch from execution
        data,
        version: dataVersion,
        createdAt: nodeOutput.createdAt || new Date(),
        updatedAt: nodeOutput.createdAt || new Date(),
        metadata,
      };

      // Update cache
      if (!version) {
        await this.cacheData(cacheKey, result.data);
      }

      return result;
    } catch (error) {
      this.logger.error(`Failed to get data state:`, error);
      return null;
    }
  }

  /**
   * Get all data states for an execution
   */
  async getExecutionDataStates(
    executionId: string,
  ): Promise<Record<string, DataState>> {
    try {
      // First, get the execution to retrieve workflowId
      const execution =
        await this.databaseService.executions.findById(executionId);
      const workflowId = execution?.workflowId || 'unknown';

      // Get node outputs with proper ordering for latest versions
      const nodeOutputs = await this.databaseService.prisma.nodeOutput.findMany(
        {
          where: { executionId },
          orderBy: [{ nodeId: 'asc' }, { createdAt: 'desc' }],
        },
      );

      // Use Map for better performance and data integrity
      const nodeDataMap = new Map<string, DataState>();

      for (const nodeOutput of nodeOutputs) {
        // Skip if we already have a more recent version for this node
        if (nodeDataMap.has(nodeOutput.nodeId)) {
          continue;
        }

        try {
          const outputData = nodeOutput.outputData as any;

          // Ensure outputData exists and is valid
          if (!outputData || typeof outputData !== 'object') {
            this.logger.warn(
              `Invalid output data for node ${nodeOutput.nodeId} in execution ${executionId}`,
            );
            continue;
          }

          const metadata = outputData._metadata || {};
          const dataVersion =
            typeof outputData._version === 'number' ? outputData._version : 1;

          // Safely extract data, preserving null/undefined values
          const { _metadata, _version, ...data } = outputData;

          // Validate critical data integrity
          const dataState: DataState = {
            id: nodeOutput.id,
            executionId: nodeOutput.executionId,
            nodeId: nodeOutput.nodeId,
            workflowId,
            data: data || {},
            version: dataVersion,
            createdAt: nodeOutput.createdAt || new Date(),
            updatedAt: nodeOutput.createdAt || new Date(),
            metadata: {
              dataSize: metadata.dataSize || JSON.stringify(data).length,
              dataType: metadata.dataType || this.detectDataType(data),
              checksum: metadata.checksum || this.calculateChecksum(data),
              tags: Array.isArray(metadata.tags) ? metadata.tags : [],
            },
          };

          nodeDataMap.set(nodeOutput.nodeId, dataState);
        } catch (nodeError) {
          this.logger.error(
            `Failed to process node output ${nodeOutput.id}:`,
            nodeError,
          );
          // Continue processing other nodes
        }
      }

      // Convert Map to Record for return value
      const result: Record<string, DataState> = {};
      for (const [nodeId, dataState] of nodeDataMap.entries()) {
        result[nodeId] = dataState;
      }

      this.logger.debug(
        `Retrieved ${Object.keys(result).length} node data states for execution ${executionId}`,
      );
      return result;
    } catch (error) {
      this.logger.error(`Failed to get execution data states:`, error);
      return {};
    }
  }

  /**
   * Create a snapshot of the entire execution state
   */
  async createSnapshot(
    executionId: string,
    reason: 'manual' | 'checkpoint' | 'error' | 'pause' = 'manual',
  ): Promise<DataStateSnapshot> {
    try {
      const nodeStates = await this.getExecutionDataStates(executionId);
      const globalState = await this.getGlobalExecutionData(executionId);

      const snapshot: DataStateSnapshot = {
        id: `snapshot-${executionId}-${Date.now()}`,
        executionId,
        snapshotTime: new Date(),
        nodeStates: Object.fromEntries(
          Object.entries(nodeStates).map(([nodeId, state]) => [
            nodeId,
            state.data,
          ]),
        ),
        globalState,
        metadata: {
          totalNodes: Object.keys(nodeStates).length,
          completedNodes: Object.values(nodeStates).filter(
            (s) => s.data !== null,
          ).length,
          snapshotReason: reason,
        },
      };

      // Store snapshot in database using WorkflowStateSnapshot
      await this.databaseService.prisma.workflowStateSnapshot.create({
        data: {
          id: snapshot.id,
          executionId: snapshot.executionId,
          workflowId: 'unknown', // Will be fetched separately
          snapshotType: reason,
          state: snapshot.globalState || {},
          nodeStates: snapshot.nodeStates || {},
          context: snapshot.metadata,
        },
      });

      this.logger.log(
        `Created snapshot ${snapshot.id} for execution ${executionId}`,
      );
      return snapshot;
    } catch (error) {
      this.logger.error(`Failed to create snapshot:`, error);
      throw error;
    }
  }

  /**
   * Restore execution from snapshot
   */
  async restoreFromSnapshot(snapshotId: string): Promise<boolean> {
    try {
      const snapshot =
        await this.databaseService.prisma.workflowStateSnapshot.findUnique({
          where: { id: snapshotId },
        });

      if (!snapshot) {
        throw new Error(`Snapshot ${snapshotId} not found`);
      }

      // Restore node states
      const nodeStates = snapshot.nodeStates as Record<string, any>;
      for (const [nodeId, data] of Object.entries(nodeStates || {})) {
        await this.saveDataState(snapshot.executionId, nodeId, data, {
          tags: ['restored', 'snapshot'],
        });
      }

      // Restore global state
      const globalState = snapshot.state as Record<string, any>;
      await this.saveGlobalExecutionData(
        snapshot.executionId,
        globalState || {},
      );

      this.logger.log(
        `Restored execution ${snapshot.executionId} from snapshot ${snapshotId}`,
      );
      return true;
    } catch (error) {
      this.logger.error(`Failed to restore from snapshot:`, error);
      return false;
    }
  }

  /**
   * Track data dependencies between nodes
   */
  async trackDataDependency(
    nodeId: string,
    dependsOn: string[],
    dataKeys: string[] = [],
  ): Promise<void> {
    const dependency: DataDependency = {
      nodeId,
      dependsOn,
      dataKeys,
      lastUpdated: new Date(),
      isStale: false,
    };

    this.dataDependencies.set(nodeId, dependency);

    this.logger.debug(
      `Tracked data dependency for node ${nodeId}: depends on [${dependsOn.join(', ')}]`,
    );
  }

  /**
   * Check if data is stale based on dependencies
   */
  async checkDataFreshness(
    nodeId: string,
  ): Promise<{ isFresh: boolean; staleDependencies: string[] }> {
    const dependency = this.dataDependencies.get(nodeId);
    if (!dependency) {
      return { isFresh: true, staleDependencies: [] };
    }

    const staleDependencies: string[] = [];

    for (const depNodeId of dependency.dependsOn) {
      const depState = this.dataDependencies.get(depNodeId);
      if (depState && depState.lastUpdated > dependency.lastUpdated) {
        staleDependencies.push(depNodeId);
      }
    }

    const isFresh = staleDependencies.length === 0;

    if (!isFresh) {
      dependency.isStale = true;
      this.logger.warn(
        `Data for node ${nodeId} is stale due to dependencies: [${staleDependencies.join(', ')}]`,
      );
    }

    return { isFresh, staleDependencies };
  }

  /**
   * Cache data for faster access
   */
  private async cacheData(
    key: string,
    data: any,
    tags: string[] = [],
  ): Promise<void> {
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 30); // 30 minutes cache

    const cacheEntry: DataCacheEntry = {
      key,
      data,
      expiry,
      hits: 1,
      tags,
      size: JSON.stringify(data).length,
    };

    this.dataCache.set(key, cacheEntry);

    // Limit cache size to 1000 entries
    if (this.dataCache.size > 1000) {
      const oldestKey = Array.from(this.dataCache.keys())[0];
      this.dataCache.delete(oldestKey);
    }
  }

  /**
   * Get cached data
   */
  getCachedData(key: string): any | null {
    const cached = this.dataCache.get(key);
    if (!cached || cached.expiry <= new Date()) {
      return null;
    }

    cached.hits++;
    return cached.data;
  }

  /**
   * Invalidate cache by tags
   */
  invalidateCache(tags: string[]): void {
    for (const [key, entry] of this.dataCache.entries()) {
      const hasMatchingTag = entry.tags.some((tag) => tags.includes(tag));
      if (hasMatchingTag) {
        this.dataCache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalEntries: number;
    totalSize: number;
    totalHits: number;
    hitRate: number;
  } {
    const entries = Array.from(this.dataCache.values());
    const totalEntries = entries.length;
    const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
    const totalHits = entries.reduce((sum, entry) => sum + entry.hits, 0);
    const hitRate = totalEntries > 0 ? totalHits / totalEntries : 0;

    return { totalEntries, totalSize, totalHits, hitRate };
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpiredCache(): void {
    const now = new Date();
    const expired: string[] = [];

    for (const [key, entry] of this.dataCache.entries()) {
      if (entry.expiry <= now) {
        expired.push(key);
      }
    }

    expired.forEach((key) => this.dataCache.delete(key));

    if (expired.length > 0) {
      this.logger.log(`Cleaned up ${expired.length} expired cache entries`);
    }
  }

  /**
   * Get next version number for data state
   */
  private async getNextVersion(
    executionId: string,
    nodeId: string,
  ): Promise<number> {
    try {
      const outputs = await this.databaseService.prisma.nodeOutput.findMany({
        where: { executionId, nodeId },
        orderBy: { createdAt: 'desc' },
        take: 1,
      });

      if (outputs.length > 0) {
        const outputData = outputs[0].outputData as any;
        return (outputData?._version || 0) + 1;
      }

      return 1;
    } catch (error) {
      this.logger.warn(`Failed to get next version, defaulting to 1:`, error);
      return 1;
    }
  }

  /**
   * Update version history in memory
   */
  private updateVersionHistory(
    executionId: string,
    nodeId: string,
    dataState: DataState,
  ): void {
    const key = `${executionId}:${nodeId}`;
    const versions = this.dataVersions.get(key) || [];
    versions.push(dataState);

    // Keep only last 10 versions in memory
    if (versions.length > 10) {
      versions.splice(0, versions.length - 10);
    }

    this.dataVersions.set(key, versions);
  }

  /**
   * Detect data type for metadata
   */
  private detectDataType(data: any): string {
    if (data === null) return 'null';
    if (Array.isArray(data)) return 'array';
    if (typeof data === 'object') return 'object';
    return typeof data;
  }

  /**
   * Calculate simple checksum for data integrity
   */
  private calculateChecksum(data: any): string {
    const jsonString = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Get global execution data (shared across all nodes)
   */
  private async getGlobalExecutionData(
    executionId: string,
  ): Promise<Record<string, any>> {
    try {
      const execution =
        await this.databaseService.executions.findById(executionId);
      return (execution?.metadata as Record<string, any>) || {};
    } catch (error) {
      this.logger.error(`Failed to get global execution data:`, error);
      return {};
    }
  }

  /**
   * Save global execution data
   */
  private async saveGlobalExecutionData(
    executionId: string,
    data: Record<string, any>,
  ): Promise<void> {
    try {
      await this.databaseService.prisma.workflowExecution.update({
        where: { id: executionId },
        data: { metadata: data },
      });
    } catch (error) {
      this.logger.error(`Failed to save global execution data:`, error);
    }
  }
}
