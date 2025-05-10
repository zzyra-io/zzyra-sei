import { ethers } from 'ethers';
import { ProtocolProvider } from '../protocol-provider';
import { Injectable } from '@nestjs/common';

/**
 * Aave protocol provider implementation
 * Integrates with Aave V3 protocol for lending/borrowing operations
 */
@Injectable()
export class AaveProtocolProvider implements ProtocolProvider {
  private readonly rpcUrl: string;
  private provider: ethers.JsonRpcProvider;
  private readonly aavePoolAddress: string;
  private readonly aavePoolAbi: any[];
  private readonly privateKey: string;
  
  constructor() {
    this.rpcUrl = process.env.RPC_URL || 'https://eth.llamarpc.com';
    this.provider = new ethers.JsonRpcProvider(this.rpcUrl);
    this.privateKey = process.env.ETHEREUM_PRIVATE_KEY || '';
    
    // Aave V3 Pool contract addresses per network
    const poolAddresses = {
      // Ethereum Mainnet
      '1': '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
      // Polygon Mainnet
      '137': '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
      // Arbitrum
      '42161': '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
      // Optimism
      '10': '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
      // Avalanche
      '43114': '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
    };
    
    const networkId = process.env.NETWORK_ID || '1';
    this.aavePoolAddress = poolAddresses[networkId as keyof typeof poolAddresses] || poolAddresses['1'];
    
    // Aave V3 Pool ABI (partial, focusing on key functions)
    this.aavePoolAbi = [
      // Supply function
      'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external',
      // Withdraw function
      'function withdraw(address asset, uint256 amount, address to) external returns (uint256)',
      // Borrow function
      'function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external',
      // Repay function
      'function repay(address asset, uint256 amount, uint256 interestRateMode, address onBehalfOf) external returns (uint256)',
      // Get user account data
      'function getUserAccountData(address user) external view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)',
      // Get reserve data
      'function getReserveData(address asset) external view returns (tuple(uint256 configuration, uint128 liquidityIndex, uint128 currentLiquidityRate, uint128 variableBorrowIndex, uint128 currentVariableBorrowRate, uint128 currentStableBorrowRate, uint40 lastUpdateTimestamp, uint16 id, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint128 accruedToTreasury, uint128 unbacked, uint128 isolationModeTotalDebt) data)',
      // ERC20 functions for approvals
      'function approve(address spender, uint256 amount) external returns (bool)',
      'function allowance(address owner, address spender) external view returns (uint256)'
    ];
  }

  /**
   * Get the health factor of the protocol
   * In Aave, health factor represents the safety of a user's loan position
   * @param protocol Not used, as this provider is specific to Aave
   * @param walletAddress The user's wallet address to check
   */
  async getHealth(protocol: string, walletAddress?: string): Promise<number> {
    if (!walletAddress) {
      return 100; // Default value if no wallet is provided
    }
    
    try {
      const aavePool = new ethers.Contract(
        this.aavePoolAddress,
        this.aavePoolAbi,
        this.provider
      );
      
      const accountData = await aavePool.getUserAccountData(walletAddress);
      
      // Health factor is returned as a BigNumber with 18 decimals
      // A health factor of 1 is the minimum (1e18 in raw value)
      // Below 1, the position can be liquidated
      const healthFactor = Number(ethers.formatUnits(accountData.healthFactor, 18));
      
      // Return a normalized value between 0-100
      // Health factor < 1 is dangerous, > 2 is generally safe
      return Math.min(100, Math.max(0, healthFactor * 50));
    } catch (error) {
      console.error('Error getting Aave health factor:', error);
      return 0;
    }
  }

  /**
   * Get yields for multiple assets on Aave
   * @param protocol Not used, as this provider is specific to Aave
   * @param assets List of asset addresses to get yields for
   */
  async getProtocolYields(protocol: string, assets: string[]): Promise<Record<string, number>> {
    const yields: Record<string, number> = {};
    
    for (const asset of assets) {
      yields[asset] = await this.getAssetYield(protocol, asset);
    }
    
    return yields;
  }

