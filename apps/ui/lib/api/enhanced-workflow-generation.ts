/**
 * Enhanced Workflow Generation API
 *
 * Production-grade workflow generation with comprehensive validation,
 * security, versioning, and monitoring capabilities
 */

import api from "../services/api";

// Core interfaces
interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

// Validation interfaces
interface ValidationError {
  type: "schema" | "business" | "graph" | "security";
  code: string;
  message: string;
  nodeId?: string;
  edgeId?: string;
  severity: "error" | "warning";
}

interface ValidationWarning {
  type: string;
  message: string;
  suggestion?: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  correctedWorkflow?: {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  };
}

// Security interfaces
interface SecurityIssue {
  type:
    | "prompt_injection"
    | "code_injection"
    | "sensitive_data"
    | "malicious_pattern";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  location?: string;
  suggestion?: string;
}

interface SecurityResult {
  isSecure: boolean;
  issues: SecurityIssue[];
  sanitizedInput?: string;
}

// Versioning interfaces
interface VersionInfo {
  id: string;
  version: number;
  name: string;
  description?: string;
  createdAt: string;
  createdBy: string;
  status: "draft" | "active" | "archived" | "deprecated";
}

interface VersionDiff {
  nodesAdded: WorkflowNode[];
  nodesRemoved: WorkflowNode[];
  nodesModified: Array<{
    before: WorkflowNode;
    after: WorkflowNode;
    changes: string[];
  }>;
  edgesAdded: WorkflowEdge[];
  edgesRemoved: WorkflowEdge[];
  edgesModified: Array<{
    before: WorkflowEdge;
    after: WorkflowEdge;
    changes: string[];
  }>;
  summary: {
    totalChanges: number;
    significantChanges: boolean;
    changeTypes: string[];
  };
}

// Metrics interfaces
interface GenerationMetrics {
  processingTime: number;
  validationErrors: number;
  validationWarnings: number;
  autoCorrections: number;
  securityIssues?: number;
}

// Generation options
interface GenerationOptions {
  detailedMode: boolean;
  prefillConfig: boolean;
  domainHint?: string;
  userLevel?: "beginner" | "intermediate" | "expert";
  enableSecurity?: boolean;
  enableValidation?: boolean;
  autoHeal?: boolean;
}

interface RefinementOptions {
  preserveConnections?: boolean;
  focusArea?: string;
  intensity?: "light" | "medium" | "heavy";
}

interface GenerationMetadata {
  workflowId?: string;
  createVersion?: boolean;
  userLevel?: "beginner" | "intermediate" | "expert";
  parentVersionId?: string;
  tags?: string[];
}

// Result interfaces
interface EnhancedGenerationResult {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  validationResult?: ValidationResult;
  securityResult?: SecurityResult;
  versionInfo?: VersionInfo;
  metrics?: GenerationMetrics;
}

interface RefinementResult {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  validationResult?: ValidationResult;
  metrics?: GenerationMetrics;
}

// Callback types
type StatusCallback = (
  status: string,
  progress?: number,
  partial?: WorkflowNode[],
  validationResult?: ValidationResult,
  securityResult?: SecurityResult,
  metrics?: GenerationMetrics
) => void;

function getSessionId(): string {
  // Generate or get existing session ID
  if (typeof window !== "undefined") {
    let sessionId = sessionStorage.getItem("sessionId");
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      sessionStorage.setItem("sessionId", sessionId);
    }
    return sessionId;
  }
  return `session_${Date.now()}`;
}

function getClientMetadata() {
  if (typeof window !== "undefined") {
    return {
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      url: window.location.href,
    };
  }
  return {
    timestamp: new Date().toISOString(),
  };
}

/**
 * Enhanced workflow generation with comprehensive validation and security
 */
