import { Module } from "@nestjs/common";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";
import { ExecutionRepository } from "../database/repositories/execution.repository";
import { WorkflowRepository } from "../database/repositories/workflow.repository";

@Module({
  controllers: [DashboardController],
  providers: [DashboardService, ExecutionRepository, WorkflowRepository],
  exports: [DashboardService],
})
export class DashboardModule {}
