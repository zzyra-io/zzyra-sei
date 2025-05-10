
import { Wallet, JsonRpcProvider, parseEther } from 'ethers';

import { BlockExecutionContext, BlockHandler } from '@zyra/types';


export class WalletBlockHandler implements BlockHandler {
  async execute(node: any, ctx: BlockExecutionContext): Promise<any> {
    const cfg = (node.data as any).config;
    const { blockchain, operation, to, amount } = cfg;
    if (operation === 'connect') {
      // Simple provider connection check
      const provider = new JsonRpcProvider(process.env.RPC_URL);
      const network = await provider.getNetwork();
      return { network };
    } else if (operation === 'transfer') {
      if (!process.env.PRIVATE_KEY)
        throw new Error('No PRIVATE_KEY for transfer');
      const provider = new JsonRpcProvider(process.env.RPC_URL);
      const wallet = new Wallet(process.env.PRIVATE_KEY, provider);
      const tx = await wallet.sendTransaction({
        to,
        value: parseEther(amount),
      });
      const receipt = await tx.wait();
      return { txHash: receipt.hash, status: receipt.status };
    } else {
      throw new Error(`Unsupported wallet operation: ${operation}`);
    }
  }
}