export const generateWorkflow = async (
  description: string,
  options: GenerationOptions = { detailedMode: true, prefillConfig: true },
  existingNodes: WorkflowNode[] = [],
  existingEdges: WorkflowEdge[] = [],
  metadata?: GenerationMetadata,
  onStatusUpdate?: StatusCallback
): Promise<EnhancedGenerationResult> => {
  try {
    onStatusUpdate?.("Initializing generation...", 5);

    // Get user context
    const sessionId = getSessionId();
    const clientMetadata = getClientMetadata();

    onStatusUpdate?.("Processing request...", 10);

    // Prepare the request data with enhanced metadata
    const requestData = {
      description,
      sessionId,
      options: {
        ...options,
        enableSecurity: options.enableSecurity ?? true,
        enableValidation: options.enableValidation ?? true,
        autoHeal: options.autoHeal ?? true,
      },
      existingNodes,
      existingEdges,
      metadata: {
        ...metadata,
        ...clientMetadata,
      },
    };

    onStatusUpdate?.("Understanding requirements...", 20);

    const response = await api.post("/ai/generate-workflow", requestData);

    if (response.status !== 200 && response.status !== 201) {
      throw new Error(`Generation failed: ${response.statusText}`);
    }

    const result: EnhancedGenerationResult = response.data;

    onStatusUpdate?.("Analyzing workflow structure...", 40);

    // Handle security validation
    if (result.securityResult) {
      onStatusUpdate?.(
        "Security validation complete",
        60,
        undefined,
        undefined,
        result.securityResult
      );

      if (!result.securityResult.isSecure) {
        console.warn("Security issues detected:", result.securityResult.issues);
      }
    }

    // Handle validation results
    if (result.validationResult) {
      onStatusUpdate?.(
        "Workflow validation complete",
        70,
        undefined,
        result.validationResult
      );

      if (result.validationResult.errors.length > 0) {
        console.warn(
          "Validation errors found:",
          result.validationResult.errors
        );
      }

      if (result.validationResult.correctedWorkflow) {
        console.info("Auto-corrections applied to workflow");
      }

      if (result.validationResult.warnings.length > 0) {
        console.info("Validation warnings:", result.validationResult.warnings);
      }
    }

    // Handle versioning
    if (result.versionInfo) {
      onStatusUpdate?.("Version created", 80);
      console.info(
        `Created workflow version ${result.versionInfo.version}: ${result.versionInfo.name}`
      );
    }

    // Report metrics
    if (result.metrics) {
      onStatusUpdate?.(
        "Generation metrics calculated",
        90,
        undefined,
        undefined,
        undefined,
        result.metrics
      );
      console.info("Generation metrics:", result.metrics);
    }

    onStatusUpdate?.("Complete", 100);

    // Validate the result structure
    if (!result.nodes || !Array.isArray(result.nodes)) {
      throw new Error("Invalid response: missing nodes array");
    }

    if (!result.edges || !Array.isArray(result.edges)) {
      throw new Error("Invalid response: missing edges array");
    }

    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    onStatusUpdate?.(`Error: ${errorMessage}`, 0);
    throw error;
  }
};

/**
 * Enhanced workflow refinement with validation
 */
export const refineWorkflow = async (
  prompt: string,
  options: RefinementOptions = {},
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  metadata?: GenerationMetadata,
  onStatusUpdate?: StatusCallback
): Promise<RefinementResult> => {
  try {
    onStatusUpdate?.("Analyzing current workflow...", 10);

    // Get user context
    const sessionId = getSessionId();
    const clientMetadata = getClientMetadata();

    // Prepare the request payload with enhanced metadata
    const requestData = {
      prompt,
      sessionId,
      options,
      nodes,
      edges,
      metadata: {
        ...metadata,
        ...clientMetadata,
      },
    };

    onStatusUpdate?.("Processing refinement...", 30);

    const response = await api.post("/ai/refine-workflow", requestData);

    if (response.status !== 200 && response.status !== 201) {
      throw new Error(`Refinement failed: ${response.statusText}`);
    }

    const result: RefinementResult = response.data;

    onStatusUpdate?.("Applying refinements...", 60);

    // Handle validation results
    if (result.validationResult) {
      onStatusUpdate?.(
        "Validating refined workflow...",
        80,
        undefined,
        result.validationResult
      );

      if (result.validationResult.errors.length > 0) {
        console.warn(
          "Validation errors in refined workflow:",
          result.validationResult.errors
        );
      }

      if (result.validationResult.warnings.length > 0) {
        console.info("Validation warnings:", result.validationResult.warnings);
      }
    }

    // Report metrics
    if (result.metrics) {
      onStatusUpdate?.(
        "Refinement complete",
        90,
        undefined,
        undefined,
        undefined,
        result.metrics
      );
      console.info("Refinement metrics:", result.metrics);
    }

    onStatusUpdate?.("Complete", 100);

    // Validate the result
    if (!result.nodes || !Array.isArray(result.nodes)) {
      throw new Error("Invalid response: missing nodes array");
    }

    if (!result.edges || !Array.isArray(result.edges)) {
      throw new Error("Invalid response: missing edges array");
    }

    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    onStatusUpdate?.(`Error: ${errorMessage}`, 0);
    throw error;
  }
};

/**
 * Generate a custom block with security validation
 */
