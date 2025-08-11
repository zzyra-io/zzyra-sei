import { DatabaseService } from '../services/database.service';
import { CircuitBreakerDbService } from '../lib/blockchain/CircuitBreakerDbService';

async function resetSpecificCircuitBreakers() {
  const databaseService = new DatabaseService();
  const circuitBreakerService = new CircuitBreakerDbService(databaseService);

  try {
    console.log('🔧 Resetting specific circuit breakers...');

    // Common circuit breakers that might cause issues
    const commonCircuitIds = [
      'node-executor:HTTP_REQUEST',
      'node-executor:http_request',
      'workflow-executor:workflow-execution',
      'execution-worker:workflow-execution',
      'chain-1:user-1-transaction',
      'chain-84532:user-1-transaction',
      'api:http_request',
      'global:workflow-execution',
    ];

    console.log(
      `\n📋 Attempting to reset ${commonCircuitIds.length} common circuit breakers:`,
    );

    let resetCount = 0;
    for (const circuitId of commonCircuitIds) {
      try {
        await circuitBreakerService.resetState(circuitId);
        console.log(`✅ Reset: ${circuitId}`);
        resetCount++;
      } catch (error) {
        console.log(
          `⚠️  Could not reset ${circuitId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(
      `- Attempted to reset: ${commonCircuitIds.length} circuit breakers`,
    );
    console.log(`- Successfully reset: ${resetCount} circuit breakers`);

    // Also try to delete any OPEN circuit breakers
    console.log('\n🗑️  Deleting any OPEN circuit breakers...');
    const deleteResult =
      await databaseService.prisma.circuitBreakerState.deleteMany({
        where: {
          state: 'OPEN',
        },
      });

    console.log(`✅ Deleted ${deleteResult.count} OPEN circuit breakers`);

    console.log('\n✅ Circuit breaker reset completed');
    console.log('💡 You can now try running your workflows again');
  } catch (error) {
    console.error('❌ Failed to reset circuit breakers:', error);
  } finally {
    await databaseService.prisma.$disconnect();
  }
}

// Run the script
resetSpecificCircuitBreakers().catch(console.error);
