import { Module } from '@nestjs/common';
import { CircuitBreaker, DEFAULT_CIRCUIT_CONFIG } from './CircuitBreaker';
import { CircuitBreakerDbService } from './CircuitBreakerDbService';
import { CIRCUIT_BREAKER } from '../../config';
import { PimlicoModule } from '../../services/pimlico.module';

/**
 * Module that registers blockchain-related services
 * This allows proper DI for circuit breaker and related services
 */
@Module({
  imports: [PimlicoModule],
  providers: [
    {
      provide: CircuitBreaker,
      useFactory: () =>
        new CircuitBreaker({
          ...DEFAULT_CIRCUIT_CONFIG,
          enabled: CIRCUIT_BREAKER.enabled,
          failureThreshold: CIRCUIT_BREAKER.failureThreshold,
          successThreshold: CIRCUIT_BREAKER.successThreshold,
          halfOpenSuccessThreshold: CIRCUIT_BREAKER.successThreshold, // Map to the correct property
          resetTimeout: CIRCUIT_BREAKER.resetTimeout,
        }),
    },
    CircuitBreakerDbService,
  ],
  exports: [CircuitBreaker, CircuitBreakerDbService, PimlicoModule],
})
export class BlockchainModule {}
