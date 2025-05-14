# @zyra/wallet

A unified wallet management library for the Zyra platform, supporting multi-chain functionality (Base Sepolia and Solana) with passwordless authentication via Magic Link.

## Features

- **Multi-Chain Support**: Interact with both EVM-compatible chains (Base Sepolia) and Solana
- **Magic Link Integration**: Passwordless authentication using email
- **Environment-Agnostic**: Works in both browser (UI) and Node.js (worker) environments
- **Supabase Integration**: Persistent wallet storage with row-level security
- **Type-Safe**: Built with TypeScript for maximum type safety

## Installation

```bash
npm install @zyra/wallet
# or
yarn add @zyra/wallet
# or
pnpm add @zyra/wallet
```

## Setup

### Environment Variables

First, make sure to set up the required environment variables:

For UI (.env.local in the UI app):
```
NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY=your_magic_publishable_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

For worker (.env in the worker app):
```
MAGIC_SECRET_KEY=your_magic_secret_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Database Migration

Make sure to run the database migration to create the required `user_wallets` table:

```bash
cd apps/ui
pnpm run db:push
```

## Usage

### Browser (UI) Environment

```typescript
import { createClient } from '@supabase/supabase-js';
import { ZyraWallet, ChainType } from '@zyra/wallet';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Initialize wallet with Magic publishable key
const wallet = new ZyraWallet(process.env.NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY as string);

// Set up the storage adapter with Supabase
await wallet.setStorageAdapter(supabase);

// Initialize the wallet system
await wallet.initialize();

// Connect with user's email
const userEmail = 'user@example.com';
const walletInfo = await wallet.connect(userEmail);

// Get wallet balance 
const balance = await wallet.getBalance(walletInfo.address);
console.log(`Balance: ${balance.formatted} ${balance.symbol}`);

// Send a transaction (EVM)
const txResult = await wallet.sendTransaction({
  chainType: ChainType.EVM,
  chainId: 84532, // Base Sepolia
  to: '0xRecipientAddress',
  value: '0.01' // ETH
});
console.log(`Transaction sent: ${txResult.hash}`);

// Switch to Solana
await wallet.switchChain('devnet'); // Solana devnet

// Disconnect wallet
await wallet.disconnect();
```

### Node.js (Worker) Environment

```typescript
import { createClient } from '@supabase/supabase-js';
import { ZyraWallet } from '@zyra/wallet';

// Initialize Supabase client with service role key
const supabaseUrl = process.env.SUPABASE_URL as string;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Initialize wallet with Magic secret key
const wallet = new ZyraWallet(process.env.MAGIC_SECRET_KEY as string);

// Set up the storage adapter with Supabase
await wallet.setStorageAdapter(supabase);

// Initialize the wallet system
await wallet.initialize();

// Get user's wallet info from storage
const userEmail = 'user@example.com';
const walletInfo = await wallet.getWalletForUser(userEmail);

if (walletInfo) {
  // Check wallet balance
  const balance = await wallet.getBalance(walletInfo.address, walletInfo.chainId);
  console.log(`User ${userEmail} has ${balance.formatted} ${balance.symbol}`);
}

// Get all wallets for a user
const wallets = await wallet.listWalletsForUser(userEmail);
console.log(`User has ${wallets.length} wallets`);
```

## Security Considerations

- No private keys are stored in client-side storage
- Magic Link handles key management securely
- Row-level security ensures users can only access their own wallet data
- Sessions expire after periods of inactivity
- All transactions require explicit user confirmation

## Supported Chains

| Chain | Type | Chain ID | Environment |
|-------|------|----------|------------|
| Base Sepolia | EVM | 84532 | Testnet |
| Solana Devnet | Solana | 'devnet' | Testnet |
| Solana Mainnet | Solana | 'mainnet-beta' | Mainnet |

## Extending to New Chains

To add support for a new chain, extend the chain registry with the appropriate configuration:

```typescript
import { ChainType, EVMChainConfig } from '@zyra/wallet';

// Add Polygon Mumbai testnet
export const POLYGON_MUMBAI: EVMChainConfig = {
  id: 80001,
  chainId: 80001,
  name: 'Polygon Mumbai',
  type: ChainType.EVM,
  rpcUrl: 'https://rpc-mumbai.maticvigil.com',
  blockExplorerUrl: 'https://mumbai.polygonscan.com',
  symbol: 'MATIC',
  decimals: 18,
  testnet: true
};
```

## License

MIT
