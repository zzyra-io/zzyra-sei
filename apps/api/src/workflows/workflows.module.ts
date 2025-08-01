import { Module } from "@nestjs/common";
import { WorkflowsController } from "./workflows.controller";
import { WorkflowsService } from "./workflows.service";
import { DatabaseModule } from "../database/database.module";
import { QueueModule } from "../queue/queue.module";
import { AiModule } from "../ai/ai.module";

@Module({
  imports: [DatabaseModule, QueueModule, AiModule],
  controllers: [WorkflowsController],
  providers: [WorkflowsService],
  exports: [WorkflowsService],
})
export class WorkflowsModule {}
