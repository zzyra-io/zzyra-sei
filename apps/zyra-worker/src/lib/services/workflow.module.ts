import { Module } from '@nestjs/common';
import { Global } from '@nestjs/common';
import { WorkflowService } from './workflow-service';
import { WorkflowExecutor } from '../../workers/workflow-executor';
import { NodeExecutor } from '../../workers/node-executor';
import { ExecutionLogger } from '../../workers/execution-logger';
import { ErrorHandler } from '../../workers/error-handler';
import { NotificationModule } from '../../services/notification.module';
import { MagicModule } from '../../services/magic.module';

@Global()
@Module({
  imports: [NotificationModule, MagicModule],
  providers: [
    WorkflowService,
    WorkflowExecutor,
    NodeExecutor,
    ExecutionLogger,
    ErrorHandler,
  ],
  exports: [
    WorkflowService,
    WorkflowExecutor,
    NodeExecutor,
    ExecutionLogger,
    ErrorHandler,
  ],
})
export class WorkflowModule {}
