import { CIRCUIT_BREAKER } from '../config';

/**
 * Test script to verify circuit breaker configuration
 * Run with: npx ts-node src/scripts/test-circuit-breaker-config.ts
 */
async function testCircuitBreakerConfig() {
  console.log('🔧 Testing Circuit Breaker Configuration');
  console.log('=====================================');

  console.log(`Enabled: ${CIRCUIT_BREAKER.enabled}`);
  console.log(`Failure Threshold: ${CIRCUIT_BREAKER.failureThreshold}`);
  console.log(`Success Threshold: ${CIRCUIT_BREAKER.successThreshold}`);
  console.log(`Reset Timeout: ${CIRCUIT_BREAKER.resetTimeout}ms`);

  console.log('\n📋 Environment Variables:');
  console.log(
    `CIRCUIT_BREAKER_ENABLED: ${process.env.CIRCUIT_BREAKER_ENABLED || 'not set (defaults to true)'}`,
  );
  console.log(
    `CIRCUIT_BREAKER_FAILURE_THRESHOLD: ${process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD || 'not set (defaults to 5)'}`,
  );
  console.log(
    `CIRCUIT_BREAKER_SUCCESS_THRESHOLD: ${process.env.CIRCUIT_BREAKER_SUCCESS_THRESHOLD || 'not set (defaults to 2)'}`,
  );
  console.log(
    `CIRCUIT_BREAKER_RESET_TIMEOUT: ${process.env.CIRCUIT_BREAKER_RESET_TIMEOUT || 'not set (defaults to 30000)'}`,
  );

  console.log('\n💡 Usage Examples:');
  console.log('To disable circuit breaker: CIRCUIT_BREAKER_ENABLED=false');
  console.log(
    'To enable circuit breaker: CIRCUIT_BREAKER_ENABLED=true (or omit)',
  );
  console.log('To set custom thresholds: CIRCUIT_BREAKER_FAILURE_THRESHOLD=10');

  if (CIRCUIT_BREAKER.enabled) {
    console.log('\n✅ Circuit breaker is ENABLED');
    console.log(
      '   - Operations will be blocked when failure threshold is reached',
    );
    console.log(
      '   - Circuit will open/close based on success/failure patterns',
    );
  } else {
    console.log('\n❌ Circuit breaker is DISABLED');
    console.log('   - All operations will be allowed regardless of failures');
    console.log('   - No circuit breaker logic will be applied');
  }
}

// Run the test
testCircuitBreakerConfig().catch(console.error);
