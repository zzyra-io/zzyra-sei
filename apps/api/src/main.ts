import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import * as cookieParser from "cookie-parser";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ["error", "warn", "log", "verbose", "debug"],
  });

  // Enable cookie parser for authentication
  app.use(cookieParser());

  // Enable CORS for frontend integration
  // app.enableCors();

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    })
  );
  // API prefix
  app.setGlobalPrefix("api");

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle("Zzyra API")
    .setDescription("API for Zzyra workflow automation platform")
    // .setVersion("1.0")
    .addBearerAuth()
    .setVersion("1.0.0")
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  // Start server
  const port = process.env.PORT || 3002;
  await app.listen(port);
  console.log(`🚀 Zzyra API is running on: http://localhost:${port}/api`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  console.log(`Health Dashboard: http://localhost:${port}/api/health`);
}

bootstrap();
