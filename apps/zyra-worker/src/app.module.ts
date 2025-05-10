import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RabbitMQModule, WorkerModule } from '@argahvk/rabbitmq';
import { AMQP_CONNECTION, queueOptions } from './config';
import { WorkflowModule } from './lib/services/workflow.module';
import { HealthModule } from './health/health.module';
import { ConfigModule } from '@nestjs/config';
import { NotificationModule } from './services/notification.module';
import { TestNotificationController } from './controllers/test-notification.controller';
import { ExecutionWorker } from './workers/execution-worker';
import { AIModule } from './modules/ai.module';
import { BlockchainModule } from './lib/blockchain/BlockchainModule';

@Module({
  imports: [
    // Load environment variables with validation
    ConfigModule.forRoot({
      isGlobal: true,
      validationOptions: {
        allowUnknown: true,
        abortEarly: true,
      },
    }),

    // RabbitMQ and worker configuration
    RabbitMQModule.register({
      providers: [ExecutionWorker],
      imports: [WorkflowModule],

      workerModuleProvider: WorkerModule.register({
        globalDataProvider: {},
        workers: [
          // Scale horizontally by adding more workers
          { provide: 'ExecutionWorker1', useClass: ExecutionWorker },
          { provide: 'ExecutionWorker2', useClass: ExecutionWorker },
          { provide: 'ExecutionWorker3', useClass: ExecutionWorker },
        ],
      }),
      ampqProviderName: AMQP_CONNECTION,
      urls: process.env.RABBIT_MQ_URLS
        ? process.env.RABBIT_MQ_URLS.split(',')
        : [process.env.RABBIT_MQ_URL || 'amqp://guest:guest@localhost:5672'],
      queues: queueOptions,
      // Connection recovery settings
      connectionOptions: {
        heartbeatIntervalInSeconds: 30,
        reconnectTimeInSeconds: 5,
      },
    }),

    // Application modules
    WorkflowModule,
    HealthModule,
    NotificationModule,
    AIModule,
    BlockchainModule,
  ],
  controllers: [AppController, TestNotificationController],
  providers: [AppService, ExecutionWorker],
})
export class AppModule {}
