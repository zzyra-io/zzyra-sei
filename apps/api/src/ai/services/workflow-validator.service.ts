import { Injectable, Logger } from "@nestjs/common";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { BlockType } from "@zzyra/types";

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

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  correctedWorkflow?: { nodes: WorkflowNode[]; edges: WorkflowEdge[] };
}

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

const WorkflowNodeSchema = z.object({
  id: z.string(),
  type: z.string().default("CUSTOM"),
  position: z.object({ x: z.number(), y: z.number() }),
  data: z.object({
    blockType: z.nativeEnum(BlockType),
    label: z.string(),
    description: z.string().optional(),
    nodeType: z.enum(["TRIGGER", "ACTION", "LOGIC"]),
    iconName: z.string(),
    isEnabled: z.boolean().default(true),
    config: z.record(z.string(), z.unknown()).optional(),
    inputs: z.array(z.unknown()).default([]),
    outputs: z.array(z.unknown()).default([]),
  }),
});

const WorkflowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
  type: z.string().default("CUSTOM"),
  animated: z.boolean().default(false),
});

const WorkflowSchema = z.object({
  nodes: z.array(WorkflowNodeSchema),
  edges: z.array(WorkflowEdgeSchema),
});

@Injectable()
export class WorkflowValidatorService {
  private readonly logger = new Logger(WorkflowValidatorService.name);

  /**
   * Comprehensive workflow validation with auto-healing
   */
  async validateWorkflow(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    options: { autoHeal?: boolean; strictMode?: boolean } = {}
  ): Promise<ValidationResult> {
    const { autoHeal = true, strictMode = false } = options;
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    this.logger.debug(
      `Validating workflow with ${nodes.length} nodes and ${edges.length} edges`
    );

    // Step 1: Schema Validation
    const schemaValidation = await this.validateSchema({ nodes, edges });
    if (!schemaValidation.isValid) {
      errors.push(...schemaValidation.errors);
    }

    // Step 2: Business Rule Validation
    const businessValidation = await this.validateBusinessRules(nodes, edges);
    errors.push(...businessValidation.errors);
    warnings.push(...businessValidation.warnings);

    // Step 3: Graph Analysis
    const graphValidation = await this.validateGraph(nodes, edges);
    errors.push(...graphValidation.errors);
    warnings.push(...graphValidation.warnings);

    // Step 4: Security Validation
    const securityValidation = await this.validateSecurity(nodes);
    errors.push(...securityValidation.errors);
    warnings.push(...securityValidation.warnings);

    // Step 5: Auto-healing if enabled and there are correctable errors
    let correctedWorkflow:
      | { nodes: WorkflowNode[]; edges: WorkflowEdge[] }
      | undefined;
    if (autoHeal && errors.some((e) => this.isHealable(e))) {
      correctedWorkflow = await this.healWorkflow(nodes, edges, errors);
      if (correctedWorkflow) {
        this.logger.log(
          `Auto-healed workflow with ${errors.length} corrections`
        );
      }
    }

    const isValid = strictMode
      ? errors.length === 0
      : errors.filter((e) => e.severity === "error").length === 0;

    return {
      isValid,
      errors,
      warnings,
      correctedWorkflow,
    };
  }

