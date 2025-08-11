"use client";

import { useCallback } from "react";
import type { Node, Edge } from "@xyflow/react";
import { ErrorCodes } from "@/lib/utils/error-handler";
import { BlockType } from "@zzyra/types";

/**
 * Custom hook for comprehensive workflow validation with detailed error reporting
 */
export function useWorkflowValidation() {
  /**
   * Validates a workflow with detailed error messages
   */
  const validateWorkflow = useCallback(
    (
      nodes: Node[],
      edges: Edge[]
    ): { valid: boolean; message?: string; issues?: any[] } => {
      const issues: any[] = [];

      // Check if workflow has nodes
      if (nodes.length === 0) {
        return {
          valid: false,
          message: "Workflow is empty. Please add some blocks first.",
          issues: [
            {
              type: ErrorCodes.VALIDATION.INVALID_WORKFLOW,
              detail: "empty_workflow",
            },
          ],
        };
      }

      // Check for unconfigured nodes
      const unconfiguredNodes = nodes.filter(
        (node) =>
          node.type === "custom" &&
          (!node.data.config || Object.keys(node.data.config).length === 0)
      );

      if (unconfiguredNodes.length > 0) {
        issues.push({
          type: ErrorCodes.VALIDATION.MISSING_CONFIG,
          detail: "unconfigured_nodes",
          nodes: unconfiguredNodes.map((n) => ({
            id: n.id,
            label: n.data.label,
          })),
        });

        return {
          valid: false,
          message: `Node${unconfiguredNodes.length > 1 ? "s" : ""} "${unconfiguredNodes
            .map((n) => n.data.label)
            .join('", "')}" ${
            unconfiguredNodes.length > 1 ? "are" : "is"
          } missing required configuration.`,
          issues,
        };
      }

      // Check webhook nodes for URLs
      const invalidWebhookNodes = nodes.filter(
        (node) =>
          node.data.blockType === BlockType.WEBHOOK &&
          (!node.data.config?.url || !node.data.config.url.trim())
      );

      if (invalidWebhookNodes.length > 0) {
        issues.push({
          type: ErrorCodes.VALIDATION.MISSING_CONFIG,
          detail: "webhook_missing_url",
          nodes: invalidWebhookNodes.map((n) => ({
            id: n.id,
            label: n.data.label,
          })),
        });

        return {
          valid: false,
          message: `Webhook node${invalidWebhookNodes.length > 1 ? "s" : ""} "${invalidWebhookNodes
            .map((n) => n.data.label)
            .join(
              '", "'
            )}" require${invalidWebhookNodes.length > 1 ? "" : "s"} a URL.`,
          issues,
        };
      }

      // Check for disconnected nodes
      if (nodes.length > 1) {
        const connectedNodeIds = new Set<string>();

        edges.forEach((edge) => {
          connectedNodeIds.add(edge.source);
          connectedNodeIds.add(edge.target);
        });

        const disconnectedNodes = nodes.filter(
          (node) => !connectedNodeIds.has(node.id)
        );

        if (disconnectedNodes.length > 0) {
          issues.push({
            type: ErrorCodes.VALIDATION.DISCONNECTED_NODES,
            detail: "disconnected_nodes",
            nodes: disconnectedNodes.map((n) => ({
              id: n.id,
              label: n.data.label,
            })),
          });

          return {
            valid: false,
            message: `Disconnected node${disconnectedNodes.length > 1 ? "s" : ""} detected: ${disconnectedNodes
              .map((n) => n.data.label)
              .join(", ")}. Connect all nodes to create a valid workflow.`,
            issues,
          };
        }
      }

      // Validate workflow structure - ensure there's exactly one starting node and no cycles
      const startingNodes = nodes.filter((node) => {
        const incomingEdges = edges.filter((edge) => edge.target === node.id);
        return incomingEdges.length === 0;
      });

      if (startingNodes.length === 0) {
        issues.push({
          type: ErrorCodes.VALIDATION.INVALID_WORKFLOW,
          detail: "no_starting_node",
        });

        return {
          valid: false,
          message:
            "Workflow must have a starting node (a node with no incoming connections).",
          issues,
        };
      }

      if (startingNodes.length > 1) {
        issues.push({
          type: ErrorCodes.VALIDATION.INVALID_WORKFLOW,
          detail: "multiple_starting_nodes",
          nodes: startingNodes.map((n) => ({ id: n.id, label: n.data.label })),
        });

        return {
          valid: false,
          message: `Multiple starting nodes detected: ${startingNodes
            .map((n) => n.data.label)
            .join(", ")}. Workflow must have exactly one starting point.`,
          issues,
        };
      }

      // Check for cycles in the workflow
      const hasCycle = checkForCycles(nodes, edges);
      if (hasCycle) {
        issues.push({
          type: ErrorCodes.VALIDATION.INVALID_WORKFLOW,
          detail: "cycle_detected",
        });

        return {
          valid: false,
          message:
            "Cyclic dependency detected in workflow. Remove loops to create a valid workflow.",
          issues,
        };
      }

      return { valid: true };
    },
    []
  );

  /**
   * Helper function to check for cycles in the workflow graph
   */
  const checkForCycles = useCallback(
    (nodes: Node[], edges: Edge[]): boolean => {
      // Create adjacency list
      const adjacencyList = new Map<string, string[]>();

      nodes.forEach((node) => {
        adjacencyList.set(node.id, []);
      });

      edges.forEach((edge) => {
        const adjacentNodes = adjacencyList.get(edge.source) || [];
        adjacentNodes.push(edge.target);
        adjacencyList.set(edge.source, adjacentNodes);
      });

      // Track visited nodes
      const visited = new Set<string>();
      const recursionStack = new Set<string>();

      function dfs(nodeId: string): boolean {
        // If node is in recursion stack, we found a cycle
        if (recursionStack.has(nodeId)) {
          return true;
        }

        // If already processed in another branch, no need to process again
        if (visited.has(nodeId)) {
          return false;
        }

        // Mark as visited and add to recursion stack
        visited.add(nodeId);
        recursionStack.add(nodeId);

        // Visit all adjacent nodes
        const adjacentNodes = adjacencyList.get(nodeId) || [];
        for (const adjacent of adjacentNodes) {
          if (dfs(adjacent)) {
            return true;
          }
        }

        // Remove from recursion stack as we backtrack
        recursionStack.delete(nodeId);
        return false;
      }

      // Try starting DFS from each node
      for (const node of nodes) {
        if (!visited.has(node.id) && dfs(node.id)) {
          return true;
        }
      }

      return false;
    },
    []
  );

  return { validateWorkflow };
}