  /**
   * Get the yield (lending rate) for a specific asset on Aave
   * @param protocol Not used, as this provider is specific to Aave
   * @param asset The asset address to get yield for
   */
  async getAssetYield(protocol: string, asset: string): Promise<number> {
    try {
      const aavePool = new ethers.Contract(
        this.aavePoolAddress,
        this.aavePoolAbi,
        this.provider
      );
      
      const reserveData = await aavePool.getReserveData(asset);
      
      // Lending rate is returned as a BigNumber with 27 decimals (ray units)
      // Convert to an annual percentage rate
      const lendingRate = Number(ethers.formatUnits(reserveData.currentLiquidityRate, 27)) * 100;
      
      return lendingRate;
    } catch (error) {
      console.error(`Error getting yield for asset ${asset}:`, error);
      return 0;
    }
  }

  /**
   * Get user positions (deposits and borrows) on Aave
   * @param protocol Not used, as this provider is specific to Aave
   * @param walletAddress The user's wallet address
   * @param assets Optional list of assets to filter by
   */
  async getPositions(protocol: string, walletAddress: string, assets?: string[]): Promise<any[]> {
    if (!walletAddress) {
      return [];
    }
    
    try {
      // This is a simplified implementation
      // In a real implementation, we would need to:
      // 1. Get all reserves from Aave
      // 2. For each reserve, check if the user has deposits or borrows
      // 3. Get token balances for aTokens (deposits) and debtTokens (borrows)
      
      const aavePool = new ethers.Contract(
        this.aavePoolAddress,
        this.aavePoolAbi,
        this.provider
      );
      
      const accountData = await aavePool.getUserAccountData(walletAddress);
      
      // For MVP, we'll return a simplified position object
      return [
        {
          protocol: 'aave',
          totalCollateralUSD: Number(ethers.formatUnits(accountData.totalCollateralBase, 8)),
          totalBorrowsUSD: Number(ethers.formatUnits(accountData.totalDebtBase, 8)),
          healthFactor: Number(ethers.formatUnits(accountData.healthFactor, 18)),
          availableBorrowsUSD: Number(ethers.formatUnits(accountData.availableBorrowsBase, 8)),
          ltv: Number(accountData.ltv) / 10000, // LTV is in basis points (1% = 100 BP)
        }
      ];
    } catch (error) {
      console.error('Error getting Aave positions:', error);
      return [];
    }
  }

  /**
   * Execute a token swap (not directly applicable to Aave)
   * For Aave, could be used to swap and then deposit
   */
  async executeSwap(params: {
    sourceAsset: string;
    targetAsset: string;
    amount: ethers.BigNumberish;
    slippage: number;
    gasLimit: number;
    maxFee: number;
  }): Promise<ethers.TransactionResponse> {
    throw new Error('Swap functionality not implemented for Aave provider');
  }

  /**
   * Deposit/supply assets to Aave
   */
  async provideLiquidity(params: {
    poolAddress: string;
    tokenA: string; // Asset address
    tokenB: string; // Not used for Aave
    amount: ethers.BigNumberish;
    slippage: number;
  }): Promise<ethers.TransactionResponse> {
    if (!this.privateKey) {
      throw new Error('Private key not configured');
    }
    
    try {
      const wallet = new ethers.Wallet(this.privateKey, this.provider);
      const aavePool = new ethers.Contract(
        this.aavePoolAddress,
        this.aavePoolAbi,
        wallet
      );
      
      // For ERC20 tokens, we need to approve first
      if (params.tokenA !== ethers.ZeroAddress) { // Not ETH
        const erc20 = new ethers.Contract(
          params.tokenA,
          ['function approve(address spender, uint256 amount) external returns (bool)'],
          wallet
        );
        
        // Approve the pool contract to spend tokens
        const approveTx = await erc20.approve(this.aavePoolAddress, params.amount);
        await approveTx.wait();
      }
      
      // Supply to Aave
      // referralCode is 0 for no referral
      const tx = await aavePool.supply(
        params.tokenA,
        params.amount,
        wallet.address,
        0
      );
      
      return tx;
    } catch (error) {
      console.error('Error supplying to Aave:', error);
      throw error;
    }
  }

