# Dynamic + ZeroDev Integration Analysis for Production ERC-20 Transfers on SEI Testnet

## Executive Summary

This document provides a comprehensive analysis of Zyra's Dynamic Wallet and ZeroDev Account Abstraction integration for enabling production-ready, automated ERC-20 token transfers on SEI testnet. The analysis identifies critical security gaps, architectural improvements, and provides a detailed implementation roadmap.

## 1. Current Architecture Assessment

### 1.1 Authentication & Wallet Integration

**Dynamic Integration:**
- UI uses `DynamicContextProvider` with `ZeroDevSmartWalletConnectors` for AA-enabled wallets
- JWT-based authentication via `DynamicJwtService` with RS256 verification
- User wallets stored in database with Dynamic metadata and chain associations
- Session management through access/refresh tokens with 1-hour/7-day expiry

**ZeroDev Integration:**
- Account Abstraction through `createKernelAccountClient` with bundler/paymaster
- EntryPoint v0.7 (`0x0000000071727De22E5E9d8BAf0edAc6f37da032`)
- Gas sponsorship via ZeroDev paymaster for sponsored transactions
- Smart wallet deployment handled through factory patterns

### 1.2 Session Key Architecture

**Current Implementation:**
- Session keys generated server-side with encrypted private key storage (AES-256-GCM)
- Permissions model: operations, per-tx limits, daily limits, allowed contracts, emergency stops
- Off-chain validation in API with comprehensive policy enforcement
- Usage tracking and anomaly detection through monitoring service

**Security Features:**
- Scrypt-derived encryption keys from user signatures
- Time-based expiry with automatic cleanup
- Rate limiting and velocity checks
- Comprehensive audit logging of all operations

### 1.3 Transaction Execution Flow

**Current Paths:**
1. **AA Path**: Creates kernel client → encodes calls → sends user operation
2. **Legacy Path**: Direct EVM transactions for non-AA chains
3. **Validation**: Session key validation → spending limit checks → execution

## 2. Specific ERC-20 Execution Issues Identified

### 2.1 Critical Configuration Issues

**Chain ID Misalignment (FIXED):**
- ✅ Worker now uses consistent SEI testnet chain ID 1328
- ✅ RPC URLs now environment-driven via `SEI_EVM_RPC_URL`

**ERC-20 Encoding Issues (FIXED):**
- ✅ Replaced manual hex encoding with decimals-aware `parseUnits()`
- ✅ Proper ERC-20 ABI usage with `encodeFunctionData()`
- ✅ Token decimals queried dynamically from contract

### 2.2 Remaining Architecture Gaps

**Session Key Policy Enforcement:**
- ❌ **CRITICAL**: No on-chain session key validator installation
- ❌ Policies only enforced off-chain (API validation)
- ❌ No guarantee that smart wallet respects spending limits on-chain

**ERC-20 Allowance Management:**
- ❌ No automated `approve()` handling for complex DeFi interactions
- ❌ Missing allowance checks before `transferFrom()` operations
- ❌ No support for gasless ERC-20 meta-transactions

**Gas and Error Handling:**
- ⚠️ Paymaster configuration hardcoded, not environment-driven
- ⚠️ Limited retry logic for SEI network-specific issues
- ⚠️ Insufficient error categorization for user-facing messages

## 3. Production-Ready Architecture Recommendations

### 3.1 On-Chain Policy Enforcement

```typescript
// Install ZeroDev Session Key Validator during authorization
interface SessionKeyPolicy {
  allowedSelectors: string[]; // ['0xa9059cbb'] for transfer()
  tokenAllowlist: string[];   // Permitted ERC-20 contracts
  recipientAllowlist?: string[]; // Optional recipient restrictions
  spendingLimits: {
    perTransaction: bigint;
    dailyLimit: bigint;
    resetTimestamp: bigint;
  };
  validUntil: bigint;
}

// On session key creation:
const validator = await sessionKeyValidatorFactory.create({
  sessionKey: sessionPublicKey,
  policy: encodePolicyData(policy),
  owner: smartWalletOwner
});

await smartWallet.installPlugin(validator);
```

### 3.2 Enhanced ERC-20 Handling

