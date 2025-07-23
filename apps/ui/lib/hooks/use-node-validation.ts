"use client";

import { useCallback, useEffect, useState } from "react";
import { useWorkflowExecutionValidation } from "./use-workflow-execution-validation";
import { Node, Edge } from "@xyflow/react";

interface ValidationError {
  field: string;
  message: string;
}

/**
 * Hook to get validation errors for a specific node
 */
export function useNodeValidation(nodeId: string) {
  const { getNodeErrors } = useWorkflowExecutionValidation();
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  // This hook needs access to the current nodes and edges
  // We'll need to get this from a context or pass it as parameters
  const updateValidationErrors = useCallback(
    (nodes: Node[], edges: Edge[]) => {
      const errors = getNodeErrors(nodeId, nodes, edges);
      setValidationErrors(
        errors.map((error) => ({
          field: error.field,
          message: error.message,
        }))
      );
    },
    [nodeId, getNodeErrors]
  );

  return {
    validationErrors,
    updateValidationErrors,
    hasErrors: validationErrors.length > 0,
    errorCount: validationErrors.length,
  };
} 