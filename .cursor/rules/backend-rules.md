# Backend Rules for Zyra

## NestJS Architecture

### Module Structure

- Use modular architecture
- One module per domain
- Use proper module imports
- Use proper module exports

```typescript
@Module({
  imports: [DatabaseModule, WorkflowModule, ExecutionModule],
  controllers: [WorkflowController],
  providers: [WorkflowService, WorkflowRepository, ExecutionService],
  exports: [WorkflowService],
})
export class WorkflowModule {}
```

### Core Module

- Global exception filters
- Global middleware
- Global guards
- Global interceptors

```typescript
@Module({
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class CoreModule {}
```

## Execution Engine

### Worker Structure

- Use proper worker patterns
- Handle job queuing
- Handle job execution
- Handle job monitoring

```typescript
@Injectable()
export class WorkflowWorker {
  constructor(
    private readonly queue: Queue,
    private readonly executionService: ExecutionService
  ) {}

  async processJob(job: Job<WorkflowJob>): Promise<void> {
    try {
      await this.executionService.executeWorkflow(job.data);
      await job.progress(100);
    } catch (error) {
      await job.moveToFailed(error);
    }
  }
}
```

### Job Processing

- Use proper job types
- Handle job retries
- Handle job timeouts
- Handle job dependencies

```typescript
interface WorkflowJob {
  workflowId: string;
  userId: string;
  steps: WorkflowStep[];
  dependencies?: string[];
}

@Injectable()
export class JobProcessor {
  async process(job: WorkflowJob): Promise<void> {
    if (job.dependencies) {
      await this.waitForDependencies(job.dependencies);
    }
    await this.executeSteps(job.steps);
  }
}
```

## API Design

### Controller Structure

- Use proper route decorators
- Use proper HTTP methods
- Use proper status codes
- Use proper response types

```typescript
@Controller("workflows")
export class WorkflowController {
  @Post()
  @HttpCode(201)
  async create(@Body() dto: CreateWorkflowDTO): Promise<Workflow> {
    return this.workflowService.create(dto);
  }

  @Get(":id")
  @HttpCode(200)
  async findOne(@Param("id") id: string): Promise<Workflow> {
    return this.workflowService.findById(id);
  }
}
```

### DTOs

- Use class-validator
- Use proper validation rules
- Use proper transformation
- Use proper documentation

```typescript
export class CreateWorkflowDTO {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowStepDTO)
  steps: WorkflowStepDTO[];
}
```

## Error Handling

### Exception Filters

- Use proper exception types
- Use proper error messages
- Use proper status codes
- Use proper error logging

```typescript
@Catch(WorkflowException)
export class WorkflowExceptionFilter implements ExceptionFilter {
  catch(exception: WorkflowException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();

    response.status(status).json({
      statusCode: status,
      message: exception.message,
      error: exception.error,
    });
  }
}
```

### Error Types

- Use proper error hierarchy
- Use proper error codes
- Use proper error context
- Use proper error recovery

```typescript
export class WorkflowError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
  }
}

export class WorkflowNotFoundError extends WorkflowError {
  constructor(workflowId: string) {
    super(`Workflow ${workflowId} not found`, "WORKFLOW_NOT_FOUND", {
      workflowId,
    });
  }
}
```

## Security

### Authentication

- Use proper auth guards
- Use proper auth strategies
- Use proper token handling
- Use proper session management

```typescript
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any) {
    if (err || !user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
```

### Authorization

- Use proper role guards
- Use proper permission checks
- Use proper resource ownership
- Use proper access control

```typescript
@Injectable()
export class WorkflowGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const workflow = request.workflow;

    return workflow.userId === user.id;
  }
}
```

## Testing

### Unit Testing

- Test services
- Test repositories
- Test utilities
- Test guards

