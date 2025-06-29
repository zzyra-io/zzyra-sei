# DeFi Portfolio Management Example

This example demonstrates a complete DeFi portfolio management workflow on Base Sepolia.

## Workflow Overview

This workflow:
1. Runs daily at 9:00 AM
2. Checks portfolio balances across Aave and Uniswap on Base Sepolia
3. Calculates if rebalancing is needed based on target allocations
4. Optimizes gas for transactions if rebalancing is required
5. Executes swaps to rebalance the portfolio
6. Sends notifications about portfolio status

## Block Configuration

### Schedule Block
```json
{
  "interval": "daily",
  "time": "09:00"
}
```

### Portfolio Balance Block
```json
{
  "type": "PORTFOLIO_BALANCE",
  "assets": ["ETH", "USDC", "DAI"],
  "protocols": ["aave", "uniswap"],
  "monitoringInterval": 60,
  "networkId": "base-sepolia",
  "rpcUrl": "https://sepolia.base.org"
}
```

### Rebalance Calculator Block
```json
{
  "type": "REBALANCE_CALCULATOR",
  "assets": ["ETH", "USDC", "DAI"],
  "targetWeights": {
    "ETH": 40,
    "USDC": 40,
    "DAI": 20
  },
  "rebalanceThreshold": 5,
  "networkId": "base-sepolia",
  "rpcUrl": "https://sepolia.base.org"
}
```

### Condition Block
```json
{
  "condition": "{{data.needsRebalance}}",
  "description": "Check if portfolio needs rebalancing"
}
```

### Gas Optimizer Block
```json
{
  "type": "GAS_OPTIMIZER",
  "gasLimit": 300000,
  "maxFeePerGas": 1.5,
  "maxPriorityFeePerGas": 1.0,
  "optimizationStrategy": "gas_price",
  "networkId": "base-sepolia",
  "rpcUrl": "https://sepolia.base.org"
}
```

### Token Swap Block
```json
{
  "type": "SWAP_EXECUTOR",
  "sourceAsset": "{{data.swapFrom}}",
  "targetAsset": "{{data.swapTo}}",
  "amount": "{{data.swapAmount}}",
  "slippage": 0.5,
  "gasLimit": 300000,
  "maxFeePerGas": "{{data.recommendedMaxFeePerGas}}",
  "maxPriorityFeePerGas": "{{data.recommendedMaxPriorityFeePerGas}}",
  "networkId": "base-sepolia",
  "rpcUrl": "https://sepolia.base.org"
}
```

### Notification Block
```json
{
  "type": "info",
  "title": "Portfolio Update on Base Sepolia",
  "message": "Current portfolio value: {{data.totalValue}} USD. {{#if data.needsRebalance}}Rebalancing executed.{{else}}No rebalancing needed.{{/if}}"
}
```

## Workflow Execution

1. The workflow is triggered daily at 9:00 AM
2. The Portfolio Balance block retrieves your current balances across protocols
3. The Rebalance Calculator determines if rebalancing is needed by comparing current allocations to target weights
4. If rebalancing is needed:
   - The Gas Optimizer calculates the optimal gas settings
   - The Token Swap block executes the necessary swaps
5. A notification is sent with the current portfolio value and rebalancing status

## Sample Output

```json
{
  "totalValue": 1250.75,
  "assetBalances": {
    "ETH": {
      "balance": 0.25,
      "value": 500.00,
      "weight": 40
    },
    "USDC": {
      "balance": 500.75,
      "value": 500.75,
      "weight": 40
    },
    "DAI": {
      "balance": 250.00,
      "value": 250.00,
      "weight": 20
    }
  },
  "needsRebalance": false,
  "timestamp": "2025-05-10T09:00:00Z"
}
```

## How to Use This Example

1. Create a new workflow using the "DeFi Portfolio Management" template
2. Customize the target weights in the Rebalance Calculator block
3. Adjust the rebalance threshold based on your preferences
4. Modify the notification message if needed
5. Save and activate the workflow

This workflow will automatically monitor and rebalance your portfolio on Base Sepolia according to your specified target allocations.
