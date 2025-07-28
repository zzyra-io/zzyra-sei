import { Module, Logger } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WorkflowModule } from './lib/services/workflow.module';
import { HealthModule } from './health/health.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationModule } from './services/notification.module';
import { TestNotificationController } from './controllers/test-notification.controller';
import { ExecutionController } from './api/execution.controller';
import { ExecutionWorker } from './workers/execution-worker';
import { AIModule } from './modules/ai.module';
import { BlockchainModule } from './lib/blockchain/BlockchainModule';
import { DatabaseModule } from './services/database.module';
import { RabbitMQService } from './services/rabbitmq.service';
import { MagicModule } from './services/magic.module';
import { ExecutionGateway } from './gateways/execution.gateway';
import { ExecutionMonitorService } from './services/execution-monitor.service';

// Exception Filters
import { DatabaseExceptionFilter } from './filters/database-exception.filter';
import { PrismaExceptionFilter } from './filters/prisma-exception.filter';

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

    // Core application modules
    DatabaseModule,
    WorkflowModule,
    HealthModule,
    NotificationModule,
    MagicModule,

    // Conditional module imports for better startup performance
    ...(process.env.ENABLE_AI_MODULE !== 'false' ? [AIModule] : []),
    ...(process.env.ENABLE_BLOCKCHAIN_MODULE !== 'false'
      ? [BlockchainModule]
      : []),
  ],
  controllers: [
    AppController,
    ExecutionController,
    ...(process.env.NODE_ENV !== 'production'
      ? [TestNotificationController]
      : []),
  ],
  providers: [
    AppService,
    ExecutionWorker,
    RabbitMQService,
    // Exception filters
    {
      provide: APP_FILTER,
      useClass: DatabaseExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: PrismaExceptionFilter,
    },
    // Add configuration as a provider for dependency injection
    {
      provide: 'CONFIG',
      useValue: configValidationSchema,
    },
    ExecutionGateway,
    ExecutionMonitorService,
  ],
  exports: [RabbitMQService, 'CONFIG'],
})
export class AppModule {
  private readonly logger = new Logger(AppModule.name);

  constructor() {
    this.logger.log('🏗️  AppModule initialized');
    this.logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    this.logger.log(
      `Worker scaling: ${process.env.NODE_ENV === 'production' ? 'production mode' : 'development mode'}`,
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
