import { initExecutionQueue } from "@/lib/queue/executionQueue.server";
import { executionService } from "@/lib/services/execution-service";
import { BlockType, getBlockType } from "@/types/workflow";
import { customBlockService } from "@/lib/services/custom-block-service";
import { executeCustomBlockLogic } from "@/types/custom-block";
import nodemailer from "nodemailer";
import pRetry from "p-retry";
import { config } from "@/lib/config";
import { Counter, Histogram } from "prom-client";
import "dotenv/config";
import { createServiceClient } from "@/lib/supabase/serviceClient";
import { ethers, parseEther } from "ethers";
import { Node, Edge } from "reactflow";
import {
  validateAcyclic,
  topologicalSort,
  validateOrphans,
  validateTerminals,
} from "@/lib/utils/graph";
import { NodeVM } from "vm2";
import { workflowService } from "@/lib/services/workflow-service";

// Metrics for node execution
const nodeExecutionDuration = new Histogram({
  name: "node_execution_duration_seconds",
  help: "Duration of node execution in seconds",
  labelNames: ["blockType"],
});
const nodeExecutionFailures = new Counter({
  name: "node_execution_failures_total",
  help: "Total number of failed node executions",
  labelNames: ["blockType"],
});

async function startWorker() {
  const channel = await initExecutionQueue();
  console.log("[Worker] Waiting for execution jobs...");

  channel.consume(
    "execution_queue",
    async (msg: any) => {
      if (!msg) return;
      const { executionId, workflowId, userId } = JSON.parse(msg.content.toString());
      console.log(`[Worker] Processing job: ${executionId}`);
      const supabase = createServiceClient();

      try {
        // Check if execution is already completed or failed
        const { data: execution } = await supabase
          .from('workflow_executions')
          .select('status')
          .eq('id', executionId)
          .single();

        if (execution?.status === 'completed' || execution?.status === 'failed') {
          console.log(`[Worker] Skipping already ${execution.status} job: ${executionId}`);
          channel.ack(msg);
          return;
        }

        // Check if execution is paused - if so, don't process yet
        if (execution?.status === 'paused') {
          console.log(`[Worker] Skipping paused job: ${executionId}`);
          // Requeue with a delay for paused jobs
          channel.nack(msg, false, true);
          return;
        }

        // Update status to running and add log
        await executionService.updateExecutionStatus(executionId, "running");
        await supabase.from("execution_logs").insert({
          execution_id: executionId,
          node_id: "system",
          level: "info",
          message: "Execution started",
          timestamp: new Date().toISOString(),
        });

        // Retrieve full workflow and orchestrate via DAG
        const wf = await workflowService.getWorkflow(workflowId);
        if (!wf || !wf.nodes || !wf.edges) {
          throw new Error(`Workflow ${workflowId} not found or invalid`);
        }

        const results = await executeWorkflow(wf.nodes, wf.edges);
        
        // Mark workflow completed with outputs
        await executionService.updateExecutionStatus(
          executionId,
          "completed",
          results
        );
        
        // Add completion log
        await supabase.from("execution_logs").insert({
          execution_id: executionId,
          node_id: "system",
          level: "info",
          message: "Execution completed successfully",
          timestamp: new Date().toISOString(),
        });
        
        console.log(`[Worker] Completed job: ${executionId}`);
        channel.ack(msg);
      } catch (error) {
        console.error(`[Worker] Job ${executionId} failed:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Update execution status
        await executionService.updateExecutionStatus(
          executionId,
          "failed",
          errorMessage
        );
        
        // Add error log
        await supabase.from("execution_logs").insert({
          execution_id: executionId,
          node_id: "system",
          level: "error",
          message: `Execution failed: ${errorMessage}`,
          timestamp: new Date().toISOString(),
        });
        
        // Don't requeue failed jobs
        channel.nack(msg, false, false);
      }
    },
    { noAck: false }
  );
}

async function executeNode(node: any): Promise<any> {
  const startTime = Date.now();
  const cfg = node.data as Record<string, any>;
  // Initialize Supabase client for DB operations
  const supabase = createServiceClient();
  // common validation wrapper
  const blockType = getBlockType(cfg);
  const { config } = cfg;
  const executionId = cfg.executionId;
  
  // Create or update node execution record
  if (executionId) {
    try {
      // Check if node execution record exists
      const { data } = await supabase
        .from('node_executions')
        .select('id')
        .eq('execution_id', executionId)
        .eq('node_id', node.id)
        .maybeSingle();
      
      if (data) {
        // Update existing record
        await supabase
          .from('node_executions')
          .update({
            status: 'running',
            started_at: new Date().toISOString(),
          })
          .eq('execution_id', executionId)
          .eq('node_id', node.id);
      } else {
        // Create new record
        await supabase
          .from('node_executions')
          .insert({
            execution_id: executionId,
            node_id: node.id,
            status: 'running',
            started_at: new Date().toISOString(),
          });
      }
      
      // Log node execution start
      await supabase.from("node_logs").insert({
        execution_id: executionId,
        node_id: node.id,
        level: "info",
        message: `Executing ${blockType} node`,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error(`Error updating node execution status: ${err}`);
      // Continue execution even if logging fails
    }
  }

  switch (blockType) {
    case BlockType.EMAIL: {
      // Validate email config
      if (!config.to || !config.subject || !config.body) {
        throw new Error("Email block missing to/subject/body");
      }
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: config.to,
        subject: config.subject,
        text: config.body,
      });
      return { messageId: info.messageId };
    }
    case BlockType.DATABASE: {
      // Validate DB config
      if (!config.table || !config.operation) {
        throw new Error("Database block missing table or operation");
      }
      let result;
      if (config.operation === "select") {
        result = await supabase
          .from(config.table)
          .select(config.columns || "*");
      } else if (config.operation === "insert") {
        result = await supabase.from(config.table).insert(config.data);
      } else {
        throw new Error(`Unsupported DB operation: ${config.operation}`);
      }
      if (result.error) throw result.error;
      return { data: result.data };
    }
    case BlockType.WEBHOOK: {
      // HTTP webhook trigger
      if (!config.url) {
        throw new Error(`Webhook block missing URL for node ${node.id}`);
      }
      const method = (config.method || "GET").toUpperCase();
      let res;
      try {
        res = await globalThis.fetch(config.url, {
          method,
          headers: config.headers,
          body: config.body,
        });
      } catch (err) {
        throw new Error(`Webhook request failed: ${(err as Error).message}`);
      }
      if (!res.ok) {
        throw new Error(`Webhook returned HTTP ${res.status}`);
      }
      const contentType = res.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? await res.json()
        : await res.text();
      return { status: res.status, data };
    }
    case BlockType.WALLET: {
      // Wallet connect or address retrieval
      const { blockchain, operation, privateKey } = config;
      if (!privateKey) {
        throw new Error("Wallet block missing privateKey");
      }
      const provider = ethers.getDefaultProvider(blockchain);
      const wallet = new ethers.Wallet(privateKey, provider);
      if (operation === "connect" || operation === "getAddress") {
        return { address: wallet.address };
      }
      throw new Error(`Unsupported wallet operation: ${operation}`);
    }
    case BlockType.TRANSACTION: {
      // On-chain transaction
      const { blockchain, type, to, amount, privateKey } = config;
      if (type !== "transfer") {
        throw new Error(`Unsupported transaction type: ${type}`);
      }
      if (!privateKey || !to || !amount) {
        throw new Error("Transaction block missing to/amount/privateKey");
      }
      let value;
      try {
        value = parseEther(amount);
      } catch (err) {
        throw new Error(`Invalid amount: ${amount}`);
      }
      const provider = ethers.getDefaultProvider(blockchain);
      const wallet = new ethers.Wallet(privateKey, provider);
      // Optional gas estimation
      await wallet.estimateGas({ to, value });
      const tx = await wallet.sendTransaction({ to, value });
      const receipt = await tx.wait();
      // Guard: ensure receipt is present
      if (!receipt) {
        throw new Error("Transaction failed: no receipt");
      }
      // Ethers receipt.hash contains the transaction hash
      const hash = (receipt as any).transactionHash ?? receipt.hash;
      if (!hash) {
        throw new Error("Transaction failed: no receipt hash");
      }
      return { txHash: hash, blockNumber: receipt.blockNumber };
    }
    case BlockType.GOAT_FINANCE: {
      // ERC20 token operations
      const { operation, blockchain, tokenAddress, address } = config;
      if (!tokenAddress || !address) {
        throw new Error("Finance block missing tokenAddress or address");
      }
      const provider = ethers.getDefaultProvider(blockchain);
      if (operation === "balance") {
        const abi = ["function balanceOf(address) view returns (uint256)"];
        const contract = new ethers.Contract(tokenAddress, abi, provider);
        const bal = await contract.balanceOf(address);
        return { balance: bal.toString() };
      }
      throw new Error(`Unsupported finance operation: ${operation}`);
    }
    case BlockType.PRICE_MONITOR: {
      // Crypto price trigger
      console.log("config", config);
      const assetId = config.asset?.toLowerCase();
      const target = Number(config.targetPrice);
      const condition = config.condition;
      if (!assetId || isNaN(target) || !condition) {
        console.log("config", config);
        throw new Error(
          "Price monitor missing asset, targetPrice or condition"
        );
      }
      let res;
      try {
        res = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${assetId}&vs_currencies=usd`
        );
      } catch (err) {
        throw new Error(`Price fetch failed: ${(err as Error).message}`);
      }
      if (!res.ok) {
        throw new Error(`CoinGecko HTTP ${res.status}`);
      }
      const data = await res.json();
      const price = data[assetId]?.usd;
      if (price == null) {
        throw new Error(`No price data for ${assetId}`);
      }
      const met = condition === "above" ? price > target : price < target;
      return { price, conditionMet: met };
    }
    case BlockType.SCHEDULE: {
      // Schedule trigger: no-op during execution
      return {};
    }
    case BlockType.NOTIFICATION: {
      // Simple notification: log and return
      console.log(
        `Notification: ${config.type || "info"} - ${config.title || ""} ${
          config.message || ""
        }`
      );
      return {};
    }
    case BlockType.DELAY: {
      // Pause execution
      const duration = Number(config.duration);
      const unit = config.unit === "minutes" ? 60000 : 1000;
      if (isNaN(duration) || duration < 0) {
        throw new Error("Delay block invalid duration");
      }
      await new Promise((res) => setTimeout(res, duration * unit));
      return {};
    }
    case BlockType.TRANSFORM: {
      // Data transform via JS code
      const { transformType, code } = config;
      if (transformType !== "javascript" || !code) {
        throw new Error("Transform block missing code or unsupported type");
      }
      // sandbox JS to prevent infinite loops
      const vm = new NodeVM({ timeout: 500, sandbox: {} });
      const fn = vm.run(`module.exports = function(data){ ${code} }`);
      const result = fn(node.data);
      return { result };
    }
    case BlockType.CONDITION: {
      // Conditional branching
      const cond = config.condition;
      if (!cond) {
        throw new Error("Condition block missing expression");
      }
      // sandbox condition
      const vm = new NodeVM({ timeout: 200, sandbox: {} });
      const fn = vm.run(`module.exports = function(data){ return (${cond}); }`);
      const outcome = fn(node.data);
      return { outcome: Boolean(outcome) };
    }
    case BlockType.CUSTOM: {
      // Execute custom block logic
      const cbId = config.customBlockId;
      if (!cbId) {
        throw new Error("Custom block missing ID");
      }
      const blockDef = await customBlockService.getCustomBlockById(cbId);
      if (!blockDef) {
        throw new Error(`Custom block not found: ${cbId}`);
      }
      return await executeCustomBlockLogic(blockDef, config.inputs || {});
    }
    case BlockType.LLM_PROMPT: {
      // LLM prompt execution via HTTP API
      const { promptTemplate, model, temperature, maxTokens, stream } = config;
      if (!promptTemplate) throw new Error("LLM Prompt missing promptTemplate");
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error("OpenAI API key not set");
      const url = "https://api.openai.com/v1/chat/completions";
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      };
      const body = JSON.stringify({
        model,
        messages: [{ role: "user", content: promptTemplate }],
        temperature,
        max_tokens: maxTokens,
        stream,
      });
      const res = await fetch(url, { method: "POST", headers, body });
      if (!res.ok) throw new Error(`OpenAI API error: ${res.status}`);
      let fullText = "";
      if (stream) {
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          fullText += chunk;
          // TODO: emit SSE chunk event
        }
      } else {
        const json = await res.json();
        fullText = json.choices?.[0]?.message?.content || "";
      }
      return { text: fullText };
    }
    default:
      // Other block types or logic only: return data as-is
      return { data: node.data };
  }
}

