/**
 * Base Sepolia network configuration for DeFi operations
 */
export const BASE_SEPOLIA_CONFIG = {
  networkId: 'base-sepolia',
  rpcUrl: 'https://sepolia.base.org',
  blockExplorer: 'https://sepolia.basescan.org',
  nativeCurrency: 'ETH',
  // Supported protocols on Base Sepolia
  supportedProtocols: ['uniswap', 'aave'],
  // Token addresses on Base Sepolia
  tokenAddresses: {
    'ETH': 'native',
    'USDC': '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia USDC address
    'DAI': '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', // Base Sepolia DAI address
    'WETH': '0x4200000000000000000000000000000000000006'  // Base Sepolia WETH address
  }
};

/**
 * Default gas settings for Base Sepolia
 */
export const BASE_SEPOLIA_GAS_DEFAULTS = {
  gasLimit: 300000,
  maxFeePerGas: 1.5, // in gwei
  maxPriorityFeePerGas: 1.0, // in gwei
  waitForConfirmations: 1
};

/**
 * Base Sepolia DeFi protocol configurations
 */
export const BASE_SEPOLIA_PROTOCOLS = {
  uniswap: {
    factoryAddress: '0x9323c1d6D800ed51Bd7C6B216cfBec678B7d0BC2',
    routerAddress: '0xbe7D1FD1f6748bbDefC4fbaCafBb11C6Fc506d1d',
    quoterAddress: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a'
  },
  aave: {
    poolAddressesProviderAddress: '0x012bAC54348C0E635dCAc9D5FB99f06F24136C9A',
    dataProviderAddress: '0x8e50d736cE2B005ea8eE2A7C32A2aDC7e4C00547'
  }
};