export const generateBlock = async (
  prompt: string,
  onStatusUpdate?: (status: string, progress?: number) => void
): Promise<{
  success: boolean;
  block: {
    name: string;
    description: string;
    category: string;
    code: string;
    inputs: Array<{
      name: string;
      dataType: string;
      required?: boolean;
      description?: string;
      defaultValue?: unknown;
    }>;
    outputs: Array<{
      name: string;
      dataType: string;
      required?: boolean;
      description?: string;
    }>;
    configFields: Array<{
      name: string;
      label: string;
      type: string;
      required?: boolean;
      description?: string;
      defaultValue?: unknown;
    }>;
  };
  validationResult?: ValidationResult;
  securityResult?: SecurityResult;
}> => {
  try {
    onStatusUpdate?.("Analyzing block requirements...", 10);

    const sessionId = getSessionId();
    const clientMetadata = getClientMetadata();

    const requestData = {
      prompt,
      sessionId,
      metadata: clientMetadata,
    };

    onStatusUpdate?.("Generating block...", 30);

    const response = await api.post("/ai/generate-block", requestData);

    if (response.status !== 200 && response.status !== 201) {
      throw new Error(`Block generation failed: ${response.statusText}`);
    }

    const result = response.data;

    if (result.securityResult && !result.securityResult.isSecure) {
      onStatusUpdate?.("Security validation failed", 50);
      console.warn(
        "Security issues in generated block:",
        result.securityResult.issues
      );
    } else {
      onStatusUpdate?.("Security validation passed", 70);
    }

    onStatusUpdate?.("Complete", 100);

    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    onStatusUpdate?.(`Error: ${errorMessage}`, 0);
    throw error;
  }
};

/**
 * Get workflow versions
 */
export const getWorkflowVersions = async (
  workflowId: string,
  options?: {
    includeArchived?: boolean;
    limit?: number;
    offset?: number;
  }
): Promise<VersionInfo[]> => {
  const response = await api.get(`/ai/workflow/${workflowId}/versions`, {
    params: options,
  });

  return response.data;
};

/**
 * Compare two workflow versions
 */
export const compareVersions = async (
  workflowId: string,
  fromVersionId: string,
  toVersionId: string
): Promise<VersionDiff> => {
  const response = await api.get(
    `/ai/workflow/${workflowId}/versions/compare`,
    {
      params: {
        from: fromVersionId,
        to: toVersionId,
      },
    }
  );

  return response.data;
};

/**
 * Rollback to a previous version
 */
export const rollbackWorkflow = async (
  workflowId: string,
  targetVersionId: string,
  reason?: string
): Promise<{
  success: boolean;
  rolledBackTo: VersionInfo;
  backup: VersionInfo;
  warnings?: string[];
}> => {
  const response = await api.post(`/ai/workflow/${workflowId}/rollback`, {
    targetVersionId,
    reason,
  });

  return response.data;
};

/**
 * Get generation analytics
 */
export const getAnalytics = async (timeRange?: {
  start: Date;
  end: Date;
}): Promise<{
  metrics: {
    totalGenerations: number;
    successfulGenerations: number;
    failedGenerations: number;
    averageResponseTime: number;
    validationFailures: number;
    securityIssues: number;
    autoCorrections: number;
  };
  userActivity: {
    totalEvents: number;
    recentEvents: Array<{
      id: string;
      eventType: string;
      timestamp: Date;
      outcome: string;
    }>;
  };
  security?: {
    summary: {
      totalViolations: number;
      criticalViolations: number;
      highRiskViolations: number;
    };
    recommendations: string[];
  };
}> => {
  const response = await api.get("/ai/analytics", {
    params: timeRange
      ? {
          startDate: timeRange.start.toISOString(),
          endDate: timeRange.end.toISOString(),
        }
      : {},
  });

  return response.data;
};

/**
 * Submit feedback on generated content
 */
export const submitFeedback = async (
  feedbackType:
    | "workflow_generation"
    | "block_generation"
    | "validation"
    | "general",
  rating: number, // 1-5 scale
  feedback: string,
  metadata?: {
    generationPrompt?: string;
    generatedOutput?: unknown;
    executionResult?: "success" | "failure" | "partial";
  }
): Promise<{ feedbackId: string }> => {
  const sessionId = getSessionId();

  const response = await api.post("/ai/feedback", {
    sessionId,
    feedbackType,
    rating,
    feedback,
    metadata,
  });

  return response.data;
};

// Export types for use in components
export type {
  WorkflowNode,
  WorkflowEdge,
  ValidationResult,
  SecurityResult,
  VersionInfo,
  GenerationMetrics,
  EnhancedGenerationResult,
  RefinementResult,
  StatusCallback,
  GenerationOptions,
  RefinementOptions,
  GenerationMetadata,
  ValidationError,
  ValidationWarning,
  SecurityIssue,
  VersionDiff,
};