```typescript
interface ERC20TransferRequest {
  tokenAddress: string;
  recipient: string;
  amount: string; // Human-readable units
  requireAllowance?: boolean; // For router/DEX interactions
  slippageProtection?: number; // For DEX swaps
}

// Automated allowance management
async function executeERC20Transfer(request: ERC20TransferRequest) {
  const decimals = await getTokenDecimals(request.tokenAddress);
  const amountWei = parseUnits(request.amount, decimals);
  
  // Check current allowance if using transferFrom pattern
  if (request.requireAllowance) {
    const allowance = await checkAllowance(token, owner, spender);
    if (allowance < amountWei) {
      await approveToken(token, spender, amountWei);
    }
  }
  
  // Execute transfer with proper encoding
  const callData = encodeFunctionData({
    abi: ERC20_ABI,
    functionName: 'transfer',
    args: [request.recipient, amountWei]
  });
  
  return await kernelClient.sendUserOperation({ callData });
}
```

### 3.3 Environment-Driven Configuration

```typescript
// Unified configuration across UI/API/Worker
interface NetworkConfig {
  chainId: number;
  rpcUrl: string;
  bundlerUrl: string;
  paymasterUrl: string;
  entryPoint: string;
  blockExplorer: string;
  gasPolicy: {
    maxFeePerGas: string;
    maxPriorityFeePerGas: string;
    gasLimit: number;
  };
}

const SEI_TESTNET: NetworkConfig = {
  chainId: 1328,
  rpcUrl: process.env.SEI_EVM_RPC_URL!,
  bundlerUrl: process.env.ZERODEV_BUNDLER_URL!,
  paymasterUrl: process.env.ZERODEV_PAYMASTER_URL!,
  entryPoint: process.env.ENTRYPOINT_V07!,
  blockExplorer: process.env.SEI_EXPLORER_URL!,
  gasPolicy: {
    maxFeePerGas: process.env.SEI_MAX_FEE_PER_GAS || '0x9c7652400',
    maxPriorityFeePerGas: process.env.SEI_MAX_PRIORITY_FEE || '0x3b9aca00',
    gasLimit: parseInt(process.env.SEI_GAS_LIMIT || '500000')
  }
};
```

## 4. Detailed Implementation Plan

### 4.1 Priority 0: Critical Security (Immediate - 1-2 days)

**P0.1: Install ZeroDev Session Key Validator**
```typescript
// apps/ui/components/enhanced-blockchain-authorization-modal.tsx
const installSessionKeyValidator = async (sessionKey: string, policy: SessionKeyPolicy) => {
  const validator = await sessionKeyValidatorFactory.createSessionKeyValidator({
    sessionKey: sessionKey,
    validUntil: policy.validUntil,
    allowedSelectors: ['0xa9059cbb'], // transfer(address,uint256)
    spendingLimit: policy.spendingLimits.perTransaction,
    tokenAllowlist: policy.tokenAllowlist
  });
  
  await smartWallet.installPlugin(validator);
  return validator.address;
};
```

**P0.2: Environment Configuration Consolidation**
```bash
# Required environment variables across all services
SEI_EVM_RPC_URL=https://evm-rpc.sei-apis.com
ZERODEV_PROJECT_ID=8e6f4057-e935-485f-9b6d-f14696e92654
ZERODEV_BUNDLER_URL=https://rpc.zerodev.app/api/v3/.../chain/1328
ZERODEV_PAYMASTER_URL=https://rpc.zerodev.app/api/v3/.../chain/1328
ENTRYPOINT_V07=0x0000000071727De22E5E9d8BAf0edAc6f37da032
```

**P0.3: Token Allowlist Enforcement**
```typescript
// apps/api/src/session-keys/session-keys.service.ts
async validateERC20Transfer(sessionKeyId: string, tokenAddress: string, recipient: string, amount: string) {
  const sessionKey = await this.getSessionKeyById(sessionKeyId);
  const permission = sessionKey.permissions.find(p => p.operation === 'erc20_transfer');
  
  // Enforce token allowlist
  if (permission.allowedContracts.length > 0 && 
      !permission.allowedContracts.includes(tokenAddress.toLowerCase())) {
    throw new Error(`Token ${tokenAddress} not in allowlist`);
  }
  
  // Enforce recipient allowlist (if specified)
  if (permission.recipientAllowlist?.length > 0 && 
      !permission.recipientAllowlist.includes(recipient.toLowerCase())) {
    throw new Error(`Recipient ${recipient} not in allowlist`);
  }
  
  return { isValid: true, errors: [] };
}
```

