import { createClient } from "@/lib/supabase/server";
import { v4 as uuidv4 } from "uuid";
import { fetchCryptoPrice } from "@/lib/services/price-service";
import { sendEmail } from "@/lib/services/email-service";
import pRetry from "p-retry";

export interface ExecutionContext {
  workflowId: string;
  executionId: string;
  userId: string;
  startTime: Date;
}

export interface NodeExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  nextNodes?: string[];
  conditionMet?: boolean;
}

export interface WorkflowExecutionResult {
  executionId: string;
  status: "completed" | "failed";
  startTime: Date;
  endTime: Date;
  nodeResults: Record<string, NodeExecutionResult>;
}

export class WorkflowExecutionEngine {
  private nodeExecutors: Record<string, Function> = {
    "price-monitor": this.executePriceMonitorNode.bind(this),
    email: this.executeEmailNode.bind(this),
    // Add more node executors as needed
  };

  async executeWorkflow(
    workflowId: string,
    userId: string
  ): Promise<WorkflowExecutionResult> {
    const supabase = await createClient();
    const executionId = uuidv4();
    const startTime = new Date();

    // Enforce per-user rate limit
    const rateLimit = Number(process.env.USER_WORKFLOW_RATE_LIMIT) || 10;
    const windowMs = Number(process.env.USER_WORKFLOW_RATE_WINDOW_MS) || 60000;
    const windowStart = new Date(startTime.getTime() - windowMs).toISOString();
    const { count, error: countError } = await supabase
      .from('workflow_executions')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', userId)
      .gte('started_at', windowStart);
    if (countError) {
      console.error('Rate limit count error:', countError);
      throw new Error('Failed to enforce rate limit');
    }
    if ((count || 0) >= rateLimit) {
      throw new Error(`Rate limit exceeded: max ${rateLimit} workflows per window`);
    }

    // Create execution record
    await supabase
      .from("workflow_executions")
      .insert({
        id: executionId,
        workflow_id: workflowId,
        status: "running",
        started_at: startTime.toISOString(),
        created_by: userId,
      })
      .single();

    try {
      // Fetch workflow
      const { data: workflow, error } = await supabase
        .from("workflows")
        .select("*")
        .eq("id", workflowId)
        .single();

      if (error) throw new Error(`Failed to fetch workflow: ${error.message}`);

      const context: ExecutionContext = {
        workflowId,
        executionId,
        userId,
        startTime,
      };

      // Find trigger nodes (starting points)
      const triggerNodes = workflow.nodes.filter(
        (node: any) =>
          node.type === "price-monitor" || node.data?.nodeType === "trigger"
      );

      if (triggerNodes.length === 0) {
        throw new Error("No trigger nodes found in workflow");
      }

      // Execute each trigger node
      const nodeResults: Record<string, NodeExecutionResult> = {};

      for (const node of triggerNodes) {
        const result = await this.executeNode(node, workflow, {}, context);
        nodeResults[node.id] = result;

        // Log node execution
        await this.logNodeExecution(context.executionId, node.id, result);
      }

      // Update execution record as completed
      const endTime = new Date();
      await supabase
        .from("workflow_executions")
        .update({
          status: "completed",
          completed_at: endTime.toISOString(),
        })
        .eq("id", executionId);

      return {
        executionId,
        status: "completed",
        startTime,
        endTime,
        nodeResults,
      };
    } catch (error: any) {
      // Update execution record as failed
      const endTime = new Date();
      await supabase
        .from("workflow_executions")
        .update({
          status: "failed",
          completed_at: endTime.toISOString(),
          error: error.message,
        })
        .eq("id", executionId);

      console.error("Workflow execution failed:", error);

      return {
        executionId,
        status: "failed",
        startTime,
        endTime,
        nodeResults: {},
      };
    }
  }

