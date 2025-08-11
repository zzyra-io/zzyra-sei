"use client";

import { useCallback } from "react";
import { Node, Edge } from "@xyflow/react";
import { BlockType } from "@/types/workflow";
import { BlockType } from '@zzyra/types';


/**
 * Custom hook for workflow validation logic
 * Extracted from BuilderPage for better maintainability and reuse
 */
export function useWorkflowValidator() {
  /**
   * Validates a workflow with detailed error reporting
   */
  const validateWorkflow = useCallback(
    (nodes: Node[], edges: Edge[]): { valid: boolean; message?: string } => {
      // Check if workflow has nodes
      if (nodes.length === 0) {
        return {
          valid: false,
          message: "Workflow is empty. Please add some blocks first.",
        };
      }

      // Check for unconfigured nodes
      const unconfiguredNodes = nodes.filter(
        (node) => node.type === "custom" && (!node.data.config || Object.keys(node.data.config).length === 0)
      );

      if (unconfiguredNodes.length > 0) {
        return {
          valid: false,
          message: `Node${unconfiguredNodes.length > 1 ? "s" : ""} "${unconfiguredNodes
            .map((n) => n.data.label)
            .join('", "')}" ${
            unconfiguredNodes.length > 1 ? "are" : "is"
          } missing required configuration.`,
        };
      }

      // Check webhook nodes for URLs
      const invalidWebhookNodes = nodes.filter(
        (node) =>
          node.data.blockType === BlockType.WEBHOOK &&
          (!node.data.config?.url || !node.data.config.url.trim())
      );

      if (invalidWebhookNodes.length > 0) {
        return {
          valid: false,
          message: `Webhook node${invalidWebhookNodes.length > 1 ? "s" : ""} "${invalidWebhookNodes
            .map((n) => n.data.label)
            .join('", "')}" require${invalidWebhookNodes.length > 1 ? "" : "s"} a URL.`,
        };
      }

      // Check for disconnected nodes
      if (nodes.length > 1) {
        const connectedNodeIds = new Set<string>();

        edges.forEach((edge) => {
          connectedNodeIds.add(edge.source);
          connectedNodeIds.add(edge.target);
        });

        const disconnectedNodes = nodes.filter((node) => !connectedNodeIds.has(node.id));

        if (disconnectedNodes.length > 0) {
          return {
            valid: false,
            message: `Disconnected node${disconnectedNodes.length > 1 ? "s" : ""} detected: ${disconnectedNodes
              .map((n) => n.data.label)
              .join(", ")}. Connect all nodes to create a valid workflow.`,
          };
        }
      }

      return { valid: true };
    },
    []
  );

  /**
   * Warns about potentially invalid configuration but doesn't block workflow execution
   */
  const validateWithWarnings = useCallback(
    (nodes: Node[], edges: Edge[]): { 
      valid: boolean; 
      hasWarnings: boolean; 
      message?: string; 
      warnings?: string[] 
    } => {
      // First do the standard validation
      const result = validateWorkflow(nodes, edges);
      
      if (!result.valid) {
        return { ...result, hasWarnings: false };
      }
      
      // Additional checks that generate warnings but don't invalidate the workflow
      const warnings: string[] = [];

      // Check for nodes with default configuration
      const defaultConfigNodes = nodes.filter(
        node => node.type === "custom" && 
        node.data.config && 
        JSON.stringify(node.data.config) === JSON.stringify(node.data.defaultConfig)
      );

      if (defaultConfigNodes.length > 0) {
        warnings.push(
          `Node${defaultConfigNodes.length > 1 ? "s" : ""} ${
            defaultConfigNodes.map(n => `"${n.data.label}"`).join(", ")
          } using default configuration.`
        );
      }

      // Check for potentially suboptimal flow structure
      const endNodes = nodes.filter(node => {
        return !edges.some(edge => edge.source === node.id);
      });

      // More than one end node might be intentional, but worth noting
      if (endNodes.length > 1 && ![BlockType.FINANCE, BlockType.OUTPUT].includes(endNodes[0]?.data?.blockType)) {
        warnings.push(
          `Multiple end nodes detected: ${
            endNodes.map(n => `"${n.data.label}"`).join(", ")
          }. This might lead to unexpected workflow behavior.`
        );
      }

      return { 
        valid: true, 
        hasWarnings: warnings.length > 0,
        warnings
      };
    },
    [validateWorkflow]
  );

  return {
    validateWorkflow,
    validateWithWarnings
  };
}
