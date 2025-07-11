import {
  mainnet,
  polygonAmoy,
  baseSepolia,
  sepolia,
  polygon,
  sei,
} from "wagmi/chains";
import type { Chain } from "wagmi/chains";
import { config } from "../config";

// import { sonic_blaze_rpc } from "@/constants/sonic";

// Single source of truth for supported networks
export const supportedNetworks = [
  baseSepolia,
  polygonAmoy,
  mainnet,
  sepolia,
  polygon,
  sei,
] as const;

// Type for supported networks
export type SupportedNetwork = (typeof supportedNetworks)[number];

// Network configuration mapping chain ID to RPC URLs
export const NETWORK_CONFIG: Record<number, { chain: Chain; rpcUrl: string }> =
  {
    [baseSepolia.id]: {
      chain: baseSepolia,
      rpcUrl:
        "https://base-sepolia.g.alchemy.com/v2/fYFybLQFR9Zr2GCRcgALmAktStFKr0i0",
    },
    [polygonAmoy.id]: {
      chain: polygonAmoy,
      rpcUrl: "https://rpc-amoy.polygon.technology/",
    },
    [mainnet.id]: {
      chain: mainnet,
      rpcUrl:
        "https://eth-mainnet.g.alchemy.com/v2/fYFybLQFR9Zr2GCRcgALmAktStFKr0i0",
    },
    [sepolia.id]: {
      chain: sepolia,
      rpcUrl:
        "https://eth-sepolia.g.alchemy.com/v2/fYFybLQFR9Zr2GCRcgALmAktStFKr0i0",
    },
    [polygon.id]: {
      chain: polygon,
      rpcUrl: "https://polygon-rpc.com/",
    },
    [sei.id]: {
      chain: sei,
      rpcUrl: sei.rpcUrls.default.http[0],
    },
  };

// Active networks - change order to control priority (first is default)
export const ACTIVE_NETWORKS = [
  baseSepolia,
  polygonAmoy,
  mainnet,
  sei,
] as const;

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
    case polygonAmoy.id:
    case polygon.id:
      return "MATIC";
    case mainnet.id:
    case sepolia.id:
    case baseSepolia.id:
      return "ETH";
    default:
      return "ETH";
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
    case polygonAmoy.id:
      return "https://faucet.polygon.technology/";
    case sepolia.id:
      return "https://sepoliafaucet.com/";
    case baseSepolia.id:
      return "https://faucet.base.org/";
    case polygon.id:
    case mainnet.id:
      return undefined; // No faucets for mainnets
    default:
      return "https://sepoliafaucet.com/";
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
    case polygon.id:
      return `https://polygonscan.com/address/${address}`;
    case polygonAmoy.id:
      return `https://www.oklink.com/amoy/address/${address}`;
    case mainnet.id:
      return `https://etherscan.io/address/${address}`;
    case sepolia.id:
      return `https://sepolia.etherscan.io/address/${address}`;
    case baseSepolia.id:
      return `https://basescan.org/address/${address}`;
    default:
      return `https://sepolia.etherscan.io/address/${address}`;
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
    case sepolia.id:
    case mainnet.id:
      return true;
    case baseSepolia.id:
    case polygon.id:
    case polygonAmoy.id:
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
