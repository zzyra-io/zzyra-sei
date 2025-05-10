/**
 * DeFi Workflow Components
 * 
 * This module exports all components related to DeFi workflow generation
 * and execution on Base Sepolia.
 */

export { BASE_SEPOLIA_CONFIG, BASE_SEPOLIA_GAS_DEFAULTS } from '../base-sepolia-config';
export { generateDefiWorkflow } from '../defi-workflow-generator';
export { createDeFiPortfolioTemplate } from '../templates/defi-portfolio-management';

/**
 * DeFi-specific prompt suggestions for the workflow generator
 */
export const DEFI_PROMPT_SUGGESTIONS = [
  "Monitor my ETH and USDC balances on Base Sepolia and alert me when ETH drops below $2000",
  "Rebalance my portfolio to maintain 60% ETH and 40% USDC when prices change by more than 5%",
  "Optimize gas usage for my swaps on Base Sepolia and execute only during low gas periods",
  "Check yield opportunities on Aave and Uniswap on Base Sepolia and alert me daily",
  "Automatically swap ETH to USDC when price reaches $3000 on Base Sepolia"
];

/**
 * DeFi-specific keywords for domain detection
 */
export const DEFI_KEYWORDS = [
  'defi', 'portfolio', 'rebalance', 'base sepolia', 'yield', 'swap', 'liquidity',
  'aave', 'uniswap', 'balance', 'gas', 'optimize', 'protocol'
];
