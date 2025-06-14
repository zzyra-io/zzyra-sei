# Magic Wallet Integration - Multi-Chain Support

## Overview

The `@zyra/wallet` library provides a unified wallet management solution for the Zzyra platform, enabling blockchain interactions across both UI (browser) and worker (Node.js) environments. It offers Magic Link integration for a passwordless wallet experience, supports multiple blockchain networks, and ensures secure key management.

## Table of Contents

1. [Features](#features)
2. [Supported Chains](#supported-chains)
3. [Architecture](#architecture)
4. [Security Considerations](#security-considerations)
5. [Privacy Measures](#privacy-measures)
6. [Implementation Guide](#implementation-guide)
7. [Production Requirements](#production-requirements)
8. [User Flows](#user-flows)

## Features

- **Environment-Agnostic Design**: Functions across both browser and server environments
- **Multi-Chain Support**: Unified interface for interacting with multiple blockchains
- **Passwordless Authentication**: Email-based authentication via Magic Link
- **Enterprise-Grade Security**: Delegated key management with no client-side key storage
- **Persistent Identification**: Maintains consistent wallet identity across sessions and devices
- **Transaction Management**: Streamlined sending and signing of blockchain transactions
- **db Integration**: First-class support for Zzyra's database infrastructure
- **Comprehensive TypeScript Support**: Full type definitions for improved developer experience

## Supported Chains

- **EVM-Compatible Chains**

  - Base Sepolia (Testnet)
  - Ethereum Mainnet (Planned)
  - Other EVM chains (Extensible)

- **Non-EVM Chains**
  - Solana Devnet
  - Solana Mainnet (Planned)

## Architecture

The `@zyra/wallet` package is designed as a shared library that can be used by both the UI (Next.js) and worker (NestJS) components of the Zzyra platform:

```
@zyra/wallet/
├── core/                   # Environment-agnostic core logic
│   ├── types.ts            # Type definitions
│   ├── wallet-manager.ts   # Main wallet interface
│   └── chain-registry.ts   # Chain configurations
├── adapters/
│   ├── browser/            # Browser-specific implementations
│   │   ├── magic-browser.ts
│   │   └── storage-browser.ts
│   └── node/               # Node.js-specific implementations
│       ├── magic-node.ts
│       └── storage-node.ts
├── providers/              # Wallet provider implementations
├── utils/                  # Shared utilities
└── index.ts                # Public API exports
```

### Data Flow

**Browser Environment:**

1. User authenticates via Magic Link email
2. Library obtains cryptographic session via Magic SDK
3. Wallet address and chain information stored in db
4. UI components interact with wallet for signing transactions
5. Signed transactions submitted directly to blockchain

**Node.js Environment:**

1. Node worker retrieves wallet information from db
2. Worker performs blockchain read operations directly
3. For write operations requiring signatures, worker:
   - Creates unsigned transactions
   - Stores intent in db for user confirmation
   - Or uses delegated signing capabilities for pre-approved workflows

## Security Considerations

### Key Management

The `@zyra/wallet` library implements a **zero client-side key storage** approach:

- **No Private Keys in Browser**: Private keys never exist in browser localStorage or memory
- **Delegated Key Management**: Uses Magic's secure infrastructure for key operations
- **Hardware Security Modules (HSM)**: Relies on Magic's HSM infrastructure
- **Key Recovery**: Account recovery handled via email address authentication
- **No Seed Phrases**: Users never need to manage seed phrases

### Authentication Security

- **One-Time Email Links**: Magic Link authentication provides strong phishing resistance
- **Session Management**: Implements timeout and context verification
- **Device Fingerprinting**: Optional device verification for wallet operations
- **Session Revocation**: Ability to revoke access from other devices
- **Multi-Factor Authentication**: Support for Magic's 2FA capabilities

### Transaction Security

- **Confirmation Screens**: Clear transaction details prior to signing
- **Spend Limits**: Configurable per-transaction and time-based limits
- **Approval Workflows**: Support for multi-signature approval processes
- **Transaction Simulation**: Pre-execution simulation to prevent unexpected outcomes
- **Malicious Contract Protection**: Integration with contract scanning services

## Privacy Measures

### Data Collection Principles

- **Minimization**: Only collect necessary wallet-related data
- **Purpose Limitation**: Clear usage boundaries for collected data
- **Storage Limitation**: Data retention policies with automatic purging
- **Transparency**: Clear documentation of all data collection

### User Data Handling

The following data is collected and stored:

| Data Category       | Purpose                    | Storage Location | Retention Period         |
| ------------------- | -------------------------- | ---------------- | ------------------------ |
| Email Address       | Authentication, Recovery   | db               | Until account deletion   |
| Wallet Addresses    | Transaction Processing     | db               | Until account deletion   |
| Transaction History | User Reference, Compliance | db               | 7 years (or as required) |
| Chain Preferences   | User Experience            | db               | Until account deletion   |
| IP Addresses        | Security, Fraud Prevention | Logs (rotation)  | 90 days                  |

## Implementation Guide

### Database Schema

```sql
-- Create user_wallets table
CREATE TABLE user_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  wallet_address TEXT NOT NULL,
  wallet_type TEXT NOT NULL,
  chain_type TEXT NOT NULL,
  chain_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(user_id, wallet_address, chain_id)
);

-- Row-Level Security
ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own wallets"
  ON user_wallets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wallets"
  ON user_wallets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallets"
  ON user_wallets FOR UPDATE
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_user_wallets_user_id ON user_wallets(user_id);
CREATE INDEX idx_user_wallets_address ON user_wallets(wallet_address);
CREATE INDEX idx_user_wallets_chain ON user_wallets(chain_type, chain_id);
```

### Environment Variables

```
# UI Environment Variables (.env)
NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY=pk_live_123...
NEXT_PUBLIC_DEFAULT_CHAIN_TYPE=evm
NEXT_PUBLIC_DEFAULT_CHAIN_ID=84532  # Base Sepolia

# Worker Environment Variables
MAGIC_SECRET_KEY=sk_live_123...
```

### Package Setup

1. Create the package structure:

   ```bash
   mkdir -p packages/wallet/src/{core,adapters,providers,utils}
   mkdir -p packages/wallet/src/adapters/{browser,node}
   ```

2. Add to workspace:

   ```json
   // pnpm-workspace.yaml
   packages:
     - 'apps/*'
     - 'packages/*'
   ```

3. Initialize package:
   ```bash
   cd packages/wallet
   pnpm init
   pnpm add -D typescript @types/node
   ```

## Production Requirements

### Security Audit Requirements

Before production use:

1. **Third-Party Audit**: Complete code audit by blockchain security firm
2. **Penetration Testing**: Regular penetration testing of wallet infrastructure
3. **Vulnerability Disclosure Program**: Process for reporting security issues
4. **Security Response Team**: Designated team for handling security incidents

### Performance Considerations

- **Connection Pooling**: Reuse connections to RPC providers
- **Batch Requests**: Combine multiple read operations
- **Caching Strategy**: Cache chain data with appropriate TTLs
- **Request Prioritization**: Prioritize user-facing operations
- **Index Optimization**: Properly indexed wallet tables
- **Memory Management**: Set appropriate resource limits

### Monitoring and Maintenance

- **Structured Logging**: Use JSON format with proper redaction
- **Metric Collection**: Track wallet operations, success rates
- **Alerting**: Set up alerts for unusual activity
- **Performance Monitoring**: Track transaction times and success rates
- **Error Aggregation**: Centralize error tracking

## User Flows

### New User Onboarding

1. User signs up for Zzyra account with email
2. User clicks "Connect Wallet" in dashboard
3. User selects "Magic Wallet" option
4. User receives Magic Link email
5. Upon clicking link, user is authenticated and wallet is created
6. User's wallet is now accessible across all Zzyra features

### Cross-Chain Asset Management

1. User navigates to wallet section
2. User views current chain (e.g., Base Sepolia)
3. User clicks "Switch Chain" dropdown
4. User selects Solana from available chains
5. Interface updates to show Solana wallet (same user identity)
6. User can now manage Solana assets

### Transaction Execution in Workflows

1. User creates workflow in Zzyra builder
2. User adds blockchain transaction node to workflow
3. User configures transaction parameters
4. When workflow executes:
   - If pre-approved: transaction executes automatically
   - If approval required: user receives notification to approve
5. User can monitor transaction status in execution history

### Enterprise Multi-User Wallet Access

1. Admin creates organization in Zzyra
2. Admin invites team members with specific roles
3. Admin configures spending limits and approval thresholds
4. Team members use their own Magic Link authentication
5. Actions are performed against shared organizational wallet
6. All transactions tracked with user attribution

---

_This documentation is considered confidential and proprietary to Zzyra._
