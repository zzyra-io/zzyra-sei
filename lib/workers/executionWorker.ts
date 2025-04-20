import { initExecutionQueue } from "@/lib/queue/executionQueue";
import { executionService } from "@/lib/services/execution-service";
import { createClient } from "@/lib/supabase/client";
import { BlockType, getBlockType } from "@/types/workflow";
import { customBlockService } from "@/lib/services/custom-block-service";
import { executeCustomBlockLogic } from "@/types/custom-block";
import nodemailer from "nodemailer";
import pRetry from "p-retry";
import { config } from "@/lib/config";
import { Counter, Histogram } from "prom-client";
import "dotenv/config";
import { createServiceClient } from "@/lib/supabase/serviceClient";
import { v4 as uuidv4 } from "uuid";
import { ethers, parseEther } from "ethers";

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
    async (msg) => {
      if (!msg) return;
      const { executionId, workflowId } = JSON.parse(msg.content.toString());
      console.log(`[Worker] Processing job: ${executionId}`);

      try {
        // Update status to running
        await executionService.updateExecutionStatus(executionId, "running");

        // Retrieve workflow definition
        const workflow = await import("@/lib/services/workflow-service").then(
          (mod) => mod.workflowService.getWorkflow(workflowId)
        );
        const supabaseNode = createServiceClient();

        // Execute each node sequentially
        for (const node of workflow.nodes) {
          // Create node execution record
          const nodeExecId = uuidv4();
          await supabaseNode.from("node_executions").insert({
            id: nodeExecId,
            execution_id: executionId,
            node_id: node.id,
            status: "running",
            started_at: new Date().toISOString(),
          });

          const blockType = getBlockType(node.data);
          const endTimer = nodeExecutionDuration.startTimer({ blockType });
          try {
            // Log node start
            await executionService.logExecutionEvent(
              executionId,
              node.id,
              "info",
              `Node ${node.id} execution started`
            );

            // Execute with retries
            const output = await pRetry(() => executeNode(node), {
              retries: config.retry.attempts,
              factor: config.retry.factor,
              minTimeout: config.retry.minTimeout,
            });
            endTimer();

            // Update node execution success
            await supabaseNode
              .from("node_executions")
              .update({
                status: "completed",
                completed_at: new Date().toISOString(),
                output_data: output,
              })
              .eq("id", nodeExecId);
            // Log success
            await executionService.logExecutionEvent(
              executionId,
              node.id,
              "info",
              `Node ${node.id} execution completed`,
              output
            );
          } catch (nodeError) {
            endTimer();
            nodeExecutionFailures.inc({ blockType });
            // Update node execution failure
            await supabaseNode
              .from("node_executions")
              .update({
                status: "failed",
                completed_at: new Date().toISOString(),
                error_data: (nodeError as Error).message,
              })
              .eq("id", nodeExecId);
            // Log node error and stop execution
            await executionService.logExecutionEvent(
              executionId,
              node.id,
              "error",
              `Node ${node.id} execution failed`,
              nodeError
            );
            throw nodeError;
          }
        }

        // Mark execution completed
        await executionService.updateExecutionStatus(executionId, "completed");
        console.log(`[Worker] Completed job: ${executionId}`);
        channel.ack(msg);
      } catch (error) {
        console.error(`[Worker] Job ${executionId} failed:`, error);
        await executionService.updateExecutionStatus(
          executionId,
          "failed",
          (error as Error).message
        );
        channel.nack(msg, false, false);
      }
    },
    { noAck: false }
  );
}

async function executeNode(node: any): Promise<any> {
  const supabase = createServiceClient();
  const blockType = getBlockType(node.data);
  const config = node.data;

  switch (blockType) {
    case BlockType.EMAIL: {
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
      if (!config.url) {
        throw new Error(`Webhook URL is undefined for node ${node.id}`);
      }
      const res = await globalThis.fetch(config.url, {
        method: config.method,
        headers: config.headers,
        body: config.body,
      });
      const data = await res.json();
      return { data };
    }
    case BlockType.DELAY: {
      const ms =
        Number(config.duration) * (config.unit === "minutes" ? 60000 : 1000);
      await new Promise((r) => globalThis.setTimeout(r, ms));
      return {};
    }
    case BlockType.CUSTOM: {
      const blockDef = await customBlockService.getCustomBlockById(
        config.customBlockId
      );
      if (!blockDef) throw new Error("Custom block not found");
      return await executeCustomBlockLogic(blockDef, config.inputs);
    }
    case BlockType.TRANSFORM: {
      if (config.transformType === "javascript" && config.code) {
        try {
          const fn = new Function("data", config.code);
          const result = fn(node.data);
          return { result };
        } catch (err) {
          throw new Error(`Transform error: ${(err as Error).message}`);
        }
      }
      throw new Error("Unsupported transform configuration");
    }
    case BlockType.CONDITION: {
      if (config.condition) {
        try {
          const fn = new Function("data", `return (${config.condition});`);
          const outcome = fn(node.data);
          return { outcome: Boolean(outcome) };
        } catch (err) {
          throw new Error(`Condition error: ${(err as Error).message}`);
        }
      }
      throw new Error("No condition specified");
    }
    case BlockType.WALLET: {
      const { blockchain, operation, privateKey } = config;
      if (!privateKey)
        throw new Error("Private key required for wallet operations");
      const provider = ethers.getDefaultProvider(blockchain);
      const wallet = new ethers.Wallet(privateKey, provider);
      if (operation === "connect" || operation === "getAddress") {
        return { address: wallet.address };
      }
      throw new Error(`Unsupported wallet operation: ${operation}`);
    }
    case BlockType.TRANSACTION: {
      const { blockchain, type, to, amount, privateKey } = config;
      if (type === "transfer") {
        if (!privateKey || !to || !amount)
          throw new Error("Missing transaction parameters");
        const provider = ethers.getDefaultProvider(blockchain);
        const wallet = new ethers.Wallet(privateKey, provider);
        const tx = await wallet.sendTransaction({
          to,
          value: parseEther(amount),
        });
        const receipt = await tx.wait();
        return { txHash: receipt.transactionHash };
      }
      throw new Error(`Unsupported transaction type: ${type}`);
    }
    case BlockType.GOAT_FINANCE: {
      const { operation, blockchain, tokenAddress } = config;
      const provider = ethers.getDefaultProvider(blockchain);
      if (operation === "balance") {
        if (!tokenAddress) throw new Error("Token address required");
        // ERC20 balance
        const abi = ["function balanceOf(address) view returns (uint256)"];
        const contract = new ethers.Contract(tokenAddress, abi, provider);
        const balance = await contract.balanceOf(config.address);
        return { balance: balance.toString() };
      }
      throw new Error(`Unsupported finance operation: ${operation}`);
    }
    case BlockType.PRICE_MONITOR: {
      // Fetch crypto price and evaluate condition
      const assetId = config.asset?.toLowerCase();
      const target = Number(config.targetPrice);
      const condition = config.condition;
      if (!assetId || isNaN(target) || !condition) {
        throw new Error("Invalid price monitor configuration");
      }
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${assetId}&vs_currencies=usd`
      );
      const data = await res.json();
      const price = data[assetId]?.usd;
      if (price == null)
        throw new Error(`Failed to fetch price for ${assetId}`);
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
    default:
      // Other block types or logic only: return data as-is
      return { data: node.data };
  }
}

startWorker().catch((err) => console.error(err));
