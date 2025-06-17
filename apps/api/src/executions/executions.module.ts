import { Module } from "@nestjs/common";
import { ExecutionsController } from "./executions.controller";
import { ExecutionsService } from "./executions.service";
import { NodeExecutionsService } from "./node-executions.service";
import { NodeLogsService } from "./node-logs.service";
import { ExecutionRepository } from "@zyra/database";
import { DatabaseModule } from "../database/database.module";

@Module({
  imports: [DatabaseModule],
  controllers: [ExecutionsController],
  providers: [
    ExecutionsService,
    NodeExecutionsService,
    NodeLogsService,
    {
      provide: "NODE_EXECUTIONS_REPOSITORY",
      useClass: ExecutionRepository,
    },
  ],
  exports: [ExecutionsService, NodeExecutionsService, NodeLogsService],
})
export class ExecutionsModule {}
