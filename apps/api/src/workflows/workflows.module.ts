import { Module } from "@nestjs/common";
import { WorkflowsController } from "./workflows.controller";
import { WorkflowsService } from "./workflows.service";
import { DatabaseModule } from "../database/database.module";
import { QueueModule } from "../queue/queue.module";

@Module({
  imports: [DatabaseModule, QueueModule],
  controllers: [WorkflowsController],
  providers: [WorkflowsService],
  exports: [WorkflowsService],
})
export class WorkflowsModule {}
