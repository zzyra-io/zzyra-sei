# Production-Grade AI Workflow Generation System

This directory contains a comprehensive, production-ready AI workflow generation system for Zyra. The system has been completely refactored from a single service into multiple specialized services that provide enterprise-grade features.

## Architecture Overview

### Core Services

#### 1. **EnhancedAiService** (`enhanced-ai.service.ts`)
- **Purpose**: Main orchestration service that coordinates all AI operations
- **Features**:
  - Secure prompt processing with injection protection
  - Multi-layered validation with auto-healing
  - Comprehensive audit logging
  - Workflow versioning integration
  - Performance monitoring and metrics

#### 2. **WorkflowValidatorService** (`services/workflow-validator.service.ts`)
- **Purpose**: Advanced workflow validation with business rule checking
- **Features**:
  - Schema validation using Zod
  - Business rule validation (trigger requirements, configurations)
  - Graph analysis (cycle detection, reachability, orphaned nodes)
  - Auto-healing for common issues
  - Security validation of generated code

#### 3. **SecurityService** (`services/security.service.ts`)
- **Purpose**: Comprehensive security validation and protection
- **Features**:
  - Prompt injection detection and sanitization
  - Static code analysis for dangerous patterns
  - Sandbox configuration for safe code execution
  - Domain validation for external requests
  - Security headers generation

#### 4. **AuditService** (`services/audit.service.ts`)
- **Purpose**: Complete audit trail and compliance logging
- **Features**:
  - Detailed event logging for all operations
  - Security violation tracking
  - User activity monitoring
  - Metrics collection and analysis
  - Security reporting and alerts

#### 5. **WorkflowVersioningService** (`services/workflow-versioning.service.ts`)
- **Purpose**: Version control and rollback capabilities
- **Features**:
  - Immutable workflow versioning
  - Rollback to previous versions
  - Version comparison and diff analysis
  - Automatic version management
  - Integrity checking with checksums

#### 6. **PromptService** (`services/prompt.service.ts`)
- **Purpose**: Modular and extensible prompt management
- **Features**:
  - Template-based prompt generation
  - Domain-specific prompt adaptations
  - User-level prompt customization
  - A/B testing capabilities
  - Dynamic prompt composition

#### 7. **ObservabilityService** (`services/observability.service.ts`)
- **Purpose**: Comprehensive monitoring and alerting
- **Features**:
  - Performance metrics collection
  - Distributed tracing
  - Health checks and monitoring
  - Alert management
  - Prometheus metrics export

#### 8. **FeedbackService** (`services/feedback.service.ts`)
- **Purpose**: Continuous learning and improvement
- **Features**:
  - User feedback collection and analysis
  - Learning pattern extraction
  - Prompt optimization recommendations
  - Performance trend analysis
  - User-specific insights

## Key Production Features

### 🔒 **Security**
- **Prompt Injection Protection**: Advanced detection and sanitization
- **Code Security Analysis**: Static analysis for dangerous patterns
- **Secure Sandboxing**: Safe execution environment configuration
- **Input Validation**: Comprehensive validation at all entry points

### 📊 **Validation & Quality**
- **Multi-Layer Validation**: Schema, business rules, and graph analysis
- **Auto-Healing**: Automatic correction of common issues
- **Quality Metrics**: Comprehensive quality scoring
- **Error Prevention**: Proactive issue detection

### 🔄 **Reliability**
- **Workflow Versioning**: Complete version control with rollback
- **Audit Trail**: Full traceability of all operations
- **Health Monitoring**: Real-time system health checks
- **Error Recovery**: Graceful error handling and recovery

### 📈 **Observability**
- **Performance Monitoring**: Detailed performance metrics
- **Distributed Tracing**: Request tracing across services
- **Alerting System**: Proactive issue detection and alerting
- **Analytics Dashboard**: Comprehensive system analytics

### 🎯 **Continuous Improvement**
- **Feedback Loop**: User feedback collection and analysis
- **Learning System**: Pattern recognition and optimization
- **A/B Testing**: Prompt and feature testing capabilities
- **Performance Optimization**: Data-driven improvements

## Integration Guide

### Basic Usage

```typescript
import { EnhancedAiService } from './enhanced-ai.service';

// Initialize with all dependencies
const aiService = new EnhancedAiService(
  workflowValidator,
  securityService,
  auditService,
  versioningService
);

// Generate a workflow with full validation and audit
const result = await aiService.generateWorkflow(
  "Create a DeFi arbitrage workflow",
  userId,
  sessionId,
  { detailedMode: true, prefillConfig: true },
  [], // existing nodes
  [], // existing edges
  { 
    ipAddress: '192.168.1.1',
    userAgent: 'Browser',
    workflowId: 'workflow-123',
    createVersion: true
  }
);
```

### Advanced Features

```typescript
// Get comprehensive analytics
const analytics = await aiService.getAnalytics(userId, { 
  start: new Date('2024-01-01'), 
  end: new Date() 
});

// Rollback to previous version
const rollback = await aiService.rollbackWorkflow(
  'workflow-123',
  'version-456',
  userId,
  'Testing rollback functionality'
);

// Get system health
const health = observabilityService.getSystemHealth();

// Record custom metrics
observabilityService.recordMetric('custom_operation', 1, 'count', {
  operation_type: 'workflow_generation',
  user_type: 'premium'
});
```

## Configuration

### Environment Variables
```bash
# Security Configuration
ALLOWED_DOMAINS=api.openrouter.ai,api.openai.com,localhost

# OpenRouter API
OPENROUTER_API_KEY=your_api_key_here

# Application Version (for audit logging)
APP_VERSION=1.0.0
```

### Service Dependencies
All services are designed to be dependency-injected through NestJS. Register them in your module:

```typescript
@Module({
  providers: [
    WorkflowValidatorService,
    SecurityService,
    AuditService,
    WorkflowVersioningService,
    PromptService,
    ObservabilityService,
    FeedbackService,
    EnhancedAiService,
  ],
  exports: [EnhancedAiService],
})
export class AiModule {}
```

## Monitoring and Alerting

### Health Checks
The system includes automatic health monitoring for:
- Memory usage
- Event loop lag
- Custom application metrics
- Service availability

### Metrics Collection
Automatic collection of:
- Request duration and throughput
- Error rates and types
- Resource utilization
- Business metrics

### Alert Conditions
Automatic alerts for:
- High error rates
- Slow operations
- Security violations
- System resource issues

## Security Considerations

### Input Validation
- All user inputs are sanitized before processing
- Prompt injection attacks are detected and blocked
- Generated code is analyzed for security vulnerabilities

### Audit Compliance
- Complete audit trail of all operations
- Security event logging and monitoring
- User activity tracking
- Compliance reporting capabilities

## Performance Optimizations

### Caching
- Template caching for improved performance
- Metric aggregation for reduced memory usage
- Intelligent cleanup of old data

### Resource Management
- Configurable limits and timeouts
- Memory usage monitoring
- Automatic cleanup of stale data

## Future Enhancements

### Planned Features
- Machine learning-based prompt optimization
- Advanced pattern recognition
- Real-time collaboration features
- Enhanced A/B testing framework

### Scalability
- Horizontal scaling support
- Distributed caching
- Load balancing capabilities
- Database persistence layer

This architecture provides a solid foundation for enterprise-grade AI workflow generation with comprehensive monitoring, security, and quality assurance capabilities.