// Orchestrate full workflow execution
export async function executeWorkflow(
  nodes: Node[],
  edges: Edge[],
  executionId?: string
): Promise<Record<string, any>> {
  const supabase = createServiceClient();
  
  try {
    // Graph validations
    validateAcyclic(nodes, edges);
    validateOrphans(nodes, edges);
    validateTerminals(nodes, edges);
    
    // Topologically sorted run
    const sorted = topologicalSort(nodes, edges);
    const outputs: Record<string, any> = {};
    
    for (const node of sorted) {
      // Check if execution is paused before each node
      if (executionId) {
        const { data: execution } = await supabase
          .from('workflow_executions')
          .select('status')
          .eq('id', executionId)
          .single();
          
        if (execution?.status === 'paused') {
          throw new Error('EXECUTION_PAUSED');
        }
      }
      
      // attach previous outputs and execution ID if needed
      const inputNode = { 
        ...node, 
        data: { 
          ...node.data, 
          previous: outputs,
          executionId: executionId 
        } 
      };
      
      try {
        outputs[node.id] = await executeNode(inputNode);
        
        // Update node execution status to completed
        if (executionId) {
          await supabase
            .from('node_executions')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
              output: outputs[node.id] || {},
            })
            .eq('execution_id', executionId)
            .eq('node_id', node.id);
            
          // Log node completion
          await supabase.from("node_logs").insert({
            execution_id: executionId,
            node_id: node.id,
            level: "info",
            message: `Node completed successfully`,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error) {
        // Update node execution status to failed
        if (executionId) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          await supabase
            .from('node_executions')
            .update({
              status: 'failed',
              completed_at: new Date().toISOString(),
              error: errorMessage,
            })
            .eq('execution_id', executionId)
            .eq('node_id', node.id);
            
          // Log node failure
          await supabase.from("node_logs").insert({
            execution_id: executionId,
            node_id: node.id,
            level: "error",
            message: `Node failed: ${errorMessage}`,
            timestamp: new Date().toISOString(),
          });
        }
        
        // Rethrow to fail the whole workflow
        throw error;
      }
    }
    return outputs;
  } catch (error) {
    // Special handling for paused executions
    if (error instanceof Error && error.message === 'EXECUTION_PAUSED') {
      console.log(`Execution ${executionId} is paused`);
      return { status: 'paused' };
    }
    throw error;
  }
}

startWorker().catch((err) => console.error(err));
