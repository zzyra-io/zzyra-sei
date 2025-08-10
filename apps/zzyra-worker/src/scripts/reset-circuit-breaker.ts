import { DatabaseService } from '../services/database.service';
import { CircuitBreakerDbService } from '../lib/blockchain/CircuitBreakerDbService';

async function resetCircuitBreaker() {
  const databaseService = new DatabaseService();
  const circuitBreakerService = new CircuitBreakerDbService(databaseService);

  try {
    console.log('🔧 Resetting circuit breaker states...');

    // Get all circuit breaker states
    const states = await circuitBreakerService.getAllStates();
    console.log(`Found ${states.length} circuit breaker states`);

    // Reset all workflow and execution related circuit breakers
    const workflowCircuitIds = [
      'workflow:5a4c5498-2b31-4f35-bd70-68da95fb925d',
      'execution-worker:workflow-execution',
      'workflow-executor:workflow-execution',
    ];

    for (const circuitId of workflowCircuitIds) {
      try {
        await circuitBreakerService.resetState(circuitId);
        console.log(`✅ Reset circuit breaker: ${circuitId}`);
      } catch (error) {
        console.log(`⚠️ Failed to reset ${circuitId}:`, error);
      }
    }

    // Also reset any OPEN circuit breakers
    for (const state of states) {
      if (state.state === 'OPEN') {
        try {
          await circuitBreakerService.resetState(state.circuitId);
          console.log(`✅ Reset OPEN circuit breaker: ${state.circuitId}`);
        } catch (error) {
          console.log(`⚠️ Failed to reset ${state.circuitId}:`, error);
        }
      }
    }

    console.log('✅ Circuit breaker reset completed');
  } catch (error) {
    console.error('❌ Failed to reset circuit breakers:', error);
  } finally {
    await databaseService.prisma.$disconnect();
  }
}

// Run the script
resetCircuitBreaker().catch(console.error);
