import { Injectable, Logger } from '@nestjs/common';
import { MagicAdminService } from './magic-admin.service';
import { DatabaseService } from './database.service';
import { ethers } from 'ethers';

/**
 * Magic Trade Service
 * Handles trade execution for Magic Link wallets
 * Supports selling ETH for stablecoins
 */
@Injectable()
export class MagicTradeService {
  private readonly logger = new Logger(MagicTradeService.name);

  // Common stablecoin addresses on Ethereum
  private readonly STABLECOINS = {
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  };

  // Uniswap V2 Router address
  private readonly UNISWAP_ROUTER =
    '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';

  // Uniswap Router ABI (only the functions we need)
  private readonly UNISWAP_ABI = [
    'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
    'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
  ];

  constructor(
    private readonly magicAdminService: MagicAdminService,
    private readonly databaseService: DatabaseService,
  ) {}

  /**
   * Sell ETH for a stablecoin
   * @param userId User ID
   * @param amountEth Amount of ETH to sell
   * @param stablecoin Stablecoin to receive (USDC, USDT, DAI)
   * @param chainId Chain ID (default: 1 for Ethereum mainnet)
   * @param slippagePercent Maximum slippage percentage (default: 0.5%)
   */
  async sellEthForStablecoin(
    userId: string,
    amountEth: string,
    stablecoin: 'USDC' | 'USDT' | 'DAI' = 'USDC',
    chainId: number = 1,
    slippagePercent: number = 0.5,
  ): Promise<any> {
    this.logger.log(
      `Selling ${amountEth} ETH for ${stablecoin} for user ${userId} on chain ${chainId}`,
    );

    // Get user's Magic wallet info from database
    const userWallet = await this.databaseService.prisma.userWallet.findFirst({
      where: { userId },
    });

    if (!userWallet) {
      throw new Error(`No wallet found for user ${userId}`);
    }

    // Extract Magic issuer from wallet metadata
    const metadata = userWallet.metadata as Record<string, any>;
    const magicIssuer = metadata?.magicIssuer;

    if (!magicIssuer) {
      throw new Error(`No Magic issuer found for user ${userId}`);
    }

    // Get wallet metadata from Magic
    const walletInfo = await this.magicAdminService.getUserWallet(
      magicIssuer,
      'ETH',
    );

    // Connect to provider based on chain ID
    const provider = this.getProviderForChain(chainId);

    // Get current ETH balance
    const balance = await provider.getBalance(walletInfo.publicAddress);
    const formattedBalance = ethers.formatEther(balance);

    this.logger.log(`Current ETH balance: ${formattedBalance}`);

    // Check if user has enough ETH
    const amountWei = ethers.parseEther(amountEth);
    if (balance < amountWei) {
      throw new Error(
        `Insufficient ETH balance. Required: ${amountEth}, Available: ${formattedBalance}`,
      );
    }

    // Get stablecoin address
    const stablecoinAddress = this.STABLECOINS[stablecoin];
    if (!stablecoinAddress) {
      throw new Error(`Unsupported stablecoin: ${stablecoin}`);
    }

    // Create Uniswap router contract instance
    const uniswapRouter = new ethers.Contract(
      this.UNISWAP_ROUTER,
      this.UNISWAP_ABI,
      provider,
    );

    // Calculate expected output amount
    const path = [ethers.ZeroAddress, stablecoinAddress]; // ETH -> Stablecoin
    const amountsOut = await uniswapRouter.getAmountsOut(amountWei, path);
    const expectedOutput = amountsOut[1];

    // Calculate minimum output with slippage
    const slippageFactor = 1 - slippagePercent / 100;
    const minOutput =
      (expectedOutput * BigInt(Math.floor(slippageFactor * 1000))) /
      BigInt(1000);

    // Prepare transaction data for swapping ETH for stablecoin
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes from now
    const data = uniswapRouter.interface.encodeFunctionData(
      'swapExactETHForTokens',
      [minOutput, path, walletInfo.publicAddress, deadline],
    );

    // Prepare transaction parameters
    const txParams = {
      from: walletInfo.publicAddress,
      to: this.UNISWAP_ROUTER,
      value: amountWei.toString(),
      data,
      chainId,
    };

    // Log transaction details
    this.logger.log(`Prepared transaction: ${JSON.stringify(txParams)}`);

    // In a production environment, the actual transaction would be signed and sent
    // using Magic Admin SDK's server-side signing capabilities
    // For now, we'll just return the transaction parameters
    return {
      status: 'prepared',
      transaction: txParams,
      expectedOutput: ethers.formatUnits(
        expectedOutput,
        stablecoin === 'USDC' || stablecoin === 'USDT' ? 6 : 18,
      ),
      minOutput: ethers.formatUnits(
        minOutput,
        stablecoin === 'USDC' || stablecoin === 'USDT' ? 6 : 18,
      ),
      stablecoin,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Helper method to get provider for a specific chain
   */
  private getProviderForChain(chainId: number): ethers.Provider {
    // Get RPC URL from environment variables based on chain ID
    let rpcUrl: string;
    switch (chainId) {
      case 1: // Ethereum Mainnet
        rpcUrl =
          process.env.ETH_MAINNET_RPC_URL ||
          'https://eth-mainnet.g.alchemy.com/v2/demo';
        break;
      case 5: // Goerli Testnet
        rpcUrl =
          process.env.ETH_GOERLI_RPC_URL ||
          'https://eth-goerli.g.alchemy.com/v2/demo';
        break;
      case 137: // Polygon Mainnet
        rpcUrl =
          process.env.POLYGON_MAINNET_RPC_URL ||
          'https://polygon-mainnet.g.alchemy.com/v2/demo';
        break;
      case 80001: // Mumbai Testnet
        rpcUrl =
          process.env.POLYGON_MUMBAI_RPC_URL ||
          'https://polygon-mumbai.g.alchemy.com/v2/demo';
        break;
      default:
        rpcUrl =
          process.env.ETH_MAINNET_RPC_URL ||
          'https://eth-mainnet.g.alchemy.com/v2/demo';
    }

    return new ethers.JsonRpcProvider(rpcUrl);
  }
}