```typescript
describe("WorkflowService", () => {
  let service: WorkflowService;
  let repository: WorkflowRepository;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        WorkflowService,
        {
          provide: WorkflowRepository,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(WorkflowService);
    repository = module.get(WorkflowRepository);
  });

  it("should create workflow", async () => {
    const dto = { name: "Test Workflow" };
    const workflow = { id: "1", ...dto };

    jest.spyOn(repository, "create").mockResolvedValue(workflow);

    const result = await service.create(dto);
    expect(result).toEqual(workflow);
  });
});
```

### Integration Testing

- Test controllers
- Test modules
- Test middleware
- Test interceptors

```typescript
describe("WorkflowController", () => {
  let app: INestApplication;
  let repository: WorkflowRepository;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [WorkflowModule],
      controllers: [WorkflowController],
      providers: [WorkflowService, WorkflowRepository],
    }).compile();

    app = module.createNestApplication();
    repository = module.get(WorkflowRepository);
    await app.init();
  });

  it("should create workflow", async () => {
    const dto = { name: "Test Workflow" };
    const workflow = { id: "1", ...dto };

    jest.spyOn(repository, "create").mockResolvedValue(workflow);

    const response = await request(app.getHttpServer())
      .post("/workflows")
      .send(dto)
      .expect(201);

    expect(response.body).toEqual(workflow);
  });
});
```

## Logging

### Logging Structure

- Use proper log levels
- Use proper log format
- Use proper log context
- Use proper log rotation

```typescript
@Injectable()
export class LoggerService {
  private logger = new Logger("WorkflowService");

  log(message: string, context?: string) {
    this.logger.log(message, context);
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, trace, context);
  }
}
```

### Logging Patterns

- Log important events
- Log error details
- Log performance metrics
- Log security events

```typescript
@Injectable()
export class WorkflowService {
  constructor(private readonly logger: LoggerService) {}

  async executeWorkflow(id: string): Promise<void> {
    try {
      this.logger.log(`Starting workflow execution: ${id}`);
      const startTime = Date.now();

      await this.processWorkflow(id);

      const duration = Date.now() - startTime;
      this.logger.log(`Workflow execution completed: ${id} (${duration}ms)`);
    } catch (error) {
      this.logger.error(`Workflow execution failed: ${id}`, error.stack, {
        workflowId: id,
        error,
      });
      throw error;
    }
  }
}
```

## Performance

### Caching

- Use proper cache keys
- Use proper cache TTL
- Use proper cache invalidation
- Use proper cache storage

```typescript
@Injectable()
export class WorkflowService {
  constructor(
    private readonly cache: Cache,
    private readonly repository: WorkflowRepository
  ) {}

  async findById(id: string): Promise<Workflow> {
    const cacheKey = `workflow:${id}`;
    const cached = await this.cache.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const workflow = await this.repository.findById(id);
    await this.cache.set(cacheKey, JSON.stringify(workflow), 3600);
    return workflow;
  }
}
```

### Optimization

- Use proper indexing
- Use proper query optimization
- Use proper connection pooling
- Use proper resource management

```typescript
@Injectable()
export class DatabaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService
  ) {
    this.prisma.$on("query", (e) => {
      if (e.duration > 1000) {
        this.logger.warn(`Slow query: ${e.query} (${e.duration}ms)`);
      }
    });
  }
}
```

## Monitoring

### Health Checks

- Use proper health endpoints
- Use proper health metrics
- Use proper health reporting
- Use proper health alerts

```typescript
@Controller("health")
export class HealthController {
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck("database"),
      () => this.redis.pingCheck("redis"),
      () => this.queue.pingCheck("queue"),
    ]);
  }
}
```

### Metrics

- Use proper metric types
- Use proper metric labels
- Use proper metric aggregation
- Use proper metric visualization

```typescript
@Injectable()
export class MetricsService {
  private readonly workflowCounter = new Counter({
    name: "workflow_executions_total",
    help: "Total number of workflow executions",
    labelNames: ["status"],
  });

  recordWorkflowExecution(status: string) {
    this.workflowCounter.inc({ status });
  }
}
```