### 4.2 Priority 1: Core Functionality (3-5 days)

**P1.1: Enhanced ERC-20 Support**
```typescript
// apps/zyra-worker/src/services/erc20.service.ts
@Injectable()
export class ERC20Service {
  async executeTransfer(params: {
    tokenAddress: string;
    recipient: string;
    amount: string;
    chainId: number;
    kernelClient: any;
  }) {
    // Get token metadata
    const [decimals, symbol, balance] = await Promise.all([
      this.getTokenDecimals(params.tokenAddress, params.chainId),
      this.getTokenSymbol(params.tokenAddress, params.chainId),
      this.getTokenBalance(params.tokenAddress, kernelClient.account.address, params.chainId)
    ]);
    
    // Convert to base units
    const amountBase = parseUnits(params.amount, decimals);
    
    // Validate balance
    if (balance < amountBase) {
      throw new Error(`Insufficient ${symbol} balance`);
    }
    
    // Encode transfer
    const callData = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [params.recipient, amountBase]
    });
    
    // Execute via AA
    return await params.kernelClient.sendUserOperation({
      callData: await params.kernelClient.account.encodeCalls([{
        to: params.tokenAddress,
        value: 0n,
        data: callData
      }])
    });
  }
}
```

**P1.2: Comprehensive Error Handling**
```typescript
// apps/zyra-worker/src/services/error-handler.service.ts
export enum TransactionErrorType {
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  TOKEN_NOT_ALLOWED = 'TOKEN_NOT_ALLOWED',
  SPENDING_LIMIT_EXCEEDED = 'SPENDING_LIMIT_EXCEEDED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  PAYMASTER_FAILED = 'PAYMASTER_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR'
}

export class TransactionErrorHandler {
  static categorizeError(error: Error): {
    type: TransactionErrorType;
    userMessage: string;
    retryable: boolean;
  } {
    if (error.message.includes('insufficient balance')) {
      return {
        type: TransactionErrorType.INSUFFICIENT_BALANCE,
        userMessage: 'Insufficient token balance for this transaction',
        retryable: false
      };
    }
    
    if (error.message.includes('not in allowlist')) {
      return {
        type: TransactionErrorType.TOKEN_NOT_ALLOWED,
        userMessage: 'This token is not authorized for automated transfers',
        retryable: false
      };
    }
    
    // ... more error categorizations
  }
}
```

### 4.3 Priority 2: User Experience (5-7 days)

**P2.1: Token Discovery and Validation UI**
```typescript
// apps/ui/components/token-selector.tsx
export function TokenSelector({ onTokenSelect, chainId }: TokenSelectorProps) {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [customToken, setCustomToken] = useState('');
  
  // Load popular tokens for SEI testnet
  useEffect(() => {
    loadPopularTokens(chainId).then(setTokens);
  }, [chainId]);
  
  const validateCustomToken = async (address: string) => {
    try {
      const [decimals, symbol, name] = await Promise.all([
        readContract({ address, abi: ERC20_ABI, functionName: 'decimals' }),
        readContract({ address, abi: ERC20_ABI, functionName: 'symbol' }),
        readContract({ address, abi: ERC20_ABI, functionName: 'name' })
      ]);
      
      return { address, decimals, symbol, name, isValid: true };
    } catch (error) {
      return { address, isValid: false, error: 'Invalid ERC-20 contract' };
    }
  };
  
  // ... component implementation
}
```

**P2.2: Real-time Transaction Status**
```typescript
// apps/ui/hooks/use-transaction-status.ts
export function useTransactionStatus(transactionId: string) {
  const [status, setStatus] = useState<TransactionStatus>('pending');
  const [receipt, setReceipt] = useState<TransactionReceipt | null>(null);
  
  useEffect(() => {
    const ws = new WebSocket(`${WORKER_URL}/transactions/${transactionId}/status`);
    
    ws.onmessage = (event) => {
      const update = JSON.parse(event.data);
      setStatus(update.status);
      
      if (update.receipt) {
        setReceipt(update.receipt);
      }
    };
    
    return () => ws.close();
  }, [transactionId]);
  
  return { status, receipt, explorerUrl: receipt?.explorerUrl };
}
```

