import { Injectable, Logger } from '@nestjs/common';
import { createServiceClient } from '../../lib/supabase/serviceClient';
import { CircuitBreaker, CircuitState } from './CircuitBreaker';

/**
 * Service to handle database operations for the circuit breaker pattern
 * This ensures that circuit breaker state is persisted across worker restarts
 * and provides a consistent view of the state across multiple worker instances.
 */
@Injectable()
export class CircuitBreakerDbService {
  private readonly logger = new Logger(CircuitBreakerDbService.name);
  
  constructor(private readonly circuitBreaker: CircuitBreaker) {}
  
  /**
   * Generate a unique circuit ID for tracking
   */
  generateCircuitId(chainId: number, userId: string, operationType: string): string {
    return `${chainId}-${userId}-${operationType}`;
  }
  
  /**
   * Check if operations are allowed for a specific circuit
   */
  async isOperationAllowed(chainId: number, userId: string, operationType: string): Promise<boolean> {
    const circuitId = this.generateCircuitId(chainId, userId, operationType);
    
    try {
      const circuitId = `${chainId}-${userId}-${operationType}`;
      
      const { data } = await this.getCircuitState(circuitId);
      
      // No circuit state exists yet, so allow the operation
      if (!data || data.length === 0) return true;
      
      const state = data[0].state;
      
      // Only allow operations if circuit is CLOSED or HALF_OPEN
      return state === CircuitState.CLOSED || state === CircuitState.HALF_OPEN;
    } catch (error) {
      console.error('Error checking circuit breaker state:', error);
      // Default to allowing operation if there's an error checking state
      return true;
    }
  }

  /**
   * Get the current state of a circuit breaker
   */
  async getCircuitState(circuitId: string) {
    const supabase = createServiceClient();
    
    const response = await supabase
      .from('circuit_breaker_state')
      .select('state')
      .eq('circuit_id', circuitId);
    
    return response;
  }

