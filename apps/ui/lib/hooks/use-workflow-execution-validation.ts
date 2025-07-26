"use client";

import { useCallback, useMemo } from "react";
import { Node, Edge } from "@xyflow/react";
import { BlockType, getEnhancedBlockSchema } from "@zyra/types";
import { useBlockValidation } from "./use-block-validation";
import { z } from "zod";

interface ValidationError {
  nodeId: string;
  field: string;
  message: string;
}

interface WorkflowValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

/**
 * Hook for validating entire workflow before execution
 * Prevents API calls when validation fails
 */
export function useWorkflowExecutionValidation() {
  // Validate a single node's configuration
  const validateNodeConfig = useCallback((node: Node): ValidationError[] => {
    const errors: ValidationError[] = [];

    // Get block type from node
    const blockType = node.data?.blockType || node.data?.type || node.type;
    if (!blockType) {
      errors.push({
        nodeId: node.id,
        field: "type",
        message: "Node missing block type",
      });
      return errors;
    }

    // Get enhanced schema for validation
    const enhancedSchema = getEnhancedBlockSchema(blockType as BlockType);
    if (!enhancedSchema) {
      // No schema available - assume valid for backward compatibility
      return errors;
    }

    // Validate configuration against schema
    try {
      enhancedSchema.configSchema.parse(node.data?.config || {});
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        error.issues.forEach((err: any) => {
          errors.push({
            nodeId: node.id,
            field: err.path?.join(".") || "config",
            message: err.message,
          });
        });
      } else {
        errors.push({
          nodeId: node.id,
          field: "config",
          message: error.message || "Configuration validation failed",
        });
      }
    }

    return errors;
  }, []);

  // Validate entire workflow
  const validateWorkflow = useCallback(
    (nodes: Node[], edges: Edge[]): WorkflowValidationResult => {
      const errors: ValidationError[] = [];
      const warnings: string[] = [];

      // Check if workflow has nodes
      if (nodes.length === 0) {
        errors.push({
          nodeId: "workflow",
          field: "nodes",
          message: "Workflow is empty. Please add some blocks first.",
        });
        return { isValid: false, errors, warnings };
      }

      // Validate each node's configuration
      nodes.forEach((node) => {
        const nodeErrors = validateNodeConfig(node);
        errors.push(...nodeErrors);
      });

      // Check for orphaned nodes (nodes without connections)
      const connectedNodeIds = new Set<string>();
      edges.forEach((edge) => {
        connectedNodeIds.add(edge.source);
        connectedNodeIds.add(edge.target);
      });

      const orphanedNodes = nodes.filter(
        (node) =>
          !connectedNodeIds.has(node.id) && node.data?.nodeType !== "trigger"
      );

      if (orphanedNodes.length > 0) {
        warnings.push(
          `Found ${orphanedNodes.length} unconnected node(s). These may not execute properly.`
        );
      }

      // Check for cycles in the workflow
      const hasCycles = checkForCycles(nodes, edges);
      if (hasCycles) {
        errors.push({
          nodeId: "workflow",
          field: "structure",
          message: "Workflow contains cycles which are not supported.",
        });
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    },
    [validateNodeConfig]
  );

  // Check if workflow can be executed (no validation errors)
  const canExecuteWorkflow = useCallback(
    (nodes: Node[], edges: Edge[]): boolean => {
      const validation = validateWorkflow(nodes, edges);
      return validation.isValid;
    },
    [validateWorkflow]
  );

  // Get validation errors for a specific node
  const getNodeErrors = useCallback(
    (nodeId: string, nodes: Node[], edges: Edge[]): ValidationError[] => {
      const validation = validateWorkflow(nodes, edges);
      return validation.errors.filter((error) => error.nodeId === nodeId);
    },
    [validateWorkflow]
  );

  // Get field-specific error for a node
  const getNodeFieldError = useCallback(
    (
      nodeId: string,
      fieldName: string,
      nodes: Node[],
      edges: Edge[]
    ): string | undefined => {
      const nodeErrors = getNodeErrors(nodeId, nodes, edges);
      const fieldError = nodeErrors.find((error) => error.field === fieldName);
      return fieldError?.message;
    },
    [getNodeErrors]
  );

  return {
    validateWorkflow,
    validateNodeConfig,
    canExecuteWorkflow,
    getNodeErrors,
    getNodeFieldError,
  };
}

/**
 * Check for cycles in the workflow graph
 */
function checkForCycles(nodes: Node[], edges: Edge[]): boolean {
  const graph = new Map<string, string[]>();

  // Build adjacency list
  nodes.forEach((node) => {
    graph.set(node.id, []);
  });

  edges.forEach((edge) => {
    const neighbors = graph.get(edge.source) || [];
    neighbors.push(edge.target);
    graph.set(edge.source, neighbors);
  });

  // DFS to detect cycles
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCycle(nodeId: string): boolean {
    if (recursionStack.has(nodeId)) {
      return true;
    }

    if (visited.has(nodeId)) {
      return false;
    }

    visited.add(nodeId);
    recursionStack.add(nodeId);

    const neighbors = graph.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (hasCycle(neighbor)) {
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  // Check each node for cycles
  for (const nodeId of graph.keys()) {
    if (!visited.has(nodeId)) {
      if (hasCycle(nodeId)) {
        return true;
      }
    }
  }

  return false;
}