### 4.4 Priority 3: Monitoring and Compliance (7-10 days)

**P3.1: Advanced Monitoring**
```typescript
// apps/api/src/monitoring/transaction-monitor.service.ts
@Injectable()
export class TransactionMonitorService {
  async monitorTransaction(transactionId: string, sessionKeyId: string) {
    // Real-time status updates
    this.eventEmitter.emit('transaction.started', { transactionId, sessionKeyId });
    
    // Track spending patterns
    await this.updateSpendingMetrics(sessionKeyId);
    
    // Compliance checks
    await this.performComplianceChecks(transactionId);
    
    // Alert on anomalies
    await this.checkForAnomalies(sessionKeyId);
  }
  
  private async checkForAnomalies(sessionKeyId: string) {
    const recentTransactions = await this.getRecentTransactions(sessionKeyId, '1h');
    
    // Velocity check
    if (recentTransactions.length > 10) {
      await this.createAlert({
        type: 'HIGH_VELOCITY',
        sessionKeyId,
        severity: 'WARNING',
        message: 'Unusually high transaction velocity detected'
      });
    }
    
    // Amount pattern check
    const amounts = recentTransactions.map(tx => parseFloat(tx.amount));
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const currentAmount = amounts[amounts.length - 1];
    
    if (currentAmount > avgAmount * 5) {
      await this.createAlert({
        type: 'AMOUNT_ANOMALY',
        sessionKeyId,
        severity: 'HIGH',
        message: 'Transaction amount significantly higher than recent average'
      });
    }
  }
}
```

## 5. Technical Specifications for Automated ERC-20 Transfers

### 5.1 Authorization Flow Specification

**Step 1: User Authorization (UI)**
```typescript
interface ERC20AuthorizationRequest {
  chainId: number; // 1328 for SEI testnet
  tokenAllowlist: string[]; // ERC-20 contract addresses
  recipientAllowlist?: string[]; // Optional recipient restrictions  
  spendingLimits: {
    perTransaction: string; // Human-readable units (e.g., "100")
    dailyLimit: string; // Human-readable units (e.g., "1000")
  };
  validityPeriod: number; // Hours (e.g., 24)
  requireConfirmation: boolean; // For high-value transactions
}

// UI Authorization Modal
const handleERC20Authorization = async (request: ERC20AuthorizationRequest) => {
  // 1. Create Dynamic smart wallet delegation
  const delegation = await createSmartWalletDelegation({
    chainId: request.chainId,
    operations: ['erc20_transfer'],
    maxAmountPerTx: request.spendingLimits.perTransaction,
    maxDailyAmount: request.spendingLimits.dailyLimit,
    duration: request.validityPeriod
  });
  
  // 2. Install on-chain session key validator
  const validatorAddress = await installSessionKeyValidator({
    sessionKey: delegation.sessionPublicKey,
    allowedSelectors: ['0xa9059cbb'], // transfer(address,uint256)
    tokenAllowlist: request.tokenAllowlist,
    spendingLimits: {
      perTransaction: parseUnits(request.spendingLimits.perTransaction, 18), // Convert to wei
      dailyLimit: parseUnits(request.spendingLimits.dailyLimit, 18)
    },
    validUntil: BigInt(Date.now() + request.validityPeriod * 3600000)
  });
  
  // 3. Store session key in API
  const sessionKey = await api.post('/session-keys', {
    walletAddress: delegation.smartWalletAddress,
    chainId: request.chainId,
    validUntil: new Date(Date.now() + request.validityPeriod * 3600000),
    permissions: [{
      operation: 'erc20_transfer',
      maxAmountPerTx: request.spendingLimits.perTransaction,
      maxDailyAmount: request.spendingLimits.dailyLimit,
      allowedContracts: request.tokenAllowlist,
      requireConfirmation: request.requireConfirmation
    }],
    validatorAddress,
    userSignature: delegation.delegationSignature
  });
  
  return {
    sessionKeyId: sessionKey.data.sessionKey.id,
    validatorAddress,
    smartWalletAddress: delegation.smartWalletAddress
  };
};
```

