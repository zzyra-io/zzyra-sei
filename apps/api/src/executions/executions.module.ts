import { Module } from "@nestjs/common";
import { ExecutionsController } from "./executions.controller";
import { ExecutionsService } from "./executions.service";
import { NodeExecutionsService } from "./node-executions.service";
import { NodeLogsService } from "./node-logs.service";

@Module({
  controllers: [ExecutionsController],
  providers: [ExecutionsService, NodeExecutionsService, NodeLogsService],
  exports: [ExecutionsService, NodeExecutionsService, NodeLogsService],
})
export class ExecutionsModule {}