  /**
   * Validate workflow against schema
   */
  private async validateSchema(workflow: {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  }) {
    const errors: ValidationError[] = [];

    try {
      WorkflowSchema.parse(workflow);
    } catch (error) {
      if (error instanceof z.ZodError) {
        for (const issue of error.issues) {
          errors.push({
            type: "schema",
            code: "SCHEMA_VALIDATION_ERROR",
            message: `${issue.path.join(".")}: ${issue.message}`,
            severity: "error",
          });
        }
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate business rules
   */
  private async validateBusinessRules(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ) {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Rule 1: Must have at least one trigger node
    const triggerNodes = nodes.filter(
      (node) => (node.data as any)?.nodeType === "TRIGGER"
    );

    if (triggerNodes.length === 0) {
      errors.push({
        type: "business",
        code: "NO_TRIGGER_NODE",
        message: "Workflow must have at least one trigger node",
        severity: "error",
      });
    } else if (triggerNodes.length > 3) {
      warnings.push({
        type: "business",
        message:
          "Multiple trigger nodes may lead to complex execution patterns",
        suggestion: "Consider consolidating triggers or using logic nodes",
      });
    }

    // Rule 2: Validate required configurations
    for (const node of nodes) {
      const nodeData = node.data as any;
      const validationResult = this.validateNodeConfiguration(node);
      if (!validationResult.isValid) {
        errors.push({
          type: "business",
          code: "MISSING_REQUIRED_CONFIG",
          message: `Node ${nodeData.label} is missing required configuration: ${validationResult.missing?.join(", ")}`,
          nodeId: node.id,
          severity: "error",
        });
      }
    }

    // Rule 3: Validate block type compatibility
    for (const edge of edges) {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      const targetNode = nodes.find((n) => n.id === edge.target);

      if (sourceNode && targetNode) {
        const compatibilityResult = this.validateNodeCompatibility(
          sourceNode,
          targetNode
        );
        if (!compatibilityResult.compatible) {
          warnings.push({
            type: "business",
            message: `Potential compatibility issue between ${(sourceNode.data as any).label} and ${(targetNode.data as any).label}`,
            suggestion: compatibilityResult.suggestion,
          });
        }
      }
    }

    return { errors, warnings };
  }

  /**
   * Validate graph structure
   */
  private async validateGraph(nodes: WorkflowNode[], edges: WorkflowEdge[]) {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check for cycles
    if (this.hasCycles(nodes, edges)) {
      errors.push({
        type: "graph",
        code: "CYCLE_DETECTED",
        message: "Workflow contains cycles which may cause infinite loops",
        severity: "error",
      });
    }

    // Check for unreachable nodes
    const unreachableNodes = this.findUnreachableNodes(nodes, edges);
    if (unreachableNodes.length > 0) {
      errors.push({
        type: "graph",
        code: "UNREACHABLE_NODES",
        message: `Found ${unreachableNodes.length} unreachable nodes`,
        severity: "warning",
      });
    }

    // Check for orphaned nodes
    const orphanedNodes = this.findOrphanedNodes(nodes, edges);
    if (orphanedNodes.length > 0) {
      warnings.push({
        type: "graph",
        message: `Found ${orphanedNodes.length} orphaned nodes`,
        suggestion: "Connect orphaned nodes or remove them",
      });
    }

    return { errors, warnings };
  }

  /**
   * Validate security aspects
   */
  private async validateSecurity(nodes: WorkflowNode[]) {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    for (const node of nodes) {
      const nodeData = node.data as any;

      // Check for potential code injection in custom blocks
      if (nodeData.blockType === BlockType.CUSTOM && nodeData.config?.code) {
        const securityResult = this.analyzeCodeSecurity(nodeData.config.code);
        if (securityResult.hasIssues) {
          errors.push({
            type: "security",
            code: "UNSAFE_CODE_DETECTED",
            message: `Potentially unsafe code in custom block: ${securityResult.issues.join(", ")}`,
            nodeId: node.id,
            severity: "error",
          });
        }
      }

      // Check for exposed sensitive data in configurations
      const sensitiveDataResult = this.checkSensitiveData(
        nodeData.config || {}
      );
      if (sensitiveDataResult.hasSensitiveData) {
        warnings.push({
          type: "security",
          message: `Potential sensitive data exposure in node ${nodeData.label}`,
          suggestion:
            "Use environment variables or secure storage for sensitive data",
        });
      }
    }

    return { errors, warnings };
  }

  /**
   * Auto-heal workflow issues
   */
  private async healWorkflow(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    errors: ValidationError[]
  ): Promise<{ nodes: WorkflowNode[]; edges: WorkflowEdge[] } | undefined> {
    const healedNodes = [...nodes];
    const healedEdges = [...edges];
    let healed = false;

    for (const error of errors) {
      if (this.isHealable(error)) {
        switch (error.code) {
          case "MISSING_ID":
            if (error.nodeId) {
              const nodeIndex = healedNodes.findIndex(
                (n) => n.id === error.nodeId
              );
              if (nodeIndex !== -1) {
                healedNodes[nodeIndex] = {
                  ...healedNodes[nodeIndex],
                  id: `node-${uuidv4()}`,
                };
                healed = true;
              }
            }
            break;

          case "MISSING_REQUIRED_CONFIG":
            if (error.nodeId) {
              const nodeIndex = healedNodes.findIndex(
                (n) => n.id === error.nodeId
              );
              if (nodeIndex !== -1) {
                healedNodes[nodeIndex] = {
                  ...healedNodes[nodeIndex],
                  data: {
                    ...healedNodes[nodeIndex].data,
                    config: this.generateDefaultConfig(
                      (healedNodes[nodeIndex].data as any).blockType
                    ),
                  },
                };
                healed = true;
              }
            }
            break;

          case "UNREACHABLE_NODES":
            // Auto-connect orphaned nodes to the main flow
            const orphanedNodes = this.findOrphanedNodes(
              healedNodes,
              healedEdges
            );
            const triggerNodes = healedNodes.filter(
              (n) => (n.data as any)?.nodeType === "TRIGGER"
            );

            if (orphanedNodes.length > 0 && triggerNodes.length > 0) {
              for (const orphan of orphanedNodes.slice(0, 3)) {
                // Limit auto-connections
                healedEdges.push({
                  id: `edge-${uuidv4()}`,
                  source: triggerNodes[0].id,
                  target: orphan.id,
                });
              }
              healed = true;
            }
            break;
        }
      }
    }

    return healed ? { nodes: healedNodes, edges: healedEdges } : undefined;
  }

  /**
   * Check if an error is healable
   */
  private isHealable(error: ValidationError): boolean {
    const healableCodes = [
      "MISSING_ID",
      "MISSING_REQUIRED_CONFIG",
      "UNREACHABLE_NODES",
      "MISSING_POSITION",
    ];
    return healableCodes.includes(error.code);
  }

  /**
   * Validate node configuration requirements
   */
  private validateNodeConfiguration(node: WorkflowNode): {
    isValid: boolean;
    missing?: string[];
  } {
    const nodeData = node.data as any;
    const missing: string[] = [];

    // Check based on block type
    switch (nodeData.blockType) {
      case BlockType.HTTP_REQUEST:
        if (!nodeData.config?.url) missing.push("url");
        if (!nodeData.config?.method) missing.push("method");
        break;

      case BlockType.WEBHOOK:
        if (!nodeData.config?.url) missing.push("url");
        break;

      case BlockType.NOTIFICATION:
        if (!nodeData.config?.message) missing.push("message");
        break;

      case BlockType.CUSTOM:
        if (!nodeData.config?.code) missing.push("code");
        break;
    }

    return {
      isValid: missing.length === 0,
      missing: missing.length > 0 ? missing : undefined,
    };
  }

  /**
   * Validate compatibility between connected nodes
   */
  private validateNodeCompatibility(
    sourceNode: WorkflowNode,
    targetNode: WorkflowNode
  ): { compatible: boolean; suggestion?: string } {
    const sourceData = sourceNode.data as any;
    const targetData = targetNode.data as any;

    // Basic compatibility rules
    if (sourceData.nodeType === "ACTION" && targetData.nodeType === "TRIGGER") {
      return {
        compatible: false,
        suggestion: "Actions should not connect directly to triggers",
      };
    }

    return { compatible: true };
  }

  /**
   * Check for cycles in the workflow graph
   */
  private hasCycles(nodes: WorkflowNode[], edges: WorkflowEdge[]): boolean {
    const adjacencyList = new Map<string, string[]>();

    // Build adjacency list
    nodes.forEach((node) => adjacencyList.set(node.id, []));
    edges.forEach((edge) => {
      const adjacent = adjacencyList.get(edge.source) || [];
      adjacent.push(edge.target);
      adjacencyList.set(edge.source, adjacent);
    });

    // DFS cycle detection
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycleDFS = (nodeId: string): boolean => {
      if (recursionStack.has(nodeId)) return true;
      if (visited.has(nodeId)) return false;

      visited.add(nodeId);
      recursionStack.add(nodeId);

      const adjacent = adjacencyList.get(nodeId) || [];
      for (const adjNode of adjacent) {
        if (hasCycleDFS(adjNode)) return true;
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const node of nodes) {
      if (!visited.has(node.id) && hasCycleDFS(node.id)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Find unreachable nodes from trigger nodes
   */
  private findUnreachableNodes(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): WorkflowNode[] {
    const triggerNodes = nodes.filter(
      (n) => (n.data as any)?.nodeType === "TRIGGER"
    );
    if (triggerNodes.length === 0) return nodes;

    const reachable = new Set<string>();
    const adjacencyList = new Map<string, string[]>();

    // Build adjacency list
    nodes.forEach((node) => adjacencyList.set(node.id, []));
    edges.forEach((edge) => {
      const adjacent = adjacencyList.get(edge.source) || [];
      adjacent.push(edge.target);
      adjacencyList.set(edge.source, adjacent);
    });

    // BFS from all trigger nodes
    const queue = [...triggerNodes.map((n) => n.id)];
    triggerNodes.forEach((n) => reachable.add(n.id));

    while (queue.length > 0) {
      const current = queue.shift()!;
      const adjacent = adjacencyList.get(current) || [];

      for (const adjNode of adjacent) {
        if (!reachable.has(adjNode)) {
          reachable.add(adjNode);
          queue.push(adjNode);
        }
      }
    }

    return nodes.filter((node) => !reachable.has(node.id));
  }

  /**
   * Find orphaned nodes (no connections)
   */
  private findOrphanedNodes(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): WorkflowNode[] {
    const connectedNodes = new Set<string>();
    edges.forEach((edge) => {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    });

    return nodes.filter((node) => !connectedNodes.has(node.id));
  }

  /**
   * Analyze code for security issues
   */
  private analyzeCodeSecurity(code: string): {
    hasIssues: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Basic static analysis patterns
    const dangerousPatterns = [
      { pattern: /eval\s*\(/i, issue: "eval() usage" },
      { pattern: /Function\s*\(/i, issue: "Function constructor usage" },
      { pattern: /process\.exit/i, issue: "process.exit usage" },
      {
        pattern: /require\s*\(\s*['"]child_process['"]/i,
        issue: "child_process module usage",
      },
      { pattern: /require\s*\(\s*['"]fs['"]/i, issue: "filesystem access" },
      { pattern: /\/\*[\s\S]*\*\//g, issue: "suspicious comments" },
    ];

    for (const { pattern, issue } of dangerousPatterns) {
      if (pattern.test(code)) {
        issues.push(issue);
      }
    }

    return { hasIssues: issues.length > 0, issues };
  }

  /**
   * Check for sensitive data in configuration
   */
  private checkSensitiveData(config: Record<string, unknown>): {
    hasSensitiveData: boolean;
    fields: string[];
  } {
    const sensitiveFields: string[] = [];
    const sensitivePatterns = [
      /password/i,
      /secret/i,
      /key/i,
      /token/i,
      /auth/i,
      /credential/i,
    ];

    for (const [key, value] of Object.entries(config)) {
      if (typeof value === "string") {
        // Check field name
        if (sensitivePatterns.some((pattern) => pattern.test(key))) {
          sensitiveFields.push(key);
        }

        // Check for hardcoded secrets (simple heuristic)
        if (value.length > 20 && /^[A-Za-z0-9+/=]+$/.test(value)) {
          sensitiveFields.push(key);
        }
      }
    }

    return {
      hasSensitiveData: sensitiveFields.length > 0,
      fields: sensitiveFields,
    };
  }

  /**
   * Generate default configuration for a block type
   */
  private generateDefaultConfig(blockType: BlockType): Record<string, unknown> {
    switch (blockType) {
      case BlockType.HTTP_REQUEST:
        return { method: "GET", url: "", headers: {} };
      case BlockType.WEBHOOK:
        return { url: "", method: "POST" };
      case BlockType.NOTIFICATION:
        return { message: "Default notification", type: "info" };
      case BlockType.CUSTOM:
        return { code: "async function execute(inputs) { return inputs; }" };
      default:
        return {};
    }
  }
}