**Step 2: Transaction Scheduling (API)**
```typescript
interface ERC20TransferJob {
  workflowId: string;
  sessionKeyId: string;
  tokenAddress: string;
  recipient: string;
  amount: string; // Human-readable units
  scheduledAt: Date;
  idempotencyKey: string;
  metadata: {
    tokenSymbol?: string;
    tokenDecimals?: number;
    estimatedGas?: number;
  };
}

// API Endpoint: POST /workflows/schedule-erc20-transfer
const scheduleERC20Transfer = async (job: ERC20TransferJob) => {
  // 1. Validate session key and permissions
  const validation = await sessionKeysService.validateSessionKey(
    job.sessionKeyId,
    'erc20_transfer',
    job.amount,
    job.tokenAddress
  );
  
  if (!validation.isValid) {
    throw new BadRequestException(`Transfer not authorized: ${validation.errors.join(', ')}`);
  }
  
  // 2. Validate token contract
  const tokenInfo = await validateERC20Token(job.tokenAddress, 1328);
  if (!tokenInfo.isValid) {
    throw new BadRequestException('Invalid or non-standard ERC-20 token');
  }
  
  // 3. Queue job with delay
  await this.queueService.add('erc20-transfer', job, {
    delay: job.scheduledAt.getTime() - Date.now(),
    attempts: 3,
    backoff: 'exponential'
  });
  
  return { jobId: `erc20-${job.idempotencyKey}`, scheduledAt: job.scheduledAt };
};
```

