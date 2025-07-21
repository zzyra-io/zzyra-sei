import { Injectable, Logger } from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";

interface WorkflowVersion {
  id: string;
  workflowId: string;
  version: number;
  name: string;
  description?: string;
  nodes: unknown[];
  edges: unknown[];
  metadata: {
    createdBy: string;
    createdAt: Date;
    generationPrompt?: string;
    generationOptions?: Record<string, unknown>;
    validationResult?: unknown;
    parentVersionId?: string;
    tags?: string[];
  };
  status: 'draft' | 'active' | 'archived' | 'deprecated';
  checksums: {
    nodes: string;
    edges: string;
    full: string;
  };
}

interface VersionDiff {
  nodesAdded: unknown[];
  nodesRemoved: unknown[];
  nodesModified: Array<{
    before: unknown;
    after: unknown;
    changes: string[];
  }>;
  edgesAdded: unknown[];
  edgesRemoved: unknown[];
  edgesModified: Array<{
    before: unknown;
    after: unknown;
    changes: string[];
  }>;
  summary: {
    totalChanges: number;
    significantChanges: boolean;
    changeTypes: string[];
  };
}

export interface RollbackResult {
  success: boolean;
  rolledBackTo: WorkflowVersion;
  backup: WorkflowVersion;
  warnings?: string[];
}

@Injectable()
export class WorkflowVersioningService {
  private readonly logger = new Logger(WorkflowVersioningService.name);
  private versions = new Map<string, WorkflowVersion[]>(); // workflowId -> versions

  /**
   * Create a new version of a workflow
   */
  async createVersion(
    workflowId: string,
    nodes: unknown[],
    edges: unknown[],
    metadata: {
      createdBy: string;
      name?: string;
      description?: string;
      generationPrompt?: string;
      generationOptions?: Record<string, unknown>;
      validationResult?: unknown;
      parentVersionId?: string;
      tags?: string[];
    }
  ): Promise<WorkflowVersion> {
    const existingVersions = this.versions.get(workflowId) || [];
    const latestVersion = this.getLatestVersion(workflowId);
    const nextVersionNumber = latestVersion ? latestVersion.version + 1 : 1;

    // Generate checksums for integrity
    const checksums = this.generateChecksums(nodes, edges);

    // Check if this version already exists
    const existingVersion = existingVersions.find(v => 
      v.checksums.full === checksums.full
    );

    if (existingVersion) {
      this.logger.debug(`Version already exists for workflow ${workflowId}: ${existingVersion.id}`);
      return existingVersion;
    }

    const newVersion: WorkflowVersion = {
      id: `version_${uuidv4()}`,
      workflowId,
      version: nextVersionNumber,
      name: metadata.name || `Version ${nextVersionNumber}`,
      description: metadata.description,
      nodes: this.deepClone(nodes),
      edges: this.deepClone(edges),
      metadata: {
        createdBy: metadata.createdBy,
        createdAt: new Date(),
        generationPrompt: metadata.generationPrompt,
        generationOptions: metadata.generationOptions,
        validationResult: metadata.validationResult,
        parentVersionId: metadata.parentVersionId || latestVersion?.id,
        tags: metadata.tags || [],
      },
      status: nextVersionNumber === 1 ? 'active' : 'draft',
      checksums,
    };

    // Add version to storage
    const updatedVersions = [...existingVersions, newVersion];
    this.versions.set(workflowId, updatedVersions);

    this.logger.log(`Created version ${nextVersionNumber} for workflow ${workflowId}: ${newVersion.id}`);

    // Auto-archive old versions if we have too many
    await this.maintainVersionHistory(workflowId);

    return newVersion;
  }

  /**
   * Get a specific version
   */
  async getVersion(workflowId: string, versionId: string): Promise<WorkflowVersion | null> {
    const versions = this.versions.get(workflowId) || [];
    return versions.find(v => v.id === versionId) || null;
  }

  /**
   * Get version by number
   */
  async getVersionByNumber(workflowId: string, versionNumber: number): Promise<WorkflowVersion | null> {
    const versions = this.versions.get(workflowId) || [];
    return versions.find(v => v.version === versionNumber) || null;
  }

