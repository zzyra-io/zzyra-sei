import { seiTestnet } from "wagmi/chains";
import type { Chain } from "wagmi/chains";
import { config } from "../config";

// Single source of truth for supported networks
export const supportedNetworks = [seiTestnet] as const;

// Type for supported networks
export type SupportedNetwork = (typeof supportedNetworks)[number];

// Network configuration mapping chain ID to RPC URLs
export const NETWORK_CONFIG: Record<number, { chain: Chain; rpcUrl: string }> =
  {
    [seiTestnet.id]: {
      chain: seiTestnet,
      rpcUrl: seiTestnet.rpcUrls.default.http[0],
    },
  };

// Active networks - only Sei testnet for now
export const ACTIVE_NETWORKS = [seiTestnet] as const;

// Get the default network (first in ACTIVE_NETWORKS)
export const getDefaultNetwork = (): Chain => {
  return ACTIVE_NETWORKS[0];
};

// Get active chains for wagmi config
export const getActiveChains = (): [Chain, ...Chain[]] => {
  const chains = [...ACTIVE_NETWORKS];
  if (chains.length === 0) {
    throw new Error("At least one active network must be configured");
  }
  return [chains[0], ...chains.slice(1)];
};

// Get active network configs for Magic connector
export const getActiveNetworkConfigs = () => {
  return ACTIVE_NETWORKS.map((chain) => ({
    rpcUrl: NETWORK_CONFIG[chain.id].rpcUrl,
    chainId: chain.id,
  }));
};

// Get current network from environment or default
export const getCurrentNetwork = (): Chain => {
  const envChainId = config.blockchainNetwork;
  if (envChainId) {
    const chainId = parseInt(envChainId) as number;
    const network = supportedNetworks.find((chain) => chain.id === chainId);
    if (network) return network;
  }
  return getDefaultNetwork();
};

// Check if a chain ID is supported
function isSupportedChain(chainId: number): boolean {
  return chainId in NETWORK_CONFIG;
}

// Get network URL by chain ID
export const getNetworkUrl = (chainIdOrChain?: number | Chain): string => {
  const chainId =
    typeof chainIdOrChain === "number"
      ? chainIdOrChain
      : (chainIdOrChain?.id ?? getCurrentNetwork().id);

  if (!isSupportedChain(chainId)) {
    console.warn(
      `Chain ID ${chainId} not supported, defaulting to ${getDefaultNetwork().name}`
    );
    return NETWORK_CONFIG[getDefaultNetwork().id].rpcUrl;
  }
  return NETWORK_CONFIG[chainId].rpcUrl;
};

// Get chain ID (for backward compatibility)
export const getChainId = (chainIdOrChain?: number | Chain): number => {
  if (typeof chainIdOrChain === "number") return chainIdOrChain;
  if (chainIdOrChain?.id) return chainIdOrChain.id;
  return getCurrentNetwork().id;
};

// Get network token symbol
export const getNetworkToken = (chainIdOrChain?: number | Chain): string => {
  const chainId =
    typeof chainIdOrChain === "number"
      ? chainIdOrChain
      : (chainIdOrChain?.id ?? getCurrentNetwork().id);

  switch (chainId) {
    case seiTestnet.id:
      return "SEI";
    default:
      return "SEI";
  }
};

// Get faucet URL for testnet networks
export const getFaucetUrl = (
  chainIdOrChain?: number | Chain
): string | undefined => {
  const chainId =
    typeof chainIdOrChain === "number"
      ? chainIdOrChain
      : (chainIdOrChain?.id ?? getCurrentNetwork().id);

  switch (chainId) {
    case seiTestnet.id:
      return undefined; // Use wagmi default
    default:
      return undefined;
  }
};

// Get network display name
export const getNetworkName = (chainIdOrChain?: number | Chain): string => {
  const chainId =
    typeof chainIdOrChain === "number"
      ? chainIdOrChain
      : (chainIdOrChain?.id ?? getCurrentNetwork().id);

  const config = NETWORK_CONFIG[chainId];
  if (config) {
    return config.chain.name;
  }
  return `Unknown Network (${chainId})`;
};

// Get block explorer URL
export const getBlockExplorer = (
  address: string,
  chainIdOrChain?: number | Chain
): string => {
  const chainId =
    typeof chainIdOrChain === "number"
      ? chainIdOrChain
      : (chainIdOrChain?.id ?? getCurrentNetwork().id);

  switch (chainId) {
    case seiTestnet.id:
      return seiTestnet.blockExplorers?.default.url + `/address/${address}`;
    default:
      return seiTestnet.blockExplorers?.default.url + `/address/${address}`;
  }
};

// Check if EIP-1559 is supported
export const isEip1559Supported = (
  chainIdOrChain?: number | Chain
): boolean => {
  const chainId =
    typeof chainIdOrChain === "number"
      ? chainIdOrChain
      : (chainIdOrChain?.id ?? getCurrentNetwork().id);

  switch (chainId) {
    case seiTestnet.id:
      return false;
    default:
      return false;
  }
};

// Get chain by ID
export const getChainById = (chainId: number): Chain | undefined => {
  return supportedNetworks.find((chain) => chain.id === chainId);
};

// Check if chain is active
export const isActiveNetwork = (chainId: number): boolean => {
  return ACTIVE_NETWORKS.some((chain) => chain.id === chainId);
};
