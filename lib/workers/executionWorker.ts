import { initExecutionQueue } from "@/lib/queue/executionQueue";
import { executionService } from "@/lib/services/execution-service";
import { createClient } from "@/lib/supabase/client";
import { BlockType, getBlockType } from "@/types/workflow";
import { customBlockService } from "@/lib/services/custom-block-service";
import { executeCustomBlockLogic } from "@/types/custom-block";
import nodemailer from "nodemailer";

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

        // Execute each node sequentially
        for (const node of workflow.nodes) {
          try {
            // Log node start
            await executionService.logExecutionEvent(
              executionId,
              node.id,
              "info",
              `Node ${node.id} execution started`
            );

            // Execute node
            const output = await executeNode(node);

            // Log success
            await executionService.logExecutionEvent(
              executionId,
              node.id,
              "info",
              `Node ${node.id} execution completed`,
              output
            );
          } catch (nodeError) {
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
          error.message
        );
        channel.nack(msg, false, false);
      }
    },
    { noAck: false }
  );
}

async function executeNode(node: any): Promise<any> {
  const supabase = createClient();
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
        result = await supabase.from(config.table).select(config.columns || "*");
      } else if (config.operation === "insert") {
        result = await supabase.from(config.table).insert(config.data);
      } else {
        throw new Error(`Unsupported DB operation: ${config.operation}`);
      }
      if (result.error) throw result.error;
      return { data: result.data };
    }
    case BlockType.WEBHOOK: {
      const res = await globalThis.fetch(config.url, { method: config.method, headers: config.headers, body: config.body });
      const data = await res.json();
      return { data };
    }
    case BlockType.DELAY: {
      const ms = Number(config.duration) * (config.unit === "minutes" ? 60000 : 1000);
      await new Promise((r) => globalThis.setTimeout(r, ms));
      return {};
    }
    case BlockType.CUSTOM: {
      const blockDef = await customBlockService.getCustomBlockById(config.customBlockId);
      if (!blockDef) throw new Error("Custom block not found");
      return await executeCustomBlockLogic(blockDef, config.inputs);
    }
    default:
      // Other block types or logic only: return data as-is
      return { data: node.data };
  }
}

startWorker().catch((err) => console.error(err));
