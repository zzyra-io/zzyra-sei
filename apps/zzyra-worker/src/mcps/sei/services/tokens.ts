import { type Address, type Hash, type Hex, formatUnits } from 'viem';
import { getPublicClient } from './clients';
import { readContract } from './contracts';

// Standard ERC20 ABI (minimal for reading)
const erc20Abi = [
  {
    inputs: [],
    name: 'name',
    outputs: [{ type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Standard ERC721 ABI (minimal for reading)
const erc721Abi = [
  {
    inputs: [],
    name: 'name',
    outputs: [{ type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ type: 'uint256', name: 'tokenId' }],
    name: 'tokenURI',
    outputs: [{ type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Standard ERC1155 ABI (minimal for reading)
const erc1155Abi = [
  {
    inputs: [{ type: 'uint256', name: 'id' }],
    name: 'uri',
    outputs: [{ type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

/**
 * Get ERC20 token information
 */
export async function getERC20TokenInfo(
  tokenAddress: Address,
  network = 'sei',
): Promise<{
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: bigint;
  formattedTotalSupply: string;
}> {
  const [name, symbol, decimals, totalSupply] = await Promise.all([
    readContract(
      {
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'name',
      },
      network,
    ),
    readContract(
      {
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'symbol',
      },
      network,
    ),
    readContract(
      {
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'decimals',
      },
      network,
    ),
    readContract(
      {
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'totalSupply',
      },
      network,
    ),
  ]);

  return {
    name: name as string,
    symbol: symbol as string,
    decimals: decimals as number,
    totalSupply: totalSupply as bigint,
    formattedTotalSupply: formatUnits(
      totalSupply as bigint,
      decimals as number,
    ),
  };
}

/**
 * Get ERC721 token metadata
 */
export async function getERC721TokenMetadata(
  tokenAddress: Address,
  tokenId: bigint,
  network = 'sei',
): Promise<{
  name: string;
  symbol: string;
  tokenURI: string;
}> {
  const [name, symbol, tokenURI] = await Promise.all([
    readContract(
      {
        address: tokenAddress,
        abi: erc721Abi,
        functionName: 'name',
      },
      network,
    ),
    readContract(
      {
        address: tokenAddress,
        abi: erc721Abi,
        functionName: 'symbol',
      },
      network,
    ),
    readContract(
      {
        address: tokenAddress,
        abi: erc721Abi,
        functionName: 'tokenURI',
        args: [tokenId],
      },
      network,
    ),
  ]);

  return {
    name: name as string,
    symbol: symbol as string,
    tokenURI: tokenURI as string,
  };
}

/**
 * Get ERC1155 token URI
 */
export async function getERC1155TokenURI(
  tokenAddress: Address,
  tokenId: bigint,
  network = 'sei',
): Promise<string> {
  return (await readContract(
    {
      address: tokenAddress,
      abi: erc1155Abi,
      functionName: 'uri',
      args: [tokenId],
    },
    network,
  )) as string;
}
