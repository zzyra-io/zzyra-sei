"use client";

import React, { createContext, useContext, useCallback, useState, ReactNode } from "react";
import { Node, Edge } from "@xyflow/react";
import { useWorkflowExecutionValidation } from "../hooks/use-workflow-execution-validation";

interface ValidationError {
  nodeId: string;
  field: string;
  message: string;
}

interface WorkflowValidationContextType {
  getNodeErrors: (nodeId: string) => ValidationError[];
  getNodeFieldError: (nodeId: string, fieldName: string) => string | undefined;
  updateValidation: (nodes: Node[], edges: Edge[]) => void;
  validationErrors: ValidationError[];
  hasErrors: boolean;
}

const WorkflowValidationContext = createContext<WorkflowValidationContextType | null>(null);

interface WorkflowValidationProviderProps {
  children: ReactNode;
}

export function WorkflowValidationProvider({ children }: WorkflowValidationProviderProps) {
  const { getNodeErrors, getNodeFieldError } = useWorkflowExecutionValidation();
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [currentNodes, setCurrentNodes] = useState<Node[]>([]);
  const [currentEdges, setCurrentEdges] = useState<Edge[]>([]);

  const updateValidation = useCallback(
    (nodes: Node[], edges: Edge[]) => {
      setCurrentNodes(nodes);
      setCurrentEdges(edges);
      
      // Get all validation errors
      const allErrors: ValidationError[] = [];
      nodes.forEach((node) => {
        const nodeErrors = getNodeErrors(node.id, nodes, edges);
        allErrors.push(...nodeErrors);
      });
      setValidationErrors(allErrors);
    },
    [getNodeErrors]
  );

  const getNodeErrorsForContext = useCallback(
    (nodeId: string): ValidationError[] => {
      return getNodeErrors(nodeId, currentNodes, currentEdges);
    },
    [getNodeErrors, currentNodes, currentEdges]
  );

  const getNodeFieldErrorForContext = useCallback(
    (nodeId: string, fieldName: string): string | undefined => {
      return getNodeFieldError(nodeId, fieldName, currentNodes, currentEdges);
    },
    [getNodeFieldError, currentNodes, currentEdges]
  );

  const value: WorkflowValidationContextType = {
    getNodeErrors: getNodeErrorsForContext,
    getNodeFieldError: getNodeFieldErrorForContext,
    updateValidation,
    validationErrors,
    hasErrors: validationErrors.length > 0,
  };

  return (
    <WorkflowValidationContext.Provider value={value}>
      {children}
    </WorkflowValidationContext.Provider>
  );
}

export function useWorkflowValidation() {
  const context = useContext(WorkflowValidationContext);
  if (!context) {
    throw new Error("useWorkflowValidation must be used within a WorkflowValidationProvider");
  }
  return context;
} 