import { createWalletClient, http } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { mainnet, optimism, polygon, arbitrum, base } from "viem/chains"
import { Connection, Keypair } from "@solana/web3.js"
import base58 from "bs58"

import { getOnChainTools } from "@goat-sdk/adapter-vercel-ai"
import { USDC, WETH, erc20 } from "@goat-sdk/plugin-erc20"
import { sendETH } from "@goat-sdk/wallet-evm"
import { viem } from "@goat-sdk/wallet-viem"
import { sendSOL, solana } from "@goat-sdk/wallet-solana"
import { splToken } from "@goat-sdk/plugin-spl-token"
import { jupiter } from "@goat-sdk/plugin-jupiter"

// Supported chains
const SUPPORTED_CHAINS = {
  ethereum: mainnet,
  optimism,
  polygon,
  arbitrum,
  base,
  solana: "solana",
}

// Initialize GOAT SDK clients
export class GoatClient {
  private static instance: GoatClient
  private evmTools: Record<string, any> = {}
  private solanaTools: any = null
  private initialized = false

  private constructor() {}

  public static getInstance(): GoatClient {
    if (!GoatClient.instance) {
      GoatClient.instance = new GoatClient()
    }
    return GoatClient.instance
  }

  public async initialize(config: {
    evmPrivateKey?: string
    solanaPrivateKey?: string
    rpcUrls?: Record<string, string>
  }) {
    if (this.initialized) return

    // Initialize EVM clients
    if (config.evmPrivateKey) {
      const account = privateKeyToAccount(config.evmPrivateKey as `0x${string}`)

      for (const [chainName, chain] of Object.entries(SUPPORTED_CHAINS)) {
        if (chainName === "solana") continue

        const rpcUrl = config.rpcUrls?.[chainName] || process.env[`NEXT_PUBLIC_${chainName.toUpperCase()}_RPC_URL`]
        if (!rpcUrl) continue

        const walletClient = createWalletClient({
          account,
          transport: http(rpcUrl),
          chain: chain as any,
        })

        this.evmTools[chainName] = await getOnChainTools({
          wallet: viem(walletClient),
          plugins: [
            sendETH(),
            erc20({ tokens: [USDC, WETH] }),
            // Add more plugins as needed
          ],
        })
      }
    }

    // Initialize Solana client
    if (config.solanaPrivateKey) {
      const solanaRpcUrl = config.rpcUrls?.solana || process.env.NEXT_PUBLIC_SOLANA_RPC_URL
      if (solanaRpcUrl) {
        const connection = new Connection(solanaRpcUrl)
        const keypair = Keypair.fromSecretKey(base58.decode(config.solanaPrivateKey))

        this.solanaTools = await getOnChainTools({
          wallet: solana({
            keypair,
            connection,
          }),
          plugins: [
            sendSOL(),
            splToken(),
            jupiter(),
            // Add more plugins as needed
          ],
        })
      }
    }

    this.initialized = true
  }

  public getEvmTools(chain: string) {
    if (!this.initialized) {
      throw new Error("GOAT client not initialized")
    }
    return this.evmTools[chain]
  }

  public getSolanaTools() {
    if (!this.initialized) {
      throw new Error("GOAT client not initialized")
    }
    return this.solanaTools
  }

  public async executeWithAI(options: {
    chain: string
    prompt: string
    model: any
    maxSteps?: number
  }) {
    if (!this.initialized) {
      throw new Error("GOAT client not initialized")
    }

    const { chain, prompt, model, maxSteps = 10 } = options
    const tools = chain === "solana" ? this.solanaTools : this.evmTools[chain]

    if (!tools) {
      throw new Error(`Tools for chain ${chain} not initialized`)
    }

    const { generateText } = await import("ai")

    const result = await generateText({
      model,
      tools: tools,
      maxSteps,
      prompt,
    })

    return result
  }
}

export const goatClient = GoatClient.getInstance()