**Step 3: Automated Execution (Worker)**
```typescript
// Worker Job Handler
@Processor('erc20-transfer')
export class ERC20TransferProcessor {
  @Process()
  async handleERC20Transfer(job: Job<ERC20TransferJob>) {
    const { sessionKeyId, tokenAddress, recipient, amount } = job.data;
    
    try {
      // 1. Fetch and decrypt session key
      const sessionWallet = await this.getSessionKeyWallet(sessionKeyId);
      
      // 2. Create kernel client
      const kernelClient = await this.zeroDevService.createKernelAccountV5(
        sessionWallet.privateKey,
        1328 // SEI testnet
      );
      
      // 3. Get token metadata
      const [decimals, symbol, balance] = await Promise.all([
        this.getTokenDecimals(tokenAddress),
        this.getTokenSymbol(tokenAddress),
        this.getTokenBalance(tokenAddress, kernelClient.account.address)
      ]);
      
      // 4. Convert amount to base units
      const amountBase = parseUnits(amount, decimals);
      
      // 5. Validate balance
      if (balance < amountBase) {
        throw new Error(`Insufficient ${symbol} balance: ${formatUnits(balance, decimals)} available`);
      }
      
      // 6. Final policy validation (on-chain validator will also enforce)
      await this.validateTransactionPolicy(sessionKeyId, tokenAddress, recipient, amountBase);
      
      // 7. Execute transfer
      const result = await this.executeERC20Transfer({
        kernelClient,
        tokenAddress,
        recipient,
        amount: amountBase,
        symbol,
        decimals
      });
      
      // 8. Update usage tracking
      await this.updateSessionKeyUsage(sessionKeyId, amount, result.transactionHash);
      
      // 9. Emit success event
      this.eventEmitter.emit('erc20.transfer.completed', {
        sessionKeyId,
        transactionHash: result.transactionHash,
        tokenAddress,
        recipient,
        amount,
        symbol
      });
      
      return result;
      
    } catch (error) {
      // Categorize error and determine retry strategy
      const errorInfo = TransactionErrorHandler.categorizeError(error);
      
      if (!errorInfo.retryable) {
        // Mark job as failed, don't retry
        throw new Error(`Non-retryable error: ${errorInfo.userMessage}`);
      }
      
      // Let Bull handle retries for retryable errors
      throw error;
    }
  }
  
  private async executeERC20Transfer(params: {
    kernelClient: any;
    tokenAddress: string;
    recipient: string;
    amount: bigint;
    symbol: string;
    decimals: number;
  }) {
    // Encode transfer function call
    const transferData = encodeFunctionData({
      abi: [
        {
          name: 'transfer',
          type: 'function',
          inputs: [
            { name: 'to', type: 'address' },
            { name: 'value', type: 'uint256' }
          ],
          outputs: [{ name: '', type: 'bool' }]
        }
      ],
      functionName: 'transfer',
      args: [params.recipient, params.amount]
    });
    
    // Execute via Account Abstraction
    const userOpHash = await params.kernelClient.sendUserOperation({
      callData: await params.kernelClient.account.encodeCalls([{
        to: params.tokenAddress,
        value: 0n,
        data: transferData
      }])
    });
    
    // Wait for transaction receipt
    const receipt = await params.kernelClient.waitForUserOperationReceipt({
      hash: userOpHash
    });
    
    return {
      transactionHash: receipt.receipt.transactionHash,
      blockNumber: Number(receipt.receipt.blockNumber),
      gasUsed: Number(receipt.receipt.gasUsed),
      status: 'success' as const,
      explorerUrl: `https://seitrace.com/tx/${receipt.receipt.transactionHash}`,
      userOpHash
    };
  }
}
```

### 5.2 Security Controls Specification

**On-Chain Policy Enforcement:**
```solidity
// ZeroDev Session Key Validator Policy Structure
struct SessionKeyPolicy {
    bytes4[] allowedSelectors;     // [0xa9059cbb] for transfer()
    address[] tokenAllowlist;      // Permitted ERC-20 contracts
    address[] recipientAllowlist;  // Optional recipient restrictions
    uint256 spendingLimitPerTx;    // Per-transaction limit in wei
    uint256 dailySpendingLimit;    // Daily limit in wei
    uint256 lastResetTimestamp;    // For daily limit tracking
    uint256 dailySpentAmount;      // Current day spending
    uint256 validUntil;            // Expiry timestamp
    bool isActive;                 // Emergency stop flag
}
```

**Off-Chain Validation Layers:**
```typescript
// Comprehensive validation before execution
const validateERC20Transaction = async (params: {
  sessionKeyId: string;
  tokenAddress: string;
  recipient: string;
  amount: string;
}) => {
  const checks = [];
  
  // 1. Session key status check
  const sessionKey = await getSessionKey(params.sessionKeyId);
  if (sessionKey.status !== 'ACTIVE') {
    checks.push(`Session key is ${sessionKey.status}`);
  }
  
  // 2. Expiry check
  if (Date.now() > sessionKey.validUntil.getTime()) {
    checks.push('Session key has expired');
  }
  
  // 3. Token allowlist check
  const permission = sessionKey.permissions.find(p => p.operation === 'erc20_transfer');
  if (permission.allowedContracts.length > 0 && 
      !permission.allowedContracts.includes(params.tokenAddress.toLowerCase())) {
    checks.push('Token not in allowlist');
  }
  
  // 4. Recipient allowlist check (if configured)
  if (permission.recipientAllowlist?.length > 0 && 
      !permission.recipientAllowlist.includes(params.recipient.toLowerCase())) {
    checks.push('Recipient not in allowlist');
  }
  
  // 5. Amount limits check
  const amountNum = parseFloat(params.amount);
  if (amountNum > parseFloat(permission.maxAmountPerTx)) {
    checks.push('Amount exceeds per-transaction limit');
  }
  
  // 6. Daily limit check
  const dailyUsed = await getDailyUsage(params.sessionKeyId);
  if (dailyUsed + amountNum > parseFloat(permission.maxDailyAmount)) {
    checks.push('Amount would exceed daily limit');
  }
  
  // 7. Emergency stop check
  if (permission.emergencyStop) {
    checks.push('Emergency stop is active');
  }
  
  return {
    isValid: checks.length === 0,
    errors: checks
  };
};
```

### 5.3 Environmental Requirements

**Required Environment Variables:**
```bash
# Network Configuration
SEI_EVM_RPC_URL=https://evm-rpc.sei-apis.com
SEI_TESTNET_CHAIN_ID=1328
SEI_EXPLORER_URL=https://seitrace.com

