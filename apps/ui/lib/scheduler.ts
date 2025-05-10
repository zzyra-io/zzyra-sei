import cron from "node-cron";
import { workflowService } from "./services/workflow-service";
import { ExecutionService } from "./services/execution-service";
import { getBlockType, BlockType } from "@/types/workflow";
import { BlockType } from '@zyra/types';


async function initScheduler() {
  const execSvc = new ExecutionService();
  const workflows = await workflowService.getWorkflows();
  for (const wf of workflows) {
    // find first schedule node
    const schedNode = wf.nodes.find((n) => getBlockType(n.data) === BlockType.SCHEDULE);
    if (!schedNode) continue;
    const cfg = schedNode.data.config || schedNode.data;
    let cronExpr: string;
    if (cfg.interval === "daily" && cfg.time) {
      const [h, m] = cfg.time.split(":").map((x: string) => Number(x));
      cronExpr = `${m} ${h} * * *`;
    } else if (cfg.interval === "hourly") {
      cronExpr = `0 * * * *`;
    } else {
      cronExpr = cfg.interval; // assume valid cron
    }
    cron.schedule(cronExpr, async () => {
      console.log(`Triggering workflow ${wf.id}`);
      try {
        await execSvc.startExecution(wf.id);
      } catch (e) {
        console.error(`Failed to start scheduled workflow ${wf.id}:`, e);
      }
    });
    console.log(`Scheduled workflow ${wf.id} at cron '${cronExpr}'`);
  }
}

initScheduler().catch((err) => console.error("Scheduler error:", err));
