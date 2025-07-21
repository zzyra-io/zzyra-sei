import { Module } from "@nestjs/common";
import { AiController } from "./ai.controller";
import { EnhancedAiService } from "./enhanced-ai.service";
import { WorkflowValidatorService } from "./services/workflow-validator.service";
import { SecurityService } from "./services/security.service";
import { AuditService } from "./services/audit.service";
import { WorkflowVersioningService } from "./services/workflow-versioning.service";

@Module({
  controllers: [AiController],
  providers: [
    EnhancedAiService,
    WorkflowValidatorService,
    SecurityService,
    AuditService,
    WorkflowVersioningService,
  ],
  exports: [EnhancedAiService],
})
export class AiModule {}
