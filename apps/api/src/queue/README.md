# Scheduled Workflow Execution System

This system allows you to execute workflows at specific times using RabbitMQ with TTL (Time To Live) for message delays.

## Features

- **Immediate Execution**: Execute workflows right away
- **Scheduled Execution**: Execute workflows at a specific date/time
- **Cron Jobs**: Recurring workflow executions (placeholder for future implementation)
- **Dead Letter Queues**: Failed jobs are moved to DLQ for investigation
- **Retry Queues**: Support for retrying failed executions

## Queue Architecture

```
ZYRA.EXECUTION_QUEUE          - Main execution queue (workers consume from here)
ZYRA.EXECUTION_QUEUE.DELAYED  - Delayed messages (TTL expires → routes to main queue)
ZYRA.EXECUTION_QUEUE.RETRY    - Retry queue for failed executions
ZYRA.EXECUTION_QUEUE.DLQ      - Dead letter queue for permanently failed jobs
ZYRA.EXECUTION_SCHEDULED      - Exchange for cron/recurring jobs
```

## API Usage

### 1. Immediate Execution

```bash
POST /api/workflows/{workflowId}/execute
Content-Type: application/json

{}
```

### 2. Scheduled Execution

```bash
POST /api/workflows/{workflowId}/execute
Content-Type: application/json

{
  "scheduledTime": "2024-12-25T10:00:00.000Z",
  "input": {
    "key": "value"
  }
}
```

### 3. Response

```json
{
  "executionId": "exec_1234567890_abcdef123",
  "status": "scheduled",
  "scheduledTime": "2024-12-25T10:00:00.000Z"
}
```

## How It Works

### Scheduled Execution Flow:

1. **API Request**: Client sends POST with `scheduledTime`
2. **Execution Record**: Creates execution record in database
3. **Calculate Delay**: `delay = scheduledTime - now`
4. **Queue Message**: Sends message to `DELAYED_QUEUE` with TTL = delay
5. **TTL Expires**: RabbitMQ automatically routes message to main `EXECUTION_QUEUE`
6. **Worker Processing**: Worker picks up message and executes workflow

### Message Format:

```json
{
  "executionId": "exec_1234567890_abcdef123",
  "workflowId": "workflow_123",
  "userId": "user_456",
  "scheduledTime": "2024-12-25T10:00:00.000Z"
}
```

## Environment Variables

```bash
RABBITMQ_URL=amqp://guest:guest@localhost:5672
QUEUE_PREFETCH_COUNT=1  # Number of messages to prefetch per worker
```

## Queue Monitoring

Get queue statistics:

```typescript
const stats = await queueService.getQueueStats();
console.log(stats);
// {
//   execution: 5,    // Jobs ready to execute
//   retry: 2,        // Jobs waiting to retry
//   dlq: 1,          // Permanently failed jobs
//   delayed: 10      // Jobs scheduled for future
// }
```

## Worker Implementation

Your worker should consume from `ZYRA.EXECUTION_QUEUE`:

```typescript
// In your worker
channel.consume(EXECUTION_QUEUE, async (msg) => {
  if (msg) {
    const payload = JSON.parse(msg.content.toString());
    const { executionId, workflowId, userId } = payload;

    try {
      // Execute the workflow
      await executeWorkflow(executionId, workflowId, userId);
      channel.ack(msg);
    } catch (error) {
      // Reject and requeue for retry
      channel.nack(msg, false, true);
    }
  }
});
```

## Advanced Features

### Cron Jobs (Future Implementation)

```bash
POST /api/workflows/{workflowId}/execute
{
  "cronExpression": "0 9 * * 1-5"  // Every weekday at 9 AM
}
```

### Cancel Scheduled Jobs

```typescript
await queueService.cancelScheduledJob(executionId);
```

## Error Handling

- **Immediate Failure**: If scheduling fails, execution status is set to "failed"
- **TTL Expiry**: Messages automatically route to main queue when time arrives
- **Worker Failure**: Failed jobs can be retried or moved to DLQ
- **Dead Letters**: Permanently failed jobs are stored in DLQ for investigation

## Best Practices

1. **Time Zones**: Always use UTC timestamps for `scheduledTime`
2. **Validation**: Validate that `scheduledTime` is in the future
3. **Monitoring**: Monitor queue depths and DLQ for issues
4. **Cleanup**: Implement cleanup for old completed executions
5. **Scaling**: Use multiple workers to handle high throughput

## Limitations

- **Maximum Delay**: RabbitMQ TTL has a maximum value (2^32-1 milliseconds ≈ 49 days)
- **Precision**: TTL precision is in milliseconds, not exact to the second
- **Persistence**: Scheduled jobs survive server restarts (messages are persistent)
- **Cancellation**: Current implementation doesn't support canceling scheduled jobs (requires additional tracking)
