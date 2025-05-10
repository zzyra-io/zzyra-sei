import { Module } from '@nestjs/common';
import { CircuitBreaker, DEFAULT_CIRCUIT_CONFIG } from './CircuitBreaker';
import { CircuitBreakerDbService } from './CircuitBreakerDbService';

/**
 * Module that registers blockchain-related services
 * This allows proper DI for circuit breaker and related services
 */
@Module({
  providers: [
    {
      provide: CircuitBreaker,
      useFactory: () => new CircuitBreaker(DEFAULT_CIRCUIT_CONFIG)
    },
    CircuitBreakerDbService
  ],
  exports: [
    CircuitBreaker,
    CircuitBreakerDbService
  ]
})
export class BlockchainModule {}
