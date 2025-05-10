"use client";

import { Node, Edge } from "@xyflow/react";
import { WorkflowError, ErrorCodes, withRetry } from "@/lib/utils/error-handler";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  nodes: Node[];
  edges: Edge[];
  is_public: boolean;
  tags: string[];
  created_at?: string;
  updated_at?: string;
  user_id?: string;
}

export interface CreateWorkflowParams {
  name: string;
  description?: string;
  nodes: Node[];
  edges: Edge[];
  is_public: boolean;
  tags: string[];
}

export interface UpdateWorkflowParams extends CreateWorkflowParams {
  id?: string;
}

/**
 * Optimized workflow service with better error handling, 
 * retry mechanisms, and performance tracking
 */
class OptimizedWorkflowService {
  private supabase;
  private requestCache = new Map<string, { data: any; timestamp: number }>();
  private cacheTTL = 30000; // 30 seconds cache TTL
  
  constructor() {
    this.supabase = createClientComponentClient();
  }

  /**
   * Get all workflows for the current user with optimized caching
   */
  async getWorkflows(): Promise<Workflow[]> {
    const cacheKey = 'all_workflows';
    const cached = this.requestCache.get(cacheKey);
    
    // Return cached data if valid
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }
    
    try {
      // Use the retry utility for resilience
      const { data, error } = await withRetry(
        async () => await this.supabase
          .from('workflows')
          .select('*')
          .order('updated_at', { ascending: false }),
        { 
          retries: 3,
          initialDelay: 300,
          maxDelay: 3000,
          onRetry: (attempt) => {
            console.info(`Retrying getWorkflows (attempt ${attempt}/3)...`);
          }
        }
      );

      if (error) {
        throw new WorkflowError(
          `Failed to get workflows: ${error.message}`,
          ErrorCodes.API.LOAD_FAILED,
          { error },
          true
        );
      }
      
      // Cache the result
      this.requestCache.set(cacheKey, { 
        data: data || [], 
        timestamp: Date.now() 
      });
      
      return data || [];
    } catch (error) {
      console.error("Error in getWorkflows:", error);
      
      // If it's already a WorkflowError, rethrow it
      if (error instanceof WorkflowError) {
        throw error;
      }
      
      // Otherwise wrap it
      throw new WorkflowError(
        "Failed to get workflows",
        ErrorCodes.API.LOAD_FAILED,
        { error },
        true
      );
    }
  }

  /**
   * Get a specific workflow by ID with optimized error handling
   */
  async getWorkflow(id: string): Promise<Workflow | null> {
    const cacheKey = `workflow_${id}`;
    const cached = this.requestCache.get(cacheKey);
    
    // Return cached data if valid
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }
    
    try {
      const { data, error } = await withRetry(
        async () => await this.supabase
          .from('workflows')
          .select('*')
          .eq('id', id)
          .single(),
        { retries: 3 }
      );

      if (error) {
        if (error.code === 'PGRST116') {
          throw new WorkflowError(
            "Workflow not found",
            ErrorCodes.API.LOAD_FAILED,
            { workflowId: id },
            true
          );
        }
        
        throw new WorkflowError(
          `Failed to get workflow: ${error.message}`,
          ErrorCodes.API.LOAD_FAILED,
          { error, workflowId: id },
          true
        );
      }
      
      // Cache the result
      this.requestCache.set(cacheKey, { 
        data: data || null, 
        timestamp: Date.now() 
      });
      
      return data;
    } catch (error) {
      console.error(`Error in getWorkflow(${id}):`, error);
      
      // If it's already a WorkflowError, rethrow it
      if (error instanceof WorkflowError) {
        throw error;
      }
      
      // Otherwise wrap it
      throw new WorkflowError(
        "Failed to get workflow",
        ErrorCodes.API.LOAD_FAILED,
        { error, workflowId: id },
        true
      );
    }
  }

  /**
   * Create a new workflow with optimistic updates
   */
  async createWorkflow(params: CreateWorkflowParams): Promise<Workflow | null> {
    try {
      // Prepare data for saving
      const { name, description, nodes, edges, is_public, tags } = params;
      
      // Clean up data before saving
      const cleanedNodes = this.sanitizeNodesForStorage(nodes);
      const cleanedEdges = this.sanitizeEdgesForStorage(edges);
      
      // Attempt to create workflow
      const { data, error } = await withRetry(
        async () => await this.supabase
          .from('workflows')
          .insert([
            {
              name,
              description,
              nodes: cleanedNodes,
              edges: cleanedEdges,
              is_public,
              tags
            }
          ])
          .select()
          .single(),
        { retries: 2 }
      );

      if (error) {
        throw new WorkflowError(
          `Failed to create workflow: ${error.message}`,
          ErrorCodes.API.SAVE_FAILED,
          { error, params },
          true
        );
      }
      
      // Clear workflow list cache since we added a new one
      this.requestCache.delete('all_workflows');
      
      return data;
    } catch (error) {
      console.error("Error in createWorkflow:", error);
      
      // If it's already a WorkflowError, rethrow it
      if (error instanceof WorkflowError) {
        throw error;
      }
      
      // Otherwise wrap it
      throw new WorkflowError(
        "Failed to create workflow",
        ErrorCodes.API.SAVE_FAILED,
        { error, params },
        true
      );
    }
  }

  /**
   * Update an existing workflow with optimized error handling
   */
  async updateWorkflow(id: string, params: UpdateWorkflowParams): Promise<Workflow | null> {
    try {
      // Prepare data for saving
      const { name, description, nodes, edges, is_public, tags } = params;
      
      // Clean up data before saving
      const cleanedNodes = this.sanitizeNodesForStorage(nodes);
      const cleanedEdges = this.sanitizeEdgesForStorage(edges);
      
      // Attempt to update workflow
      const { data, error } = await withRetry(
        async () => await this.supabase
          .from('workflows')
          .update({
            name,
            description,
            nodes: cleanedNodes,
            edges: cleanedEdges,
            is_public,
            tags,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select()
          .single(),
        { 
          retries: 3,
          initialDelay: 300,
          onRetry: (attempt, error) => {
            console.info(`Retrying updateWorkflow (attempt ${attempt}/3):`, error);
          }
        }
      );

      if (error) {
        throw new WorkflowError(
          `Failed to update workflow: ${error.message}`,
          ErrorCodes.API.SAVE_FAILED,
          { error, workflowId: id, params },
          true
        );
      }
      
      // Clear caches for this workflow and the list
      this.requestCache.delete(`workflow_${id}`);
      this.requestCache.delete('all_workflows');
      
      return data;
    } catch (error) {
      console.error(`Error in updateWorkflow(${id}):`, error);
      
      // If it's already a WorkflowError, rethrow it
      if (error instanceof WorkflowError) {
        throw error;
      }
      
      // Otherwise wrap it
      throw new WorkflowError(
        "Failed to update workflow",
        ErrorCodes.API.SAVE_FAILED,
        { error, workflowId: id, params },
        true
      );
    }
  }

  /**
   * Delete a workflow with confirmation and error handling
   */
  async deleteWorkflow(id: string): Promise<void> {
    try {
      const { error } = await withRetry(
        async () => await this.supabase
          .from('workflows')
          .delete()
          .eq('id', id),
        { retries: 2 }
      );

      if (error) {
        throw new WorkflowError(
          `Failed to delete workflow: ${error.message}`,
          ErrorCodes.API.SAVE_FAILED,
          { error, workflowId: id },
          true
        );
      }
      
      // Clear caches for this workflow and the list
      this.requestCache.delete(`workflow_${id}`);
      this.requestCache.delete('all_workflows');
    } catch (error) {
      console.error(`Error in deleteWorkflow(${id}):`, error);
      
      // If it's already a WorkflowError, rethrow it
      if (error instanceof WorkflowError) {
        throw error;
      }
      
      // Otherwise wrap it
      throw new WorkflowError(
        "Failed to delete workflow",
        ErrorCodes.API.SAVE_FAILED,
        { error, workflowId: id },
        false
      );
    }
  }

  /**
   * Execute a workflow with proper error handling and monitoring
   */
  async executeWorkflow(id: string): Promise<string | null> {
    try {
      // Start performance monitoring
      const startTime = performance.now();

      // Attempt to execute workflow
      const { data, error } = await withRetry(
        async () => await this.supabase
          .from('workflow_executions')
          .insert([{ workflow_id: id, status: 'queued' }])
          .select()
          .single(),
        { 
          retries: 3,
          initialDelay: 500,
          maxDelay: 5000
        }
      );

      if (error) {
        throw new WorkflowError(
          `Failed to execute workflow: ${error.message}`,
          ErrorCodes.API.EXECUTION_FAILED,
          { error, workflowId: id },
          true
        );
      }

      // Log execution performance
      const duration = performance.now() - startTime;
      console.info(`Workflow execution queued in ${duration.toFixed(2)}ms`);
      
      return data?.id || null;
    } catch (error) {
      console.error(`Error in executeWorkflow(${id}):`, error);
      
      // If it's already a WorkflowError, rethrow it
      if (error instanceof WorkflowError) {
        throw error;
      }
      
      // Otherwise wrap it
      throw new WorkflowError(
        "Failed to execute workflow",
        ErrorCodes.API.EXECUTION_FAILED,
        { error, workflowId: id },
        true
      );
    }
  }

  /**
   * Clean nodes before saving to database to avoid excessive data
   */
  private sanitizeNodesForStorage(nodes: Node[]): any[] {
    return nodes.map(node => {
      // Create a deep clone to avoid reference issues
      const sanitizedNode = JSON.parse(JSON.stringify(node));
      
      // Remove ReactFlow-specific properties that shouldn't be persisted
      delete sanitizedNode.__rf;
      
      // Remove any circular references or functions
      return this.removeCircularReferences(sanitizedNode);
    });
  }

  /**
   * Clean edges before saving to database
   */
  private sanitizeEdgesForStorage(edges: Edge[]): any[] {
    return edges.map(edge => {
      // Create a deep clone to avoid reference issues
      const sanitizedEdge = JSON.parse(JSON.stringify(edge));
      
      // Remove ReactFlow-specific properties
      delete sanitizedEdge.__rf;
      
      // Remove any circular references or functions
      return this.removeCircularReferences(sanitizedEdge);
    });
  }

  /**
   * Utility to prevent circular references that cause JSON errors
   */
  private removeCircularReferences(obj: any, seen = new WeakSet()): any {
    // Handle primitive types
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    // Detect circular references
    if (seen.has(obj)) {
      return '[Circular Reference]';
    }
    
    // Add object to seen set
    seen.add(obj);
    
    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map(item => this.removeCircularReferences(item, seen));
    }
    
    // Handle objects
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip functions
      if (typeof value === 'function') {
        continue;
      }
      
      result[key] = this.removeCircularReferences(value, seen);
    }
    
    return result;
  }

  /**
   * Clear service cache
   */
  clearCache(): void {
    this.requestCache.clear();
  }
}

// Export as singleton for consistent access across components
export const optimizedWorkflowService = new OptimizedWorkflowService();
