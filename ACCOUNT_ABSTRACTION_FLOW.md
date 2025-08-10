# Account Abstraction Flow for Automated Workflow Execution

## Overview

Zyra implements Account Abstraction (AA) using Dynamic Labs + ZeroDev to enable **automated workflow execution** where transactions are executed on behalf of users when workflows run in the background.

## Architecture

### Two Execution Modes

#### 1. **Immediate Execution** (Interactive)

- User is present and interacts directly
- Frontend kernel client executes transactions
- Used for testing/manual transactions

#### 2. **Automated Execution** (Workflow Background)

- User creates a delegation allowing Zyra to execute transactions
- zyra-worker executes transactions using the delegation when workflows run
- User doesn't need to be present

## Flow Diagram

```
User Authorization → Workflow Runs → Backend Execution
     ↓                    ↓                ↓
1. Create Delegation → 2. Trigger → 3. Execute UserOp
   (Frontend)           (Queue)      (zyra-worker)
```

## Implementation Details

### Frontend (`apps/ui/`)

**Dynamic Provider Setup** (`lib/dynamic-provider.tsx`):

```typescript
ZeroDevSmartWalletConnectorsWithConfig({
  bundlerRpc: process.env.NEXT_PUBLIC_ZERODEV_BUNDLER_RPC,
  paymasterRpc: process.env.NEXT_PUBLIC_ZERODEV_PAYMASTER_RPC,
});
```

**Account Abstraction Hook** (`hooks/use-account-abstraction.ts`):

- `createSmartWalletDelegation()`: Creates delegation for automated execution
- `executeTransaction()`: Direct execution via kernel client
- Uses Dynamic Labs `useSmartWallets` hook for real smart wallet management

**Delegation Format**:

```json
{
  "owner": "0x...", // EOA signer address
  "smartWallet": "0x...", // Smart wallet address
  "operations": ["eth_transfer", "erc20_transfer"],
  "maxAmountPerTx": "1.0", // Per-transaction limit
  "maxDailyAmount": "10.0", // Daily spending limit
  "validUntil": "2024-01-01T00:00:00Z",
  "purpose": "workflow_automation",
  "automatedExecution": true
}
```

### Backend (`apps/zyra-worker/`)

**SendTransactionBlock Handler**:

- Parses delegation from `blockchainAuthorization`
- Validates spending limits and permissions
- Constructs ERC-4337 UserOperation
- Submits to ZeroDev bundler with paymaster
- Waits for transaction confirmation

**Key Methods**:

- `executeAATransaction()`: Main AA execution logic
- `getSmartWalletNonce()`: Fetches current nonce from bundler
- `getInitCode()`: Handles smart wallet deployment if needed
- `encodeSmartWalletCall()`: Encodes transaction calldata
- `estimateUserOperationGas()`: Dynamic gas estimation
- `submitUserOperation()`: Submits to bundler
- `waitForUserOpTransaction()`: Waits for confirmation

## Security Features

### Spending Limits

- **Per-transaction limit**: Maximum amount per single transaction
- **Daily limit**: Total amount allowed per day
- **Operation restrictions**: Only allowed operations (ETH, ERC20, etc.)

### Time-based Expiry

- Delegations expire after specified duration
- User can set custom expiry times (1 hour, 1 day, 1 week, etc.)

### Validation

- Backend validates every transaction against delegation
- Checks spending limits, operation types, and expiry
- Rejects unauthorized transactions

## Gas Sponsorship

- **ZeroDev Paymaster**: Sponsors transaction gas fees
- **User Experience**: No gas fees for end users
- **Configuration**: Set in ZeroDev dashboard with spending policies

## Environment Variables

```bash
# Frontend (.env.local)
NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID=your_dynamic_env_id
NEXT_PUBLIC_ZERODEV_PROJECT_ID=your_zerodev_project_id
NEXT_PUBLIC_ZERODEV_BUNDLER_RPC=https://rpc.zerodev.app/api/v2/bundler/PROJECT_ID
NEXT_PUBLIC_ZERODEV_PAYMASTER_RPC=https://rpc.zerodev.app/api/v2/paymaster/PROJECT_ID

# Backend (worker .env)
AA_SIMULATION_MODE=false # Set to true for development
AA_BUNDLER_URL=https://rpc.zerodev.app/api/v2/bundler/PROJECT_ID
AA_PAYMASTER_URL=https://rpc.zerodev.app/api/v2/paymaster/PROJECT_ID
AA_ENTRY_POINT_ADDRESS=0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789
```

## Production Checklist

- [ ] Add credit card to ZeroDev for mainnet gas sponsorship
- [ ] Create live ZeroDev project for production networks
- [ ] Set up gas policies in ZeroDev dashboard
- [ ] Configure IP allowlisting for Dynamic's IPs
- [ ] Set AA_SIMULATION_MODE=false for production
- [ ] Monitor transaction success rates and gas costs

## Testing

**Simulation Mode**: Set `AA_SIMULATION_MODE=true` to test without real transactions

**Integration Testing**:

1. Create delegation in frontend
2. Trigger workflow with blockchain operations
3. Verify zyra-worker executes transaction
4. Check transaction appears in explorer

## Benefits

✅ **Automated Execution**: Workflows run without user presence  
✅ **Gas Sponsorship**: Users don't pay gas fees  
✅ **Security**: Spending limits and operation restrictions  
✅ **Smart Wallet Features**: Batch transactions, account recovery  
✅ **Scalable**: Handles multiple users and concurrent workflows

## Architecture Decision

**Why Backend Execution?**

- Workflow automation requires background execution when users are offline
- Session-based delegation allows secure automated transactions
- Centralized execution enables better monitoring and error handling
- Consistent with automation platform requirements

**Why Not Frontend-Only?**

- User wouldn't be present when automated workflows execute
- Cannot rely on browser/wallet availability for scheduled tasks
- Background job processing requires server-side execution

sequenceDiagram
participant UI as UI (Next.js)
participant API as API (NestJS)
participant Queue as RabbitMQ
participant Worker as Worker (NestJS)
participant ZeroDv as ZeroDv Service
participant Blockchain as SEI Network

    Note over UI: User clicks "Execute Workflow"
    UI->>UI: EnhancedBlockchainAuthorizationModal
    UI->>UI: Dynamic Labs Wallet Authorization
    UI->>UI: Create AA delegation signature

    UI->>API: POST /workflows/{id}/execute<br/>{blockchainAuthorization}
    API->>API: WorkflowsService.execute()
    API->>Queue: addExecutionJob(executionId, blockchainAuthorization)

    Queue->>Worker: Job: {executionId, userId, blockchainAuthorization}
    Worker->>Worker: ExecutionWorker.processMessage()
    Worker->>Worker: WorkflowExecutor.executeWorkflow()
    Worker->>Worker: NodeExecutor.executeNode()
    Worker->>Worker: SendTransactionBlock.execute()

    Note over Worker: ❌ Current Wrong Pattern
    Worker->>ZeroDv: Manual kernel client creation
    ZeroDv->>ZeroDv: Proxy owner with manual factory args
    ZeroDv->>Blockchain: User operation with 0 gas limits
    Blockchain->>ZeroDv: ❌ AA20 account not deployed

    Note over Worker: ✅ Required Fix
    Worker->>ZeroDv: Use ZeroDv v5+ validator pattern
    ZeroDv->>ZeroDv: signerToEcdsaValidator + createKernelAccount
    ZeroDv->>Blockchain: Proper user operation with deployment
    Blockchain->>ZeroDv: ✅ Smart account deployed & transaction success
