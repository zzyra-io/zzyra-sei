# DeFi Portfolio Management on Base Sepolia

This guide explains how to use Zzyra's DeFi portfolio management workflow on Base Sepolia.

## Overview

The DeFi portfolio management workflow allows you to:

- Monitor your portfolio balances across protocols on Base Sepolia
- Automatically rebalance your portfolio based on target allocations
- Optimize gas usage for transactions
- Execute swaps when needed
- Receive notifications about portfolio updates

## Getting Started

There are three ways to create a DeFi portfolio management workflow:

### 1. Using Templates

1. Click on the "Templates" button in the workflow prompt panel
2. Select the "DeFi Portfolio Management" template
3. Click "Generate Workflow"

This will create a complete workflow with all the necessary blocks and connections.

### 2. Using Natural Language

Type a prompt like:

- "Monitor my ETH and USDC balances on Base Sepolia and alert me when ETH drops below $2000"
- "Rebalance my portfolio to maintain 60% ETH and 40% USDC when prices change by more than 5%"
- "Optimize gas usage for my swaps on Base Sepolia and execute only during low gas periods"

Then click "Generate Workflow" to create a workflow based on your prompt.

### 3. Building Manually

You can also build a workflow manually using the following blocks:

- **Schedule**: Trigger the workflow on a schedule
- **DeFi Portfolio Balance**: Check your portfolio balance across protocols
- **Rebalance Calculator**: Calculate if rebalancing is needed
- **Condition**: Check if rebalancing is required
- **Gas Optimizer**: Optimize gas for transactions
- **Token Swap**: Execute token swaps for rebalancing
- **Notification**: Send notifications about portfolio status

## Configuration

### Network Configuration

All DeFi blocks are configured with Base Sepolia network settings by default:

```json
{
  "networkId": "base-sepolia",
  "rpcUrl": "https://sepolia.base.org"
}
```

### Gas Settings

Gas settings are optimized for Base Sepolia:

```json
{
  "gasLimit": 300000,
  "maxFeePerGas": 1.5,
  "maxPriorityFeePerGas": 1.0,
  "waitForConfirmations": 1
}
```

### Supported Assets

The following assets are supported on Base Sepolia:

- ETH (native)
- USDC (0x036CbD53842c5426634e7929541eC2318f3dCF7e)
- DAI (0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb)
- WETH (0x4200000000000000000000000000000000000006)

### Supported Protocols

The following protocols are supported on Base Sepolia:

- Uniswap
- Aave

## Example Workflow

A typical DeFi portfolio management workflow includes:

1. A **Schedule** block to trigger the workflow daily
2. A **Portfolio Balance** block to check your portfolio across protocols
3. A **Rebalance Calculator** block to determine if rebalancing is needed
4. A **Condition** block to check if rebalancing is required
5. A **Gas Optimizer** block to optimize gas for transactions
6. A **Token Swap** block to execute swaps for rebalancing
7. A **Notification** block to send updates about your portfolio

## Best Practices

- Set reasonable thresholds for rebalancing (e.g., 5% deviation)
- Use gas optimization to reduce transaction costs
- Set up notifications to stay informed about your portfolio
- Monitor multiple assets to diversify your portfolio
- Use appropriate time intervals for monitoring (daily or weekly)

## Troubleshooting

- If transactions fail, check that you have enough ETH for gas
- Verify that the token addresses are correct for Base Sepolia
- Ensure that the RPC URL is accessible
- Check that the protocols are available on Base Sepolia

## Resources

- [Base Sepolia Documentation](https://docs.base.org/guides/basescan-sepolia)
- [Uniswap on Base Sepolia](https://docs.uniswap.org/concepts/protocol/integration-issues)
- [Aave on Base Sepolia](https://docs.aave.com/developers/deployed-contracts/testnet-addresses)
