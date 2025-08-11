import { DatabaseService } from '../services/database.service';
import { CircuitBreakerDbService } from '../lib/blockchain/CircuitBreakerDbService';

async function clearAllCircuitBreakers() {
  const databaseService = new DatabaseService();
  const circuitBreakerService = new CircuitBreakerDbService(databaseService);

  try {
    console.log('🗑️  Clearing all circuit breaker states...');

    // Get all circuit breaker states directly from database
    const states = await databaseService.prisma.circuitBreakerState.findMany({
      orderBy: { updatedAt: 'desc' },
    });
    console.log(`Found ${states.length} circuit breaker states`);

    if (states.length === 0) {
      console.log('✅ No circuit breakers to clear');
      return;
    }

    // Show what we're about to delete
    console.log('\n📋 Circuit breakers to be deleted:');
    states.forEach((state, index) => {
      console.log(
        `${index + 1}. ${state.circuitId} (${state.state}) - ${state.failureCount} failures`,
      );
    });

    // Delete all circuit breaker states
    const deleteResult =
      await databaseService.prisma.circuitBreakerState.deleteMany({});

    console.log(`\n✅ Deleted ${deleteResult.count} circuit breaker states`);

    // Verify deletion with direct database query
    const remainingStates =
      await databaseService.prisma.circuitBreakerState.findMany();
    console.log(`Remaining circuit breakers: ${remainingStates.length}`);

    if (remainingStates.length === 0) {
      console.log('✅ All circuit breakers cleared successfully');
    } else {
      console.log('⚠️  Some circuit breakers may still exist');
      remainingStates.forEach((state) => {
        console.log(`  - ${state.circuitId} (${state.state})`);
      });
    }
  } catch (error) {
    console.error('❌ Failed to clear circuit breakers:', error);
  } finally {
    await databaseService.prisma.$disconnect();
  }
}

// Run the script
clearAllCircuitBreakers().catch(console.error);
