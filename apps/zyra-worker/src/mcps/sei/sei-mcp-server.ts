import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import {
  http,
  createWalletClient,
  createPublicClient,
  formatEther,
  parseEther,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { z } from 'zod';

// Sei Network configurations
const seiMainnet = {
  id: 1329,
  name: 'Sei Mainnet',
  network: 'sei',
  nativeCurrency: {
    decimals: 18,
    name: 'SEI',
    symbol: 'SEI',
  },
  rpcUrls: {
    default: {
      http: ['https://evm-rpc.sei-apis.com'],
    },
    public: {
      http: ['https://evm-rpc.sei-apis.com'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Seitrace',
      url: 'https://seitrace.com',
    },
  },
  testnet: false,
} as const;

const seiTestnet = {
  id: parseInt(process.env.SEI_TESTNET_CHAIN_ID || '1328'),
  name: process.env.SEI_TESTNET_NAME || 'Sei Atlantic-2 Testnet',
  network: process.env.SEI_TESTNET_NETWORK || 'atlantic-2',
  nativeCurrency: {
    decimals: 18,
    name: 'SEI',
    symbol: 'SEI',
  },
  rpcUrls: {
    default: {
      http: [
        process.env.SEI_TESTNET_RPC || 'https://evm-rpc-testnet.sei-apis.com',
      ],
    },
    public: {
      http: [
        process.env.SEI_TESTNET_RPC || 'https://evm-rpc-testnet.sei-apis.com',
      ],
    },
  },
  blockExplorers: {
    default: {
      name: process.env.SEI_TESTNET_EXPLORER_NAME || 'Sei Testnet Explorer',
      url:
        process.env.SEI_TESTNET_EXPLORER_URL || 'https://testnet.seistream.app',
    },
  },
  testnet: true,
} as const;

// Determine network and setup clients
const useTestnet = process.env.SEI_NETWORK === 'testnet';
const chain = useTestnet ? seiTestnet : seiMainnet;
const defaultRpcUrl = useTestnet
  ? process.env.SEI_TESTNET_RPC || 'https://evm-rpc-testnet.sei-apis.com'
  : process.env.SEI_MAINNET_RPC || 'https://evm-rpc.sei-apis.com';

const rpcUrl = process.env.CUSTOM_RPC_URL || defaultRpcUrl;

// Create public client (always available)
const publicClient = createPublicClient({
  chain,
  transport: http(rpcUrl),
});

// Create wallet client if wallet mode is enabled
let walletClient: any = null;
let account: any = null;

const walletMode = process.env.WALLET_MODE || 'private-key';
const isWalletEnabled = walletMode === 'private-key' && process.env.PRIVATE_KEY;

if (isWalletEnabled) {
  try {
    account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
    walletClient = createWalletClient({
      account,
      chain,
      transport: http(rpcUrl),
    });
    console.error(
      `Sei MCP Server: Wallet enabled with address ${account.address}`,
    );
  } catch (error) {
    console.error(`Sei MCP Server: Failed to initialize wallet: ${error}`);
  }
} else {
  console.error(
    'Sei MCP Server: Wallet functionality disabled - running in read-only mode',
  );
}

console.error(
  `Sei MCP Server: Initialized for ${chain.name} (Chain ID: ${chain.id})`,
);

// Define SEI MCP tools
const seiTools = [
  // Network and Chain Information
  {
    name: 'get_chain_info',
    description: 'Get information about the Sei network',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
    handler: async () => {
      try {
        const chainId = await publicClient.getChainId();
        const blockNumber = await publicClient.getBlockNumber();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  network: chain.name,
                  chainId,
                  latestBlock: blockNumber.toString(),
                  nativeCurrency: chain.nativeCurrency,
                  rpcUrl,
                  blockExplorer: chain.blockExplorers.default.url,
                  walletEnabled: isWalletEnabled,
                  walletAddress: account?.address || null,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  error: error instanceof Error ? error.message : String(error),
                },
                null,
                2,
              ),
            },
          ],
        };
      }
    },
  },

  {
    name: 'get_supported_networks',
    description: 'Get a list of supported EVM networks',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
    handler: async () => {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                networks: [
                  {
                    name: 'Sei Mainnet',
                    chainId: 1329,
                    rpc: 'https://evm-rpc.sei-apis.com',
                    testnet: false,
                  },
                  {
                    name: 'Sei Testnet',
                    chainId: 1328,
                    rpc: 'https://evm-rpc-testnet.sei-apis.com',
                    testnet: true,
                  },
                ],
                currentNetwork: chain.name,
                currentChainId: chain.id,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  },

  // Block Information
  {
    name: 'get_latest_block',
    description: 'Get the latest block from the EVM',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
    handler: async () => {
      try {
        const block = await publicClient.getBlock({ blockTag: 'latest' });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  block: {
                    number: block.number.toString(),
                    hash: block.hash,
                    timestamp: block.timestamp.toString(),
                    gasUsed: block.gasUsed.toString(),
                    gasLimit: block.gasLimit.toString(),
                    transactionCount: block.transactions.length,
                    miner: block.miner,
                    difficulty: block.difficulty?.toString() || '0',
                    totalDifficulty: block.totalDifficulty?.toString() || '0',
                  },
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  error: error instanceof Error ? error.message : String(error),
                },
                null,
                2,
              ),
            },
          ],
        };
      }
    },
  },

  {
    name: 'get_block_by_number',
    description: 'Get a block by its block number',
    inputSchema: {
      type: 'object',
      properties: {
        blockNumber: {
          type: 'number',
          description: 'Block number to retrieve',
        },
      },
      required: ['blockNumber'],
    },
    handler: async (params: any) => {
      try {
        const block = await publicClient.getBlock({
          blockNumber: BigInt(params.blockNumber),
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  block: {
                    number: block.number.toString(),
                    hash: block.hash,
                    timestamp: block.timestamp.toString(),
                    gasUsed: block.gasUsed.toString(),
                    gasLimit: block.gasLimit.toString(),
                    transactionCount: block.transactions.length,
                    miner: block.miner,
                    parentHash: block.parentHash,
                  },
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  error: error instanceof Error ? error.message : String(error),
                },
                null,
                2,
              ),
            },
          ],
        };
      }
    },
  },

  // Balance Operations
  {
    name: 'get_balance',
    description: 'Get the native token balance (Sei) for an address',
    inputSchema: {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          description:
            'Wallet address to check balance for (uses wallet address if not provided)',
        },
      },
      required: [],
    },
    handler: async (params: any) => {
      try {
        const address = params.address || account?.address;
        if (!address) {
          throw new Error('No address provided and no wallet configured');
        }

        const balance = await publicClient.getBalance({ address });
        const formattedBalance = formatEther(balance);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  address,
                  balance: {
                    wei: balance.toString(),
                    sei: formattedBalance,
                    formatted: `${formattedBalance} SEI`,
                  },
                  network: chain.name,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  error: error instanceof Error ? error.message : String(error),
                },
                null,
                2,
              ),
            },
          ],
        };
      }
    },
  },

  {
    name: 'get_erc20_balance',
    description: 'Get the ERC20 token balance of an EVM address',
    inputSchema: {
      type: 'object',
      properties: {
        tokenAddress: {
          type: 'string',
          description: 'ERC20 token contract address',
        },
        ownerAddress: {
          type: 'string',
          description:
            'Owner wallet address (uses wallet address if not provided)',
        },
      },
      required: ['tokenAddress'],
    },
    handler: async (params: any) => {
      try {
        const ownerAddress = params.ownerAddress || account?.address;
        if (!ownerAddress) {
          throw new Error('No owner address provided and no wallet configured');
        }

        // ERC20 balanceOf function call
        const balance = await publicClient.readContract({
          address: params.tokenAddress,
          abi: [
            {
              constant: true,
              inputs: [{ name: '_owner', type: 'address' }],
              name: 'balanceOf',
              outputs: [{ name: 'balance', type: 'uint256' }],
              type: 'function',
            },
          ],
          functionName: 'balanceOf',
          args: [ownerAddress],
        });

        // Get token info
        const [name, symbol, decimals] = await Promise.all([
          publicClient.readContract({
            address: params.tokenAddress,
            abi: [
              {
                constant: true,
                inputs: [],
                name: 'name',
                outputs: [{ name: '', type: 'string' }],
                type: 'function',
              },
            ],
            functionName: 'name',
          }),
          publicClient.readContract({
            address: params.tokenAddress,
            abi: [
              {
                constant: true,
                inputs: [],
                name: 'symbol',
                outputs: [{ name: '', type: 'string' }],
                type: 'function',
              },
            ],
            functionName: 'symbol',
          }),
          publicClient.readContract({
            address: params.tokenAddress,
            abi: [
              {
                constant: true,
                inputs: [],
                name: 'decimals',
                outputs: [{ name: '', type: 'uint8' }],
                type: 'function',
              },
            ],
            functionName: 'decimals',
          }),
        ]);

        const formatted = formatEther(balance as bigint);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  ownerAddress,
                  tokenAddress: params.tokenAddress,
                  token: { name, symbol, decimals },
                  balance: {
                    raw: (balance as bigint).toString(),
                    formatted,
                    display: `${formatted} ${symbol}`,
                  },
                  network: chain.name,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  error: error instanceof Error ? error.message : String(error),
                },
                null,
                2,
              ),
            },
          ],
        };
      }
    },
  },

  // Transaction Operations
  {
    name: 'get_transaction',
    description:
      'Get detailed information about a specific transaction by its hash',
    inputSchema: {
      type: 'object',
      properties: {
        hash: {
          type: 'string',
          description: 'Transaction hash',
        },
      },
      required: ['hash'],
    },
    handler: async (params: any) => {
      try {
        const transaction = await publicClient.getTransaction({
          hash: params.hash,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  transaction: {
                    hash: transaction.hash,
                    blockNumber: transaction.blockNumber?.toString(),
                    from: transaction.from,
                    to: transaction.to,
                    value: transaction.value.toString(),
                    valueFormatted: formatEther(transaction.value),
                    gasPrice: transaction.gasPrice?.toString(),
                    gas: transaction.gas?.toString(),
                    nonce: transaction.nonce,
                    input: transaction.input,
                    type: transaction.type,
                  },
                  network: chain.name,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  error: error instanceof Error ? error.message : String(error),
                },
                null,
                2,
              ),
            },
          ],
        };
      }
    },
  },

  {
    name: 'get_transaction_receipt',
    description: 'Get a transaction receipt by its hash',
    inputSchema: {
      type: 'object',
      properties: {
        hash: {
          type: 'string',
          description: 'Transaction hash',
        },
      },
      required: ['hash'],
    },
    handler: async (params: any) => {
      try {
        const receipt = await publicClient.getTransactionReceipt({
          hash: params.hash,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  receipt: {
                    transactionHash: receipt.transactionHash,
                    blockNumber: receipt.blockNumber.toString(),
                    blockHash: receipt.blockHash,
                    status: receipt.status,
                    gasUsed: receipt.gasUsed.toString(),
                    effectiveGasPrice: receipt.effectiveGasPrice?.toString(),
                    from: receipt.from,
                    to: receipt.to,
                    logs: receipt.logs.length,
                    logsBloom: receipt.logsBloom,
                  },
                  network: chain.name,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  error: error instanceof Error ? error.message : String(error),
                },
                null,
                2,
              ),
            },
          ],
        };
      }
    },
  },

  {
    name: 'estimate_gas',
    description: 'Estimate the gas cost for a transaction',
    inputSchema: {
      type: 'object',
      properties: {
        to: {
          type: 'string',
          description: 'Recipient address',
        },
        value: {
          type: 'string',
          description: 'Value to send in ETH (optional)',
        },
        data: {
          type: 'string',
          description: 'Transaction data (optional)',
        },
      },
      required: ['to'],
    },
    handler: async (params: any) => {
      try {
        const from = account?.address;
        if (!from) {
          throw new Error('No wallet configured for gas estimation');
        }

        const gasEstimate = await publicClient.estimateGas({
          account: from,
          to: params.to,
          value: params.value ? parseEther(params.value) : undefined,
          data: params.data || '0x',
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  gasEstimate: gasEstimate.toString(),
                  from,
                  to: params.to,
                  value: params.value || '0',
                  network: chain.name,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  error: error instanceof Error ? error.message : String(error),
                },
                null,
                2,
              ),
            },
          ],
        };
      }
    },
  },

  // Wallet Operations (only available if wallet is enabled)
  ...(isWalletEnabled
    ? [
        {
          name: 'send_transaction',
          description: 'Send a transaction on the Sei network',
          inputSchema: {
            type: 'object',
            properties: {
              to: {
                type: 'string',
                description: 'Recipient address',
              },
              value: {
                type: 'string',
                description: 'Value to send in SEI',
              },
              data: {
                type: 'string',
                description: 'Transaction data (optional)',
              },
            },
            required: ['to', 'value'],
          },
          handler: async (params: any) => {
            try {
              if (!walletClient) {
                throw new Error('Wallet not configured');
              }

              const hash = await walletClient.sendTransaction({
                to: params.to,
                value: parseEther(params.value),
                data: params.data || '0x',
              });

              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(
                      {
                        success: true,
                        transactionHash: hash,
                        from: account.address,
                        to: params.to,
                        value: params.value,
                        network: chain.name,
                      },
                      null,
                      2,
                    ),
                  },
                ],
              };
            } catch (error) {
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(
                      {
                        success: false,
                        error:
                          error instanceof Error
                            ? error.message
                            : String(error),
                      },
                      null,
                      2,
                    ),
                  },
                ],
              };
            }
          },
        },
      ]
    : []),

  // Documentation Search (mock implementation)
  {
    name: 'search_docs',
    description: 'Search the main Sei docs for general chain information',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query for Sei documentation',
        },
      },
      required: ['query'],
    },
    handler: async (params: any) => {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                query: params.query,
                results: [
                  {
                    title: 'Sei Network Documentation',
                    content: `Documentation search for: ${params.query}`,
                    link: 'https://docs.sei.io',
                  },
                ],
                message:
                  'This is a simplified search implementation. For full documentation, visit https://docs.sei.io',
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  },
];

// Create and configure the MCP server
const server = new Server(
  {
    name: 'sei-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: seiTools };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const tool = seiTools.find((t) => t.name === request.params.name);

  if (!tool) {
    throw new Error(`Tool ${request.params.name} not found`);
  }

  try {
    return await tool.handler(request.params.arguments || {});
  } catch (error) {
    throw new Error(`Tool ${request.params.name} failed: ${error}`);
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Sei MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
