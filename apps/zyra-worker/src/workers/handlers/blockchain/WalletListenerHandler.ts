import { walletListenerSchema } from '@zyra/types';
import { z } from 'zod';
import { ethers } from 'ethers';
import axios from 'axios';

const SEI_RPC_URL = process.env.SEI_RPC_URL || 'https://rpc.ankr.com/sei_evm';

/**
 * Handler for the Wallet Listener block. Supports multiple networks.
 * Validates config, polls for new events, and emits output in the required format.
 */
class WalletListenerHandler {
  private lastProcessedBlock: Record<string, number> = {};

  /**
   * Main entry point for the handler
   * @param config Block config
   * @param input Input from previous block (not used here)
   * @returns Promise of output array (one per detected event)
   */
  async execute(
    config: Record<string, unknown>,
    input: Record<string, unknown> = {},
  ) {
    // Validate config
    const parsedConfig = walletListenerSchema.configSchema.parse(config);
    const { network } = parsedConfig;

    switch (network) {
      case 'sei':
        return this.handleSei(parsedConfig);
      case 'ethereum':
        return this.handleEthereum(parsedConfig);
      default:
        return [
          {
            success: false,
            error: `Network '${network}' is not supported yet.`,
          },
        ];
    }
  }

  /**
   * Fetches real wallet events from Sei using eth_getLogs or sei_getLogs
   * @param config Parsed config
   */
  async handleSei(config: z.infer<typeof walletListenerSchema.configSchema>) {
    const { walletAddresses, eventTypes, minAmount, tokenDenom, startBlock } =
      config;
    const results: any[] = [];
    try {
      // Get latest block number
      const blockNumberResp = await axios.post(SEI_RPC_URL, {
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1,
      });
      const latestBlockHex = blockNumberResp.data.result;
      const latestBlock = parseInt(latestBlockHex, 16);
      const fromBlock =
        this.lastProcessedBlock['sei'] || startBlock || latestBlock - 10;
      const toBlock = latestBlock;

      // Only support 'transfer' for now (ERC20/ERC721 Transfer event)
      if (eventTypes.includes('transfer')) {
        // ERC20/ERC721 Transfer event signature
        const transferEventTopic = ethers.id(
          'Transfer(address,address,uint256)',
        );
        for (const address of walletAddresses) {
          // Listen for logs where 'to' is the address (topic[2])
          const filter = {
            fromBlock: ethers.toBeHex(fromBlock),
            toBlock: ethers.toBeHex(toBlock),
            topics: [
              transferEventTopic,
              null,
              ethers.zeroPadValue(address, 32),
            ],
          };
          const logsResp = await axios.post(SEI_RPC_URL, {
            jsonrpc: '2.0',
            method: 'eth_getLogs',
            params: [filter],
            id: 1,
          });
          const logs = logsResp.data.result;
          for (const log of logs) {
            // Parse log (ERC20/721 Transfer)
            const from = ethers.getAddress('0x' + log.topics[1].slice(26));
            const to = ethers.getAddress('0x' + log.topics[2].slice(26));
            const amount = Number(BigInt(log.data));
            if (minAmount && amount < minAmount) continue;
            results.push({
              eventType: 'transfer',
              txHash: log.transactionHash,
              blockNumber: parseInt(log.blockNumber, 16),
              timestamp: new Date().toISOString(), // Optionally fetch block for real timestamp
              fromAddress: from,
              toAddress: to,
              amount,
              tokenDenom: tokenDenom || 'usei',
              rawEvent: log,
              success: true,
            });
          }
        }
      }
      this.lastProcessedBlock['sei'] = toBlock + 1;
      if (results.length === 0) {
        return [{ success: true, error: 'No new events found.' }];
      }
      return results;
    } catch (error: any) {
      return [
        {
          success: false,
          error: error.message || 'Failed to fetch Sei events',
        },
      ];
    }
  }

  /**
   * Polls Ethereum for transfer events to the specified wallets
   * @param config Parsed config
   */
  async handleEthereum(
    config: z.infer<typeof walletListenerSchema.configSchema>,
  ) {
    const provider = new ethers.JsonRpcProvider(
      process.env.ETHEREUM_RPC_URL || 'https://mainnet.infura.io/v3/demo',
    );
    const { walletAddresses, eventTypes, minAmount, tokenDenom, startBlock } =
      config;
    const results: any[] = [];
    const currentBlock = await provider.getBlockNumber();
    const fromBlock =
      this.lastProcessedBlock['ethereum'] || startBlock || currentBlock - 10;
    const toBlock = currentBlock;

    if (eventTypes.includes('transfer')) {
      for (const address of walletAddresses) {
        const filter = {
          address,
          topics: [ethers.id('Transfer(address,address,uint256)')],
          fromBlock,
          toBlock,
        };
        const logs = await provider.getLogs(filter);
        for (const log of logs) {
          const parsed = ethers.AbiCoder.defaultAbiCoder().decode(
            ['address', 'address', 'uint256'],
            log.data,
          );
          const from = parsed[0];
          const to = parsed[1];
          const amount = Number(parsed[2]);
          if (minAmount && amount < minAmount) continue;
          results.push({
            eventType: 'transfer',
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
            timestamp: (
              await provider.getBlock(log.blockNumber)
            ).timestamp.toString(),
            fromAddress: from,
            toAddress: to,
            amount,
            tokenDenom: tokenDenom || 'eth',
            rawEvent: log,
            success: true,
          });
        }
      }
    }
    this.lastProcessedBlock['ethereum'] = toBlock + 1;
    if (results.length === 0) {
      return [{ success: true, error: 'No new events found.' }];
    }
    return results;
  }
}

export default new WalletListenerHandler();
