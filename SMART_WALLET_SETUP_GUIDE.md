# Smart Wallet Setup Guide

## Problem: "Primary wallet is not a ZeroDev smart wallet" Error

This error occurs when trying to create an Account Abstraction delegation but your current wallet doesn't support smart wallet features.

## Root Cause

**Account Abstraction (Smart Wallets) only work with embedded wallets in Dynamic Labs**, not external wallets like MetaMask, WalletConnect, etc.

## Solution Steps

### Step 1: Check Your Current Wallet

When you see the blockchain authorization modal, look for the wallet status alert:

- ✅ **Green Alert**: "Smart Wallet Ready" - You're good to go!
- ⚠️ **Yellow Alert**: Shows your current wallet type and status
- ❌ **Red Alert**: Smart wallet not available

### Step 2: Switch to Embedded Wallet

If you have an **external wallet** (MetaMask, etc.):

1. **Disconnect** your current wallet
2. **Login with Email or SMS** instead
3. This creates an **embedded wallet** with smart wallet support
4. **Refresh the page** if needed

### Step 3: Verify Smart Wallet Creation

After logging in with Email/SMS:

- Look for wallet status: "Smart Wallet Ready"
- Address should show your smart wallet address
- Button should say "Create Smart Wallet & Execute"

## Technical Details

### What are Smart Wallets?

- **ERC-4337 compliant** smart contract accounts
- **Gas sponsorship** via ZeroDev paymaster
- **Automated execution** for workflow transactions
- **Enhanced security** with spending limits

### Why Only Embedded Wallets?

- Dynamic Labs creates smart wallets **only for embedded wallets**
- External wallets (MetaMask) can't be converted to smart wallets
- Embedded wallets are **managed by Dynamic Labs**
- Smart wallet **delegates to the embedded wallet** for signing

### Account Abstraction Flow

```
Embedded Wallet (EOA) → Smart Wallet → Automated Transactions
      ↑                      ↑                   ↑
  User Signs            Paymaster Pays      zyra-worker
  Delegation            Gas Fees            Executes
```

## Environment Configuration

### Required Environment Variables

```bash
# Frontend (.env.local)
NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID=your_dynamic_env_id
NEXT_PUBLIC_ZERODEV_PROJECT_ID=your_zerodev_project_id
NEXT_PUBLIC_ZERODEV_BUNDLER_RPC=https://rpc.zerodev.app/api/v2/bundler/PROJECT_ID
NEXT_PUBLIC_ZERODEV_PAYMASTER_RPC=https://rpc.zerodev.app/api/v2/paymaster/PROJECT_ID
```

### Dynamic Dashboard Settings

1. **Enable Embedded Wallets** (Email/SMS login)
2. **Enable Account Abstraction** with ZeroDev
3. **Configure Smart Wallet Settings**:
   - ✅ Create for embedded wallets only
   - ✅ Show smart wallet only (recommended)
4. **Set up Gas Policies** in ZeroDev dashboard

## Troubleshooting

### "Embedded wallet detected but smart wallet not available"

- **Configuration issue** in Dynamic dashboard
- Smart wallets might not be enabled
- ZeroDev project ID might be incorrect
- Try **refreshing the page**

### "Smart wallet still being created"

- Wait a few seconds and **refresh**
- Smart wallet creation can take time
- Check browser console for errors

### "ZeroDev configuration issue"

- Verify `NEXT_PUBLIC_ZERODEV_PROJECT_ID`
- Check bundler/paymaster URLs
- Ensure ZeroDev project matches your network

## Debug Information

The enhanced authorization modal now shows:

- **Current wallet type** (External vs Embedded)
- **Smart wallet availability status**
- **Helpful recommendations** for each scenario
- **Debug details** (click "Show Debug Information")

## Testing

### Manual Test Steps

1. **Connect with MetaMask** → Should show "Embedded Wallet Required"
2. **Disconnect and login with Email** → Should show "Smart Wallet Ready"
3. **Create delegation** → Should work without errors
4. **Trigger workflow** → Should execute transactions automatically

### Verification

- Console shows: "Smart wallet delegation created successfully"
- Workflow executes blockchain operations
- Transactions appear in blockchain explorer
- No gas fees charged to user (sponsored)

## Production Checklist

- [ ] **Embedded wallets enabled** in Dynamic dashboard
- [ ] **Account abstraction configured** with ZeroDev
- [ ] **Gas policies set up** in ZeroDev dashboard
- [ ] **Environment variables configured** correctly
- [ ] **Smart wallet creation tested** with email login
- [ ] **Delegation creation working** without errors
- [ ] **Automated transactions executing** successfully

## Support

If you continue having issues:

1. Check the **wallet status alert** in the authorization modal
2. Look at **browser console** for detailed error messages
3. Verify **Dynamic dashboard configuration**
4. Test with **fresh email signup** to eliminate cache issues

The new error messages and wallet status checking should make it much clearer what's happening and how to fix it!