  /**
   * Withdraw assets from Aave
   */
  async removeLiquidity(params: {
    poolAddress: string; // Not used for Aave
    amount: ethers.BigNumberish;
    minAmountA: ethers.BigNumberish; // Asset address
    minAmountB: ethers.BigNumberish; // Not used for Aave
  }): Promise<ethers.TransactionResponse> {
    if (!this.privateKey) {
      throw new Error('Private key not configured');
    }
    
    try {
      const wallet = new ethers.Wallet(this.privateKey, this.provider);
      const aavePool = new ethers.Contract(
        this.aavePoolAddress,
        this.aavePoolAbi,
        wallet
      );
      
      // In Aave context, minAmountA is the asset address
      const assetAddress = params.minAmountA.toString();
      
      // Withdraw from Aave
      const tx = await aavePool.withdraw(
        assetAddress,
        params.amount,
        wallet.address
      );
      
      return tx;
    } catch (error) {
      console.error('Error withdrawing from Aave:', error);
      throw error;
    }
  }

  /**
   * Get metrics for the Aave protocol
   */
  async getMetrics(protocol: string): Promise<any> {
    // This would typically fetch protocol-wide metrics like TVL, 
    // total supply, total borrow, etc.
    // For MVP, we return simplified metrics
    return {
      name: 'Aave',
      version: 'V3',
      totalValueLockedUSD: 6500000000, // $6.5B
      totalSupplyUSD: 5500000000, // $5.5B
      totalBorrowUSD: 2800000000, // $2.8B
      utilizationRate: 0.51, // 51%
    };
  }

  /**
   * Optimize yield strategy based on current conditions
   */
  async optimizeYieldStrategy(params: {
    yields: Record<string, number>;
    strategy: string;
    optimizationGoal: string;
  }): Promise<any> {
    // This is a simplified implementation
    // In a real implementation, we would:
    // 1. Analyze current yields across different assets
    // 2. Consider risk factors (volatility, impermanent loss)
    // 3. Recommend optimal allocation based on the strategy
    
    const { yields, strategy, optimizationGoal } = params;
    
    // Sort assets by yield
    const sortedAssets = Object.entries(yields)
      .sort(([, yieldA], [, yieldB]) => yieldB - yieldA);
    
    switch (optimizationGoal) {
      case 'max_yield':
        // Recommend highest yield assets
        return {
          strategy: 'Maximize Yield',
          recommendations: sortedAssets.slice(0, 3).map(([asset, yield_]) => ({
            asset,
            allocation: 1 / Math.min(3, sortedAssets.length),
            expectedYield: yield_
          }))
        };
      
      case 'min_risk':
        // For minimum risk, prefer stablecoins
        const stablecoins = sortedAssets.filter(([asset]) => 
          ['USDC', 'USDT', 'DAI'].includes(asset));
        
        return {
          strategy: 'Minimize Risk',
          recommendations: stablecoins.map(([asset, yield_]) => ({
            asset,
            allocation: 1 / stablecoins.length,
            expectedYield: yield_
          }))
        };
      
      case 'balanced':
      default:
        // Balanced approach: mix of high yield and stable assets
        return {
          strategy: 'Balanced',
          recommendations: [
            // 60% in top 2 yielding assets
            ...sortedAssets.slice(0, 2).map(([asset, yield_]) => ({
              asset,
              allocation: 0.3,
              expectedYield: yield_
            })),
            // 40% in stablecoins
            {
              asset: sortedAssets.find(([asset]) => 
                ['USDC', 'USDT', 'DAI'].includes(asset))?.[0] || 'USDC',
              allocation: 0.4,
              expectedYield: yields['USDC'] || 0
            }
          ]
        };
    }
  }

  /**
   * Get recent events from the Aave protocol
   */
  async getEvents(protocol: string, timeframe: string): Promise<any[]> {
    // This would typically fetch events from the blockchain
    // For MVP, we return mock events
    return [
      {
        type: 'LiquidationCall',
        timestamp: new Date().getTime() - 3600000, // 1 hour ago
        data: {
          collateralAsset: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
          debtAsset: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
          user: '0x1234...5678',
          liquidator: '0xabcd...efgh',
          debtToCover: '5000', // $5000
          liquidatedCollateralAmount: '3', // 3 ETH
        }
      },
      {
        type: 'ReserveDataUpdated',
        timestamp: new Date().getTime() - 1800000, // 30 minutes ago
        data: {
          reserve: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
          liquidityRate: '0.023', // 2.3%
          stableBorrowRate: '0.045', // 4.5%
          variableBorrowRate: '0.035', // 3.5%
          liquidityIndex: '1.005',
          variableBorrowIndex: '1.008'
        }
      }
    ];
  }
}
