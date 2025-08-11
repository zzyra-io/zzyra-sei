import type { Chain } from 'viem';
// SEI chains not available in viem v1.19.4, define manually
const sei = {
  id: 1329,
  name: 'SEI',
  network: 'sei',
  nativeCurrency: { name: 'SEI', symbol: 'SEI', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://evm-rpc.sei-apis.com'] },
    public: { http: ['https://evm-rpc.sei-apis.com'] },
  },
  blockExplorers: {
    default: { name: 'Seitrace', url: 'https://seitrace.com' },
  },
} as const;

const seiDevnet = {
  id: 713715,
  name: 'SEI Devnet',
  network: 'sei-devnet',
  nativeCurrency: { name: 'SEI', symbol: 'SEI', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://evm-rpc-arctic-1.sei-apis.com'] },
    public: { http: ['https://evm-rpc-arctic-1.sei-apis.com'] },
  },
  blockExplorers: {
    default: { name: 'Seitrace', url: 'https://seitrace.com' },
  },
} as const;

const seiTestnet = {
  id: 1328,
  name: 'SEI Testnet',
  network: 'sei-testnet',
  nativeCurrency: { name: 'SEI', symbol: 'SEI', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://evm-rpc.sei-apis.com'] },
    public: { http: ['https://evm-rpc.sei-apis.com'] },
  },
  blockExplorers: {
    default: { name: 'Seitrace', url: 'https://seitrace.com' },
  },
  testnet: true,
} as const;

// Default configuration values - Using testnet for development
// Can be overridden with SEI_DEFAULT_NETWORK environment variable
const defaultNetworkFromEnv = process.env.SEI_DEFAULT_NETWORK;
export const DEFAULT_NETWORK = defaultNetworkFromEnv || '1328';
export const DEFAULT_RPC_URL =
  defaultNetworkFromEnv === 'sei'
    ? 'https://evm-rpc.sei-apis.com'
    : 'https://yolo-sparkling-sea.sei-atlantic.quiknode.pro/aa0487f22e4ebd479a97f9736eb3c0fb8a2b8e32';
export const DEFAULT_CHAIN_ID = defaultNetworkFromEnv === 'sei' ? 1329 : 713715;

// Map chain IDs to chains
export const chainMap: Record<number, Chain> = {
  1329: sei,
  1328: seiTestnet,
  713715: seiDevnet,
};

// Map network names to chain IDs for easier reference
export const networkNameMap: Record<string, number> = {
  sei: 1329,
  '1328': 1328,
  'sei-devnet': 713_715,
};

// Map chain IDs to RPC URLs with environment variable overrides
export const rpcUrlMap: Record<number, string> = {
  1329: process.env.SEI_MAINNET_RPC || 'https://evm-rpc.sei-apis.com',
  1328:
    process.env.SEI_TESTNET_RPC ||
    'https://yolo-sparkling-sea.sei-atlantic.quiknode.pro/aa0487f22e4ebd479a97f9736eb3c0fb8a2b8e32',
  713715: process.env.SEI_DEVNET_RPC || 'https://evm-rpc-arctic-1.sei-apis.com',
};

// Debug logging for RPC URL resolution (only in development)
if (process.env.NODE_ENV === 'development') {
  console.error(`🔧 SEI RPC URL Debug:`);
  console.error(
    `SEI_DEFAULT_NETWORK env var: ${process.env.SEI_DEFAULT_NETWORK || 'NOT SET'}`,
  );
  console.error(`Using default network: ${DEFAULT_NETWORK}`);
  console.error(`Using default chain ID: ${DEFAULT_CHAIN_ID}`);
  console.error(
    `SEI_TESTNET_RPC env var: ${process.env.SEI_TESTNET_RPC || 'NOT SET'}`,
  );
  console.error(`Using testnet RPC: ${rpcUrlMap[1328]}`);
}

/**
 * Resolves a chain identifier (number or string) to a chain ID
 * @param chainIdentifier Chain ID (number) or network name (string)
 * @returns The resolved chain ID
 */
export function resolveChainId(chainIdentifier: number | string): number {
  if (typeof chainIdentifier === 'number') {
    return chainIdentifier;
  }

  // Convert to lowercase for case-insensitive matching
  const networkName = chainIdentifier.toLowerCase();

  // Check if the network name is in our map
  if (networkName in networkNameMap) {
    return networkNameMap[networkName];
  }

  // Try parsing as a number
  const parsedId = Number.parseInt(networkName);
  if (!Number.isNaN(parsedId)) {
    return parsedId;
  }

  // Default to mainnet if not found
  return DEFAULT_CHAIN_ID;
}

/**
 * Returns the chain configuration for the specified chain ID or network name
 * @param chainIdentifier Chain ID (number) or network name (string)
 * @returns The chain configuration
 * @throws Error if the network is not supported (when string is provided)
 */
export function getChain(
  chainIdentifier: number | string = DEFAULT_CHAIN_ID,
): Chain {
  if (typeof chainIdentifier === 'string') {
    const networkName = chainIdentifier.toLowerCase();
    // Try to get from direct network name mapping first
    if (networkNameMap[networkName]) {
      return chainMap[networkNameMap[networkName]] || seiTestnet;
    }

    // If not found, throw an error
    throw new Error(`Unsupported network: ${chainIdentifier}`);
  }

  // If it's a number, return the chain from chainMap
  return chainMap[chainIdentifier] || seiTestnet;
}

/**
 * Gets the appropriate RPC URL for the specified chain ID or network name
 * @param chainIdentifier Chain ID (number) or network name (string)
 * @returns The RPC URL for the specified chain
 */
export function getRpcUrl(
  chainIdentifier: number | string = DEFAULT_CHAIN_ID,
): string {
  const chainId =
    typeof chainIdentifier === 'string'
      ? resolveChainId(chainIdentifier)
      : chainIdentifier;

  return rpcUrlMap[chainId] || DEFAULT_RPC_URL;
}

/**
 * Get a list of supported networks
 * @returns Array of supported network names (excluding short aliases)
 */
export function getSupportedNetworks(): string[] {
  return Object.keys(networkNameMap)
    .filter((name) => name.length > 2) // Filter out short aliases
    .sort();
}

/**
 * Check if a network is supported
 * @param networkName The network name to check
 * @returns True if the network is supported
 */
export function isNetworkSupported(networkName: string): boolean {
  const normalizedName = networkName.toLowerCase();
  return normalizedName in networkNameMap;
}

/**
 * Get the default network configuration
 * @returns Object containing default network settings
 */
export function getDefaultNetworkConfig() {
  return {
    network: DEFAULT_NETWORK,
    chainId: DEFAULT_CHAIN_ID,
    rpcUrl: DEFAULT_RPC_URL,
  };
}

/**
 * Validate and normalize a network identifier
 * @param networkIdentifier The network identifier to validate
 * @returns Normalized network name or throws error if invalid
 */
export function validateNetwork(networkIdentifier: string | number): string {
  if (typeof networkIdentifier === 'number') {
    // Check if the chain ID exists in our chain map
    if (networkIdentifier in chainMap) {
      // Find the network name for this chain ID
      const networkName = Object.entries(networkNameMap).find(
        ([, chainId]) => chainId === networkIdentifier,
      )?.[0];
      return networkName || DEFAULT_NETWORK;
    }
    throw new Error(`Unsupported chain ID: ${networkIdentifier}`);
  }

  const normalizedName = networkIdentifier.toLowerCase();
  if (isNetworkSupported(normalizedName)) {
    return normalizedName;
  }

  throw new Error(`Unsupported network: ${networkIdentifier}`);
}