  /**
   * Get the latest version
   */
  getLatestVersion(workflowId: string): WorkflowVersion | null {
    const versions = this.versions.get(workflowId) || [];
    if (versions.length === 0) return null;

    return versions.reduce((latest, current) => 
      current.version > latest.version ? current : latest
    );
  }

  /**
   * Get the currently active version
   */
  async getActiveVersion(workflowId: string): Promise<WorkflowVersion | null> {
    const versions = this.versions.get(workflowId) || [];
    return versions.find(v => v.status === 'active') || null;
  }

  /**
   * Get all versions for a workflow
   */
  async getVersionHistory(
    workflowId: string,
    options: {
      includeArchived?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<WorkflowVersion[]> {
    let versions = this.versions.get(workflowId) || [];

    if (!options.includeArchived) {
      versions = versions.filter(v => v.status !== 'archived');
    }

    // Sort by version number descending
    versions.sort((a, b) => b.version - a.version);

    if (options.offset) {
      versions = versions.slice(options.offset);
    }

    if (options.limit) {
      versions = versions.slice(0, options.limit);
    }

    return versions;
  }

  /**
   * Compare two versions and get diff
   */
  async compareVersions(
    workflowId: string,
    fromVersionId: string,
    toVersionId: string
  ): Promise<VersionDiff | null> {
    const fromVersion = await this.getVersion(workflowId, fromVersionId);
    const toVersion = await this.getVersion(workflowId, toVersionId);

    if (!fromVersion || !toVersion) {
      return null;
    }

    return this.generateDiff(fromVersion, toVersion);
  }

  /**
   * Activate a specific version
   */
  async activateVersion(workflowId: string, versionId: string): Promise<{
    success: boolean;
    previousActive?: WorkflowVersion;
    newActive: WorkflowVersion;
  }> {
    const versions = this.versions.get(workflowId) || [];
    const targetVersion = versions.find(v => v.id === versionId);

    if (!targetVersion) {
      throw new Error(`Version ${versionId} not found for workflow ${workflowId}`);
    }

    const previousActive = versions.find(v => v.status === 'active');
    
    // Deactivate current active version
    if (previousActive) {
      previousActive.status = 'draft';
    }

    // Activate target version
    targetVersion.status = 'active';

    this.logger.log(`Activated version ${targetVersion.version} for workflow ${workflowId}`);

    return {
      success: true,
      previousActive,
      newActive: targetVersion,
    };
  }

  /**
   * Rollback to a previous version
   */
  async rollback(
    workflowId: string,
    targetVersionId: string,
    metadata: {
      performedBy: string;
      reason?: string;
      createBackup?: boolean;
    }
  ): Promise<RollbackResult> {
    const currentActive = await this.getActiveVersion(workflowId);
    const targetVersion = await this.getVersion(workflowId, targetVersionId);

    if (!targetVersion) {
      throw new Error(`Target version ${targetVersionId} not found`);
    }

    const warnings: string[] = [];

    // Create backup of current state if requested
    let backup: WorkflowVersion | undefined;
    if (metadata.createBackup && currentActive) {
      backup = await this.createVersion(
        workflowId,
        currentActive.nodes,
        currentActive.edges,
        {
          createdBy: metadata.performedBy,
          name: `Backup before rollback to v${targetVersion.version}`,
          description: `Automatic backup created before rollback. Reason: ${metadata.reason || 'No reason provided'}`,
          parentVersionId: currentActive.id,
          tags: ['backup', 'rollback'],
        }
      );
    }

    // Check for potential issues with rollback
    if (currentActive && targetVersion.version < currentActive.version - 5) {
      warnings.push('Rolling back more than 5 versions - potential compatibility issues');
    }

    // Perform rollback by activating the target version
    const activationResult = await this.activateVersion(workflowId, targetVersionId);

    this.logger.log(`Rolled back workflow ${workflowId} to version ${targetVersion.version}. Reason: ${metadata.reason || 'Not specified'}`);

    return {
      success: activationResult.success,
      rolledBackTo: activationResult.newActive,
      backup: backup!,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Archive old versions
   */
  async archiveVersion(workflowId: string, versionId: string): Promise<boolean> {
    const version = await this.getVersion(workflowId, versionId);
    
    if (!version) {
      return false;
    }

    if (version.status === 'active') {
      throw new Error('Cannot archive active version');
    }

    version.status = 'archived';
    this.logger.log(`Archived version ${version.version} for workflow ${workflowId}`);
    
    return true;
  }

  /**
   * Delete a version (permanent)
   */
  async deleteVersion(workflowId: string, versionId: string): Promise<boolean> {
    const versions = this.versions.get(workflowId) || [];
    const versionIndex = versions.findIndex(v => v.id === versionId);
    
    if (versionIndex === -1) {
      return false;
    }

    const version = versions[versionIndex];
    
    if (version.status === 'active') {
      throw new Error('Cannot delete active version');
    }

    versions.splice(versionIndex, 1);
    this.versions.set(workflowId, versions);
    
    this.logger.log(`Deleted version ${version.version} for workflow ${workflowId}`);
    
    return true;
  }

  /**
   * Get version statistics
   */
  async getVersionStats(workflowId: string): Promise<{
    totalVersions: number;
    activeVersion: number | null;
    oldestVersion: number | null;
    newestVersion: number | null;
    archivedCount: number;
    draftCount: number;
    averageTimeBetweenVersions: number; // in hours
  }> {
    const versions = this.versions.get(workflowId) || [];
    
    if (versions.length === 0) {
      return {
        totalVersions: 0,
        activeVersion: null,
        oldestVersion: null,
        newestVersion: null,
        archivedCount: 0,
        draftCount: 0,
        averageTimeBetweenVersions: 0,
      };
    }

    const activeVersion = versions.find(v => v.status === 'active');
    const archivedCount = versions.filter(v => v.status === 'archived').length;
    const draftCount = versions.filter(v => v.status === 'draft').length;
    
    const sortedVersions = versions.sort((a, b) => a.version - b.version);
    const oldestVersion = sortedVersions[0];
    const newestVersion = sortedVersions[sortedVersions.length - 1];

    // Calculate average time between versions
    let totalTimeDiff = 0;
    for (let i = 1; i < sortedVersions.length; i++) {
      const timeDiff = sortedVersions[i].metadata.createdAt.getTime() - 
                       sortedVersions[i - 1].metadata.createdAt.getTime();
      totalTimeDiff += timeDiff;
    }
    const averageTimeBetweenVersions = sortedVersions.length > 1 
      ? totalTimeDiff / (sortedVersions.length - 1) / (1000 * 60 * 60) // Convert to hours
      : 0;

    return {
      totalVersions: versions.length,
      activeVersion: activeVersion?.version || null,
      oldestVersion: oldestVersion.version,
      newestVersion: newestVersion.version,
      archivedCount,
      draftCount,
      averageTimeBetweenVersions,
    };
  }

  /**
   * Private helper methods
   */
  private generateChecksums(nodes: unknown[], edges: unknown[]): {
    nodes: string;
    edges: string;
    full: string;
  } {
    const nodesStr = JSON.stringify(nodes);
    const edgesStr = JSON.stringify(edges);
    const fullStr = nodesStr + edgesStr;

    return {
      nodes: this.simpleHash(nodesStr),
      edges: this.simpleHash(edgesStr),
      full: this.simpleHash(fullStr),
    };
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  private generateDiff(fromVersion: WorkflowVersion, toVersion: WorkflowVersion): VersionDiff {
    const fromNodes = fromVersion.nodes as any[];
    const toNodes = toVersion.nodes as any[];
    const fromEdges = fromVersion.edges as any[];
    const toEdges = toVersion.edges as any[];

    // Compare nodes
    const fromNodeIds = new Set(fromNodes.map(n => n.id));
    const toNodeIds = new Set(toNodes.map(n => n.id));

    const nodesAdded = toNodes.filter(n => !fromNodeIds.has(n.id));
    const nodesRemoved = fromNodes.filter(n => !toNodeIds.has(n.id));
    const nodesModified: any[] = [];

    // Find modified nodes
    for (const toNode of toNodes) {
      const fromNode = fromNodes.find(n => n.id === toNode.id);
      if (fromNode) {
        const changes = this.findNodeChanges(fromNode, toNode);
        if (changes.length > 0) {
          nodesModified.push({
            before: fromNode,
            after: toNode,
            changes,
          });
        }
      }
    }

    // Compare edges
    const fromEdgeIds = new Set(fromEdges.map(e => e.id));
    const toEdgeIds = new Set(toEdges.map(e => e.id));

    const edgesAdded = toEdges.filter(e => !fromEdgeIds.has(e.id));
    const edgesRemoved = fromEdges.filter(e => !toEdgeIds.has(e.id));
    const edgesModified: any[] = [];

    // Find modified edges
    for (const toEdge of toEdges) {
      const fromEdge = fromEdges.find(e => e.id === toEdge.id);
      if (fromEdge) {
        const changes = this.findEdgeChanges(fromEdge, toEdge);
        if (changes.length > 0) {
          edgesModified.push({
            before: fromEdge,
            after: toEdge,
            changes,
          });
        }
      }
    }

    const totalChanges = nodesAdded.length + nodesRemoved.length + nodesModified.length +
                        edgesAdded.length + edgesRemoved.length + edgesModified.length;

    const significantChanges = totalChanges > 5 || nodesRemoved.length > 0 || 
                              nodesModified.some(n => n.changes.includes('blockType'));

    const changeTypes: string[] = [];
    if (nodesAdded.length > 0) changeTypes.push('nodes_added');
    if (nodesRemoved.length > 0) changeTypes.push('nodes_removed');
    if (nodesModified.length > 0) changeTypes.push('nodes_modified');
    if (edgesAdded.length > 0) changeTypes.push('edges_added');
    if (edgesRemoved.length > 0) changeTypes.push('edges_removed');
    if (edgesModified.length > 0) changeTypes.push('edges_modified');

    return {
      nodesAdded,
      nodesRemoved,
      nodesModified,
      edgesAdded,
      edgesRemoved,
      edgesModified,
      summary: {
        totalChanges,
        significantChanges,
        changeTypes,
      },
    };
  }

  private findNodeChanges(fromNode: any, toNode: any): string[] {
    const changes: string[] = [];
    
    if (fromNode.data?.label !== toNode.data?.label) {
      changes.push('label');
    }
    
    if (fromNode.data?.blockType !== toNode.data?.blockType) {
      changes.push('blockType');
    }
    
    if (JSON.stringify(fromNode.data?.config) !== JSON.stringify(toNode.data?.config)) {
      changes.push('config');
    }
    
    if (JSON.stringify(fromNode.position) !== JSON.stringify(toNode.position)) {
      changes.push('position');
    }

    return changes;
  }

  private findEdgeChanges(fromEdge: any, toEdge: any): string[] {
    const changes: string[] = [];
    
    if (fromEdge.source !== toEdge.source) {
      changes.push('source');
    }
    
    if (fromEdge.target !== toEdge.target) {
      changes.push('target');
    }
    
    if (fromEdge.sourceHandle !== toEdge.sourceHandle) {
      changes.push('sourceHandle');
    }
    
    if (fromEdge.targetHandle !== toEdge.targetHandle) {
      changes.push('targetHandle');
    }

    return changes;
  }

  private async maintainVersionHistory(workflowId: string): Promise<void> {
    const versions = this.versions.get(workflowId) || [];
    const maxVersions = 50; // Keep max 50 versions
    const archiveThreshold = 20; // Archive older versions beyond this count

    if (versions.length > maxVersions) {
      // Sort by version number
      const sortedVersions = versions.sort((a, b) => b.version - a.version);
      
      // Keep the most recent versions, archive the rest
      for (let i = archiveThreshold; i < sortedVersions.length; i++) {
        const version = sortedVersions[i];
        if (version.status !== 'active') {
          version.status = 'archived';
        }
      }
      
      this.logger.log(`Auto-archived old versions for workflow ${workflowId}`);
    }
  }
}