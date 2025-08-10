import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Set up process event handlers for graceful shutdown
  const gracefulShutdown = (signal: string) => {
    logger.log(`Received ${signal}, shutting down gracefully...`);
    process.exit(0);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGHUP', () => gracefulShutdown('SIGHUP'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });

  try {
    logger.log('🚀 Starting Zzyra Worker application...');
    logger.log(`Node.js version: ${process.version}`);
    logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

    // Log environment variables (sanitized)
    logger.log(`Port: ${process.env.PORT || 3005}`);
    logger.log(
      `RabbitMQ URL: ${process.env.RABBIT_MQ_URL ? '[CONFIGURED]' : '[NOT SET]'}`,
    );
    logger.log(
      `Database URL: ${process.env.DATABASE_URL ? '[CONFIGURED]' : '[NOT SET]'}`,
    );

    logger.log('📦 Creating NestJS application...');
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
      abortOnError: false, // Don't exit immediately on errors during startup
    });

    logger.log('🔌 Configuring WebSocket adapter...');
    app.useWebSocketAdapter(new IoAdapter(app));

    logger.log('🔧 Configuring global pipes and interceptors...');
    // app.useGlobalPipes(
    //   new ValidationPipe({
    //     transform: true,
    //     whitelist: true,
    //     forbidNonWhitelisted: true,
    //   }),
    // );

    // app.useGlobalInterceptors(
    //   new ClassSerializerInterceptor(app.get(Reflector)),
    // );

    // Enable CORS for development
    if (process.env.NODE_ENV !== 'production') {
      app.enableCors();
    }

    // Graceful shutdown
    app.enableShutdownHooks();

    const port = process.env.PORT ?? 3005;
    logger.log(`🌐 Starting server on port ${port}...`);
    await app.listen(port);

    logger.log('🔄 Worker is ready to process tasks');
    logger.log(
      `🔌 WebSocket server running on ws://localhost:${port}/execution`,
    );

    // Health check endpoint info
    logger.log(`🏥 Health check available at: http://localhost:${port}/health`);
  } catch (error) {
    logger.error('❌ Error starting application:', error);

    // Log more detailed error information
    if (error instanceof Error) {
      logger.error(`Error name: ${error.name}`);
      logger.error(`Error message: ${error.message}`);
      logger.error(`Error stack: ${error.stack}`);
    }

    // Log system information for debugging
    logger.error(`Memory usage: ${JSON.stringify(process.memoryUsage())}`);
    logger.error(`Platform: ${process.platform}`);
    logger.error(`Architecture: ${process.arch}`);

    process.exit(1);
  }
}

bootstrap().catch((error) => {
  console.error('💥 Unhandled error during bootstrap:', error);
  process.exit(1);
});