  private async executeNode(
    node: any,
    workflow: any,
    inputData: any,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    // Configurable retry with pRetry
    const retries = Number(process.env.NODE_RETRY_COUNT) || 3;
    const factor = Number(process.env.NODE_RETRY_FACTOR) || 2;
    const minTimeout = Number(process.env.NODE_RETRY_MIN_TIMEOUT) || 1000;
    const maxTimeout = Number(process.env.NODE_RETRY_MAX_TIMEOUT) || 30000;

    const execAttempt = async (): Promise<NodeExecutionResult> => {
      const nodeType = node.type || node.data?.nodeType;
      const executor = this.nodeExecutors[nodeType];
      if (!executor) {
        throw new Error(`No executor for node type: ${nodeType}`);
      }
      const result = await executor(node.data, inputData, context);
      if (!result.success) {
        throw new Error(result.error || "Unknown node execution error");
      }
      return result;
    };

    let result: NodeExecutionResult;
    try {
      result = await pRetry(execAttempt, {
        retries,
        factor,
        minTimeout,
        maxTimeout,
        onFailedAttempt: (err) =>
          console.warn(`Node ${node.id} retry failed:`, err),
      });
    } catch (error: any) {
      console.error(
        `Error executing node ${node.id} after ${retries} attempts:`,
        error
      );
      return {
        success: false,
        error: `Failed after ${retries} retries: ${error.message}`,
      };
    }

    // Continue to next nodes on success
    let nextNodeIds: string[] = [];
    if (result.success && result.conditionMet !== false) {
      const connectedEdges = workflow.edges.filter(
        (edge: any) => edge.source === node.id
      );
      nextNodeIds = connectedEdges.map((edge: any) => edge.target);

      result.nextNodes = nextNodeIds;

      // Execute connected nodes if this node was successful
      for (const nextNodeId of nextNodeIds) {
        const nextNode = workflow.nodes.find((n: any) => n.id === nextNodeId);
        if (nextNode) {
          await this.executeNode(nextNode, workflow, result.data, context);
        }
      }
    }

    return result;
  }

  private async logNodeExecution(
    executionId: string,
    nodeId: string,
    result: NodeExecutionResult
  ) {
    const supabase = await createClient();

    // Log node execution into execution_logs table
    await supabase
      .from("execution_logs")
      .insert({
        execution_id: executionId,
        node_id: nodeId,
        level: result.success ? "info" : "error",
        message: result.success ? "Node executed successfully" : result.error || "",
        data: result.data || null,
        timestamp: new Date().toISOString(),
      });
  }

  // Node-specific executors
  private async executePriceMonitorNode(
    nodeData: any,
    inputData: any,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    try {
      const config = nodeData.config || {};
      const asset = config.asset || "ETH";
      const targetPrice = Number.parseFloat(config.targetPrice) || 0;
      const condition = config.condition || "above";

      // Fetch current price
      const priceData = await fetchCryptoPrice(asset);
      const currentPrice = priceData.price;

      // Evaluate condition
      let conditionMet = false;
      switch (condition) {
        case "above":
          conditionMet = currentPrice > targetPrice;
          break;
        case "below":
          conditionMet = currentPrice < targetPrice;
          break;
        case "equals":
          conditionMet = Math.abs(currentPrice - targetPrice) < 0.01; // Allow small difference
          break;
      }

      return {
        success: true,
        conditionMet,
        data: {
          asset,
          currentPrice,
          targetPrice,
          condition,
          conditionMet,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      console.error("Error executing price monitor node:", error);
      return {
        success: false,
        error: `Failed to check price: ${error.message}`,
      };
    }
  }

  private async executeEmailNode(
    nodeData: any,
    inputData: any,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    try {
      const config = nodeData.config || {};
      const to = config.to || "";
      let subject = config.subject || "Workflow Notification";
      let body =
        config.body || "This is an automated notification from your workflow.";

      // Replace template variables with actual values
      if (inputData) {
        subject = this.replaceTemplateVariables(subject, inputData);
        body = this.replaceTemplateVariables(body, inputData);
      }

      // Send email
      const emailResult = await sendEmail({
        to,
        subject,
        body,
      });

      return {
        success: true,
        data: {
          to,
          subject,
          body,
          messageId: emailResult.messageId,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      console.error("Error executing email node:", error);
      return {
        success: false,
        error: `Failed to send email: ${error.message}`,
      };
    }
  }

  private replaceTemplateVariables(text: string, data: any): string {
    return text.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const keys = key.trim().split(".");
      let value = data;

      for (const k of keys) {
        if (value === undefined || value === null) return match;
        value = value[k];
      }

      return value !== undefined && value !== null ? String(value) : match;
    });
  }
}

export const workflowExecutionEngine = new WorkflowExecutionEngine();
