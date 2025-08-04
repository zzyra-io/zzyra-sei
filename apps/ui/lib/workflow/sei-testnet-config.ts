/**
 * Sei Testnet (Atlantic-2) network configuration for DeFi operations
 */
export const SEI_TESTNET_CONFIG = {
  networkId: "sei-testnet",
  chainId: 1328,
  rpcUrl: "https://evm-rpc-testnet.sei-apis.com",
  blockExplorer: "https://testnet.seistream.app",
  nativeCurrency: "SEI",
  // Supported protocols on Sei Testnet
  supportedProtocols: ["uniswap", "aave"],
  // Token addresses on Sei Testnet (placeholder addresses - need to be updated with actual Sei testnet addresses)
  tokenAddresses: {
    SEI: "native",
    USDC: "0x", // Placeholder - update with actual Sei testnet USDC address
    DAI: "0x", // Placeholder - update with actual Sei testnet DAI address
    WSEI: "0x", // Placeholder - update with actual Sei testnet WSEI address
  },
};

/**
 * Default gas settings for Sei Testnet
 */
export const SEI_TESTNET_GAS_DEFAULTS = {
  gasLimit: 300000,
  maxFeePerGas: 0.1, // in usei
  maxPriorityFeePerGas: 0.05, // in usei
  waitForConfirmations: 1,
};

/**
 * Sei Testnet DeFi protocol configurations
 * Note: These are placeholder addresses - need to be updated with actual Sei testnet protocol addresses
 */
export const SEI_TESTNET_PROTOCOLS = {
  uniswap: {
    factoryAddress: "0x", // Placeholder
    routerAddress: "0x", // Placeholder
    quoterAddress: "0x", // Placeholder
  },
  aave: {
    poolAddressesProviderAddress: "0x", // Placeholder
    dataProviderAddress: "0x", // Placeholder
  },
};
