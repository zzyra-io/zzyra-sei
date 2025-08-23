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
  app.enableCors({
    origin: (origin: string | undefined, callback: Function) => {
      const allowedOrigins =
        process.env.CORS_ENABLED_URL &&
        process.env.CORS_ENABLED_URL.split(",").map((url) => url.trim());
      console.log("origin", origin);
      console.log("allowedOrigins", allowedOrigins);
      if (!origin || allowedOrigins?.includes(origin)) {
        callback(null, origin);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
      "Cache-Control",
      "X-File-Name",
    ],
    exposedHeaders: ["Content-Range", "X-Total-Count", "X-Pagination-Count"],
    maxAge: 86400, // 24 hours
  });

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
