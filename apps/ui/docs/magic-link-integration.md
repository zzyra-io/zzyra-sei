# Magic Link Integration Guide

This guide will help you set up and use Magic Link authentication with your existing Supabase authentication.

## Setup

### 1. Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Magic Link
NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY=your_magic_publishable_key
```

### 2. Magic Link Account

1. Sign up for a [Magic Link account](https://magic.link/)
2. Create a new application
3. Copy your publishable API key
4. Add your authorized domains (localhost for development, your production domain for production)

### 3. Supabase Configuration

1. Go to your Supabase dashboard
2. Navigate to Authentication > Providers
3. Enable "Magic Link" as an auth provider
4. Add your authorized redirect URLs for OAuth callbacks (e.g., `http://localhost:3000/callback` for development)

## Usage

### Basic Authentication Flow

1. **Email Authentication**:

   ```javascript
   // Hook provides authentication methods
   const { loginWithEmail } = useMagicAuth();

   // Authenticate with email
   await loginWithEmail("user@example.com");
   ```

2. **OAuth Authentication**:

   ```javascript
   const { loginWithOAuth } = useMagicAuth();

   // This will redirect the user to the OAuth provider
   await loginWithOAuth(OAuthProvider.GOOGLE);

   // After redirecting back, use the callback page to complete the flow
   // See /app/callback/page.tsx for implementation
   ```

3. **SMS Authentication**:

   ```javascript
   const { loginWithSMS } = useMagicAuth();

   // Authenticate with phone number
   await loginWithSMS("+1234567890");
   ```

### Checking Authentication Status

```javascript
const { isAuthenticated, wallet, user } = useMagicAuth();

if (isAuthenticated) {
  console.log("User is authenticated");
  console.log("Wallet address:", wallet?.address);
  console.log("User info:", user);
}
```

### Logging Out

```javascript
const { logout } = useMagicAuth();

await logout();
```

## Working with Wallets

The integration creates wallets automatically for users. You can access wallet functions directly:

```javascript
const { getMagicAuth } = useMagicAuth();
const magicAuth = getMagicAuth();
const wallet = magicAuth.getWallet();

// Get balance
const balance = await wallet.getBalance(wallet.getAddress());

// Send transaction
await wallet.sendTransaction({
  chainType: ChainType.EVM,
  chainId: POLYGON_MUMBAI.id,
  to: "0x...",
  value: "0.01",
});

// Sign message
const signature = await wallet.signMessage("Hello, blockchain!");
```

## Supported Chains

The integration supports both EVM (Ethereum) and Solana chains:

- Polygon Mumbai Testnet (default for EVM)
- Solana Devnet (default for Solana)
- Base Sepolia Testnet
- Solana Mainnet

You can specify the chain when connecting:

```javascript
// Connect with Solana
await loginWithEmail("user@example.com", SOLANA_DEVNET.id);
```

## Troubleshooting

### Missing Environment Variables

If you see warnings about missing environment variables, make sure you've added all required variables to your `.env.local` file.

### Authentication Errors

- Make sure your Magic Link API key is correct
- Check that your authorized domains are set up correctly
- For OAuth issues, ensure your redirect URLs are configured in both Magic Link and Supabase

## Understanding the Integration

The integration uses:

1. **Magic SDK** for wallet creation and authentication
2. **Supabase Authentication** for user management and persistence
3. **Magic DID Tokens** to link Magic and Supabase sessions

User wallet information is stored in Supabase user metadata, allowing for seamless integration between wallet operations and your existing authentication system.
