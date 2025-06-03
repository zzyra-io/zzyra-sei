import { Module, Logger } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RabbitMQModule, WorkerModule } from '@argahvk/rabbitmq';
import { AMQP_CONNECTION, queueOptions } from './config';
import { WorkflowModule } from './lib/services/workflow.module';
import { HealthModule } from './health/health.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationModule } from './services/notification.module';
import { TestNotificationController } from './controllers/test-notification.controller';
import { ExecutionWorker } from './workers/execution-worker';
import { AIModule } from './modules/ai.module';
import { BlockchainModule } from './lib/blockchain/BlockchainModule';
import { DatabaseService } from './services/database.service';

// Configuration validation schema
const configValidationSchema = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3005', 10),
  RABBIT_MQ_URL:
    process.env.RABBIT_MQ_URL || 'amqp://guest:guest@localhost:5672',
  DATABASE_URL: process.env.DATABASE_URL,
};

@Module({
  imports: [
    // Load environment variables with validation
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validationOptions: {
        allowUnknown: true,
        abortEarly: false, // Continue validation to catch all errors
      },
      validate: (config) => {
        const logger = new Logger('ConfigValidation');

        // Validate required environment variables
        const requiredVars = ['DATABASE_URL'];
        const missingVars = requiredVars.filter((varName) => !config[varName]);

        if (missingVars.length > 0) {
          logger.error(
            `Missing required environment variables: ${missingVars.join(', ')}`,
          );
          throw new Error(
            `Missing required environment variables: ${missingVars.join(', ')}`,
          );
        }

        logger.log('✅ Environment configuration validated');
        return config;
      },
    }),

    // RabbitMQ and worker configuration with better error handling
    RabbitMQModule.register({
      providers: [ExecutionWorker],
      imports: [WorkflowModule],

      workerModuleProvider: WorkerModule.register({
        globalDataProvider: {},
        workers: [
          // Scale horizontally by adding more workers in production
          { provide: 'ExecutionWorker1', useClass: ExecutionWorker },
          ...(process.env.NODE_ENV === 'production'
            ? [
                { provide: 'ExecutionWorker2', useClass: ExecutionWorker },
                { provide: 'ExecutionWorker3', useClass: ExecutionWorker },
              ]
            : []),
        ],
      }),
      ampqProviderName: AMQP_CONNECTION,
      urls: process.env.RABBIT_MQ_URLS
        ? process.env.RABBIT_MQ_URLS.split(',')
        : [process.env.RABBIT_MQ_URL || 'amqp://guest:guest@localhost:5672'],
      queues: queueOptions,
      // Enhanced connection recovery settings for production
      connectionOptions: {
        heartbeatIntervalInSeconds: parseInt(
          process.env.RABBITMQ_HEARTBEAT || '30',
          10,
        ),
        reconnectTimeInSeconds: parseInt(
          process.env.RABBITMQ_RECONNECT_TIMEOUT || '5',
          10,
        ),
      },
    }),

    // Core application modules
    WorkflowModule,
    HealthModule,
    NotificationModule,

    // Conditional module imports for better startup performance
    ...(process.env.ENABLE_AI_MODULE !== 'false' ? [AIModule] : []),
    ...(process.env.ENABLE_BLOCKCHAIN_MODULE !== 'false'
      ? [BlockchainModule]
      : []),
  ],
  controllers: [
    AppController,
    ...(process.env.NODE_ENV !== 'production'
      ? [TestNotificationController]
      : []),
  ],
  providers: [
    AppService,
    ExecutionWorker,
    DatabaseService,
    // Add configuration as a provider for dependency injection
    {
      provide: 'CONFIG',
      useValue: configValidationSchema,
    },
  ],
  exports: [DatabaseService, 'CONFIG'],
})
export class AppModule {
  private readonly logger = new Logger(AppModule.name);

  constructor() {
    this.logger.log('🏗️  AppModule initialized');
    this.logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    this.logger.log(
      `Worker scaling: ${process.env.NODE_ENV === 'production' ? '3 workers' : '1 worker'}`,
    );
  }

  // Optional: Add module lifecycle hooks for better debugging
  onModuleInit() {
    this.logger.log('🔧 AppModule dependencies initialized');
  }

  onApplicationBootstrap() {
    this.logger.log('🚀 Application bootstrap completed');
  }
}