  /**
   * Record a successful operation
   */
  async recordSuccess(params: {
    chainId: number;
    userId: string;
    operation: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    // Generate circuit ID from parameters
    const circuitId = `${params.chainId}-${params.userId}-${params.operation}`;
    try {
      const supabase = createServiceClient();
      const now = new Date().toISOString();
      
      // Check if the circuit exists
      const existingResponse = await supabase
        .from('circuit_breaker_state')
        .select('id, state, success_count, failure_count')
        .eq('circuit_id', circuitId);
      
      let state = CircuitState.CLOSED;
      
      // If circuit exists, transition state if needed
      if (existingResponse.data && existingResponse.data.length > 0) {
        // If we're in HALF_OPEN and get a success, transition to CLOSED
        if (existingResponse.data[0].state === CircuitState.HALF_OPEN.toString()) {
          state = CircuitState.CLOSED;
        } else {
          // Convert the string state from DB to CircuitState enum
          const stateStr = existingResponse.data[0].state;
          if (stateStr === CircuitState.CLOSED.toString()) {
            state = CircuitState.CLOSED;
          } else if (stateStr === CircuitState.OPEN.toString()) {
            state = CircuitState.OPEN;
          } else if (stateStr === CircuitState.HALF_OPEN.toString()) {
            state = CircuitState.HALF_OPEN;
          } else {
            // Default to current state if unknown
            state = CircuitState.CLOSED;
          }
        }
        
        // Update existing circuit
        await supabase
          .from('circuit_breaker_state')
          .update({
            state: state.toString(),
            success_count: (existingResponse.data[0].success_count || 0) + 1,
            last_success_time: now,
            updated_at: now
          })
          .eq('id', existingResponse.data[0].id);
      } else {
        // Create new circuit in CLOSED state
        await supabase
          .from('circuit_breaker_state')
          .insert({
            circuit_id: circuitId,
            state: CircuitState.CLOSED,
            success_count: 1,
            failure_count: 0,
            last_success_time: now,
            created_at: now,
            updated_at: now
          });
      }
    } catch (error) {
      console.error('Error recording circuit breaker success:', error);
    }
  }

  /**
   * Record a failed operation
   */
  async recordFailure(params: {
    chainId: number;
    userId: string;
    operation: string;
    metadata?: Record<string, any>;
  }, threshold = 5): Promise<void> {
    // Generate circuit ID from parameters
    const circuitId = `${params.chainId}-${params.userId}-${params.operation}`;
    try {
      const supabase = createServiceClient();
      const now = new Date().toISOString();
      
      // Check if the circuit exists
      const existingResponse = await supabase
        .from('circuit_breaker_state')
        .select('id, state, failure_count, success_count')
        .eq('circuit_id', circuitId);
      
      let state = CircuitState.CLOSED;
      
      // If circuit exists, update state based on failure threshold
      if (existingResponse.data && existingResponse.data.length > 0) {
        const currentFailures = existingResponse.data[0].failure_count || 0;
        
        // If failures exceed threshold, open the circuit
        if (currentFailures + 1 >= threshold) {
          state = CircuitState.OPEN;
        } else {
          // Convert the string state to enum
          const stateStr = existingResponse.data[0].state;
          if (stateStr === CircuitState.CLOSED.toString()) {
            state = CircuitState.CLOSED;
          } else if (stateStr === CircuitState.OPEN.toString()) {
            state = CircuitState.OPEN;
          } else if (stateStr === CircuitState.HALF_OPEN.toString()) {
            state = CircuitState.HALF_OPEN;
          } else {
            // Default to CLOSED if unknown state
            state = CircuitState.CLOSED;
          }
        }
        
        // Update existing circuit
        await supabase
          .from('circuit_breaker_state')
          .update({
            state,
            failure_count: (existingResponse.data[0].failure_count || 0) + 1,
            last_failure_time: now,
            updated_at: now,
            last_half_open_time: state === CircuitState.HALF_OPEN ? now : undefined
          })
          .eq('id', existingResponse.data[0].id);
      } else {
        // Create new circuit - if first operation is a failure, still create in CLOSED state
        // but record the failure
        await supabase
          .from('circuit_breaker_state')
          .insert({
            circuit_id: circuitId,
            state: CircuitState.CLOSED.toString(), // Start in CLOSED even on first failure
            success_count: 0,
            failure_count: 1,
            last_failure_time: now,
            created_at: now,
            updated_at: now
          });
      }
    } catch (error) {
      console.error('Error recording circuit breaker failure:', error);
    }
  }

  /**
   * Log a blockchain transaction
   */
  async logTransaction(transaction: {
    user_id: string;
    node_id: string;
    execution_id: string;
    chain_id: number;
    to_address: string;
    value?: string;
    data?: string | null;
    gas_limit?: string | null;
    hash?: string | null;
    status?: string;
    error?: string | null;
    retry_count?: number;
    wallet_address: string;
    created_at?: string;
    updated_at?: string;
  }): Promise<void> {
    try {
      const supabase = createServiceClient();
      const now = new Date().toISOString();
      
      // Insert transaction record
      await supabase
        .from('blockchain_transactions')
        .insert({
          user_id: transaction.user_id,
          node_id: transaction.node_id,
          execution_id: transaction.execution_id,
          chain_id: transaction.chain_id,
          to_address: transaction.to_address,
          value: transaction.value || '0',
          data: transaction.data || null,
          gas_limit: transaction.gas_limit || null,
          hash: transaction.hash || null,
          status: transaction.status || 'PENDING',
          error: transaction.error || null,
          retry_count: transaction.retry_count || 0,
          wallet_address: transaction.wallet_address,
          created_at: transaction.created_at || now,
          updated_at: transaction.updated_at || now
        });
    } catch (error) {
      console.error('Error logging blockchain transaction:', error);
    }
  }

  /**
   * Update a transaction status
   */
  async updateTransactionStatus(
    transactionId: string,
    status: string,
    details: {
      transactionHash?: string;
      gasUsed?: string;
      gasPrice?: string;
      errorMessage?: string;
      retryCount?: number;
    } = {}
  ): Promise<void> {
    try {
      const supabase = createServiceClient();
      const updateData: Record<string, any> = {
        status,
        updated_at: new Date().toISOString()
      };
      
      // Add optional fields if provided
      if (details.transactionHash) {
        updateData.transaction_hash = details.transactionHash;
      }
      
      if (details.gasUsed) {
        updateData.gas_used = details.gasUsed;
      }
      
      if (details.gasPrice) {
        updateData.gas_price = details.gasPrice;
      }
      
      if (details.errorMessage) {
        updateData.error_message = details.errorMessage;
      }
      
      if (details.retryCount !== undefined) {
        updateData.retry_count = details.retryCount;
      }
      
      // Add confirmation time if status is confirmed
      if (status === 'confirmed') {
        updateData.confirmed_at = new Date().toISOString();
      }
      
      await supabase
        .from('blockchain_transactions')
        .update(updateData)
        .eq('id', transactionId);
    } catch (error) {
      console.error('Error updating transaction status:', error);
    }
  }

  async getTransactionByHash(hash: string): Promise<any> {
    try {
      const supabase = createServiceClient();
      const { data, error } = await supabase
        .from('blockchain_transactions')
        .select('*')
        .eq('hash', hash)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching transaction by hash:', error);
      return null;
    }
  }

  async logTransactionUpdate(
    transactionId: string,
    updates: Partial<{
      status: string;
      error: string;
      block_number: number;
      gas_used: string;
      effective_gas_price: string;
      retry_count?: number;
    }>,
  ): Promise<void> {
    try {
      const supabase = createServiceClient();
      
      await supabase
        .from('blockchain_transactions')
        .update(updates)
        .eq('id', transactionId);
    } catch (error) {
      console.error('Error logging transaction update:', error);
    }
  }
}
