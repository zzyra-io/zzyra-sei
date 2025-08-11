import { Module } from '@nestjs/common';
import { Global } from '@nestjs/common';
import { WorkflowService } from './workflow-service';
import { WorkflowExecutor } from '../../workers/workflow-executor';
import { NodeExecutor } from '../../workers/node-executor';
import { ExecutionLogger } from '../../workers/execution-logger';
import { ErrorHandler } from '../../workers/error-handler';
import { NotificationModule } from '../../services/notification.module';
import { MagicModule } from '../../services/magic.module';
import { ExecutionMonitorService } from '../../services/execution-monitor.service';
import { MultiLevelCircuitBreakerService } from '../../services/multi-level-circuit-breaker.service';
import { DataTransformationService } from '../../services/data-transformation.service';
import { DataStateService } from '../../services/data-state.service';
import { ParallelExecutionService } from '../../services/parallel-execution.service';
import { BlockchainDataSyncService } from '../../services/blockchain-data-sync.service';
import { BlockchainModule } from '../blockchain/BlockchainModule';

@Global()
@Module({
  imports: [NotificationModule, MagicModule, BlockchainModule],
  providers: [
    WorkflowService,
    WorkflowExecutor,
    NodeExecutor,
    ExecutionLogger,
    ErrorHandler,
    ExecutionMonitorService,
    MultiLevelCircuitBreakerService,
    DataTransformationService,
    DataStateService,
    ParallelExecutionService,
    BlockchainDataSyncService,
  ],
  exports: [
    WorkflowService,
    WorkflowExecutor,
    NodeExecutor,
    ExecutionLogger,
    ErrorHandler,
    ExecutionMonitorService,
    MultiLevelCircuitBreakerService,
    DataTransformationService,
    DataStateService,
    ParallelExecutionService,
    BlockchainDataSyncService,
  ],
})
export class WorkflowModule {}
