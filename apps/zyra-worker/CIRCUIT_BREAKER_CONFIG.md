# Circuit Breaker Configuration

The Zyra worker includes a configurable circuit breaker system that can be enabled or disabled via environment variables.

## Overview

The circuit breaker pattern prevents cascading failures by monitoring the success/failure of operations and temporarily blocking operations when a failure threshold is reached.

## Environment Variables

### `CIRCUIT_BREAKER_ENABLED`

- **Default**: `true` (enabled)
- **Values**: `true` | `false`
- **Description**: Master switch to enable/disable circuit breaker functionality

### `CIRCUIT_BREAKER_FAILURE_THRESHOLD`

- **Default**: `5`
- **Description**: Number of consecutive failures before opening the circuit

### `CIRCUIT_BREAKER_SUCCESS_THRESHOLD`

- **Default**: `2`
- **Description**: Number of successful operations needed to close the circuit in half-open state

### `CIRCUIT_BREAKER_RESET_TIMEOUT`

- **Default**: `30000` (30 seconds)
- **Description**: Time in milliseconds before attempting to reset the circuit (transition to half-open)

## Usage Examples

### Enable Circuit Breaker (Default)

```bash
# No environment variable needed - defaults to enabled
CIRCUIT_BREAKER_ENABLED=true
```

### Disable Circuit Breaker

```bash
CIRCUIT_BREAKER_ENABLED=false
```

### Custom Configuration

```bash
CIRCUIT_BREAKER_ENABLED=true
CIRCUIT_BREAKER_FAILURE_THRESHOLD=10
CIRCUIT_BREAKER_SUCCESS_THRESHOLD=3
CIRCUIT_BREAKER_RESET_TIMEOUT=60000
```

## Circuit States

1. **CLOSED**: Normal operation, all requests are allowed
2. **OPEN**: Circuit is open, all requests are blocked
3. **HALF_OPEN**: Testing if the system has recovered, limited requests allowed

## Testing Configuration

Run the test script to verify your circuit breaker configuration:

```bash
cd apps/zzyra-worker
npx ts-node src/scripts/test-circuit-breaker-config.ts
```

## Implementation Details

The circuit breaker is implemented at multiple levels:

1. **Node Level**: Per-node-type circuit breakers
2. **Workflow Level**: Per-workflow circuit breakers
3. **User Level**: Per-user circuit breakers
4. **Global Level**: System-wide circuit breaker

When disabled (`CIRCUIT_BREAKER_ENABLED=false`):

- All `isAllowed()` calls return `true`
- All `recordSuccess()` and `recordFailure()` calls are no-ops
- No circuit breaker logic is applied

## Troubleshooting

### Circuit Breaker is OPEN

If you see "Circuit breaker is OPEN" errors:

1. **Check if circuit breaker is enabled**:

   ```bash
   echo $CIRCUIT_BREAKER_ENABLED
   ```

2. **Disable circuit breaker temporarily**:

   ```bash
   export CIRCUIT_BREAKER_ENABLED=false
   ```

3. **Reset circuit breaker state**:

   ```bash
   npx ts-node src/scripts/reset-circuit-breaker.ts
   ```

4. **Check circuit breaker status**:
   ```bash
   curl http://localhost:3009/health
   ```

### Performance Impact

When circuit breaker is disabled:

- ✅ No performance overhead
- ✅ All operations allowed
- ❌ No failure protection
- ❌ No cascading failure prevention

When circuit breaker is enabled:

- ⚠️ Minimal performance overhead
- ✅ Failure protection
- ✅ Cascading failure prevention
- ⚠️ Operations may be blocked during failures