# ZeroDev Configuration
ZERODEV_PROJECT_ID=8e6f4057-e935-485f-9b6d-f14696e92654
ZERODEV_BUNDLER_URL=https://rpc.zerodev.app/api/v3/8e6f4057-e935-485f-9b6d-f14696e92654/chain/1328
ZERODEV_PAYMASTER_URL=https://rpc.zerodev.app/api/v3/8e6f4057-e935-485f-9b6d-f14696e92654/chain/1328
ENTRYPOINT_V07=0x0000000071727De22E5E9d8BAf0edAc6f37da032

# Gas Configuration
SEI_MAX_FEE_PER_GAS=0x9c7652400      # 42 gwei
SEI_MAX_PRIORITY_FEE=0x3b9aca00      # 1 gwei
SEI_GAS_LIMIT=500000                  # For ERC-20 transfers

# Security
SERVICE_AUTH_INTERNAL_SECRET=<hmac-secret-for-worker-api-auth>
SERVICE_AUTH_WORKER_SECRET=<hmac-secret-for-worker-api-auth>
SESSION_KEY_ENCRYPTION_KEY=<aes-256-key-for-session-key-encryption>

# Monitoring
TX_CONFIRM_TIMEOUT_MS=60000          # 60 seconds
RETRY_ATTEMPTS=3
RETRY_BACKOFF=exponential
```

## 6. Risk Assessment and Mitigation

### 6.1 Security Risks

| Risk | Impact | Likelihood | Mitigation |
|------|---------|------------|------------|
| Off-chain only policy enforcement | High | Medium | Install on-chain session key validators |
| Session key compromise | High | Low | Hardware security modules, key rotation |
| Smart contract vulnerabilities | High | Low | Audit session key validators, use proven contracts |
| Network-specific issues (SEI) | Medium | Medium | Comprehensive error handling, fallback RPCs |

### 6.2 Operational Risks

| Risk | Impact | Likelihood | Mitigation |
|------|---------|------------|------------|
| Paymaster service outage | Medium | Low | Fallback to user-paid gas, monitoring alerts |
| RPC endpoint failures | Medium | Medium | Multiple RPC endpoints, automatic failover |
| Database corruption | High | Low | Regular backups, data validation, encryption |
| Regulatory compliance | High | Medium | Audit trails, compliance monitoring, legal review |

## 7. Success Metrics

### 7.1 Technical Metrics
- **Transaction Success Rate**: >99.5% for valid transactions
- **Average Confirmation Time**: <30 seconds on SEI testnet
- **Gas Cost Optimization**: <$0.01 per ERC-20 transfer via paymaster
- **Error Recovery Rate**: >95% of retryable errors resolved automatically

### 7.2 Security Metrics
- **Policy Violation Detection**: 100% of unauthorized transactions blocked
- **Session Key Compromise Detection**: <5 minutes mean time to detection
- **Audit Trail Completeness**: 100% of transactions logged with full context
- **Compliance Score**: >98% adherence to configured policies

### 7.3 User Experience Metrics
- **Authorization Flow Completion**: >90% of users complete setup successfully
- **Transaction Status Visibility**: Real-time updates for 100% of transactions
- **Error Message Clarity**: >80% of users can resolve issues without support
- **Workflow Reliability**: >99% of scheduled transfers execute on time

## 8. Conclusion

The current Dynamic + ZeroDev integration provides a solid foundation for automated ERC-20 transfers, but requires critical security enhancements to be production-ready. The primary gap is the lack of on-chain policy enforcement, which creates a trust dependency on off-chain validation.

**Key Recommendations:**
1. **Immediate**: Install ZeroDev session key validators with on-chain policies
2. **Short-term**: Implement comprehensive ERC-20 handling with proper decimals support
3. **Medium-term**: Add advanced monitoring, error handling, and user experience improvements
4. **Long-term**: Expand to multi-chain support and advanced DeFi integrations

**Implementation Priority:**
- P0 (Security): 1-2 days
- P1 (Core functionality): 3-5 days  
- P2 (User experience): 5-7 days
- P3 (Monitoring/compliance): 7-10 days

This roadmap ensures a secure, reliable, and user-friendly system for automated ERC-20 token transfers on SEI testnet while maintaining compliance with best practices for account abstraction and session key management.
