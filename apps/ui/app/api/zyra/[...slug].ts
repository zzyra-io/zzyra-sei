import type { NextApiRequest, NextApiResponse } from "next";
import {
  WalletRepository as DbWalletRepository,
  // Import any other necessary types from @zyra/database
} from "@zyra/database";
import {
  Wallet as CoreWallet,
  WalletTransaction as CoreWalletTransaction,
  WalletType, // Assuming these are also needed for request body validation/typing
  ChainType, // Assuming these are also needed for request body validation/typing
} from "@zyra/wallet"; // Adjust path if core types are elsewhere

const dbWalletRepository = new DbWalletRepository();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { slug } = req.query;
  const method = req.method;

  if (!slug || !Array.isArray(slug)) {
    return res.status(400).json({ message: "Invalid API path." });
  }

  const path = slug.join("/");

  console.log(`API Route: /api/zyra/${path}, Method: ${method}`);

  try {
    if (method === "POST" && path === "wallet/save") {
      // Endpoint: /api/zyra/wallet/save
      // Expected body: { userId: string, address: string, chainId: number, walletType: WalletType, chainType: ChainType }
      const { userId, address, chainId, walletType, chainType } = req.body;
      if (
        !userId ||
        !address ||
        chainId === undefined ||
        !walletType ||
        !chainType
      ) {
        return res
          .status(400)
          .json({ message: "Missing required fields for saving wallet." });
      }
      // TODO: Add validation for walletType and chainType if they are enums
      const wallet = await dbWalletRepository.saveWallet(
        userId,
        address,
        chainId,
        walletType as WalletType, // Cast if necessary after validation
        chainType as ChainType // Cast if necessary after validation
      );
      return res.status(200).json(wallet);
    } else if (method === "GET" && path.startsWith("wallets/user/")) {
      // Endpoint: /api/zyra/wallets/user/[userId]
      const userId = slug[2];
      if (!userId) {
        return res.status(400).json({ message: "User ID is missing." });
      }
      const wallets = await dbWalletRepository.findByUserId(userId);
      return res.status(200).json(wallets);
    } else if (method === "POST" && path === "transactions/record") {
      // Endpoint: /api/zyra/transactions/record
      // Expected body: { userId, walletAddress, txHash, fromAddress, toAddress, amount, status, type, chainId }
      const {
        userId,
        walletAddress,
        txHash,
        fromAddress,
        toAddress,
        amount,
        status,
        type,
        chainId,
      } = req.body;

      if (
        !userId ||
        !walletAddress ||
        !txHash ||
        !fromAddress ||
        !toAddress ||
        !amount ||
        !status ||
        !type ||
        chainId === undefined
      ) {
        return res.status(400).json({
          message: "Missing required fields for recording transaction.",
        });
      }

      // Ensure the wallet exists for the user before recording transaction
      const wallet = await dbWalletRepository.findByAddress(walletAddress);
      if (!wallet || wallet.userId !== userId) {
        return res
          .status(404)
          .json({ message: "Wallet not found for this user or address." });
      }

      // TODO: Map incoming data to WalletTransactionCreateInput or similar structure
      // This is a simplified placeholder. You'll need to adapt this based on your DbWalletRepository.createTransaction method
      const transactionData = {
        hash: txHash,
        walletId: wallet.id, // Assuming you fetch walletId based on walletAddress or it's passed
        fromAddress,
        toAddress,
        amount: String(amount), // Ensure amount is string if your DB expects that
        status,
        type,
        chainId,
        // blockNumber: null, // Or add if available
        // gweiCost: null, // Or add if available
      };
      // const transaction = await dbWalletRepository.createTransaction(transactionData);
      // return res.status(200).json(transaction);
      return res
        .status(501)
        .json({ message: "Transaction recording not fully implemented." });
    } else if (method === "GET" && path.startsWith("transactions/wallet/")) {
      // Endpoint: /api/zyra/transactions/wallet/[walletAddress]
      const walletAddress = slug[2];
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      if (!walletAddress) {
        return res.status(400).json({ message: "Wallet address is missing." });
      }
      // const transactions = await dbWalletRepository.findTransactionsByWalletAddress(walletAddress, limit);
      // return res.status(200).json(transactions);
      return res.status(501).json({
        message: "Fetching wallet transactions not fully implemented.",
      });
    } else if (method === "GET" && path.startsWith("transactions/user/")) {
      // Endpoint: /api/zyra/transactions/user/[userId]
      const userId = slug[2];
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      if (!userId) {
        return res.status(400).json({ message: "User ID is missing." });
      }
      // const transactions = await dbWalletRepository.findTransactionsByUserId(userId, limit);
      // return res.status(200).json(transactions);
      return res
        .status(501)
        .json({ message: "Fetching user transactions not fully implemented." });
    } else if (method === "GET" && path.startsWith("wallet/address/")) {
      // Endpoint: /api/zyra/wallet/address/[address]
      const address = slug[2];
      if (!address) {
        return res.status(400).json({ message: "Wallet address is missing." });
      }
      const wallet = await dbWalletRepository.findByAddress(address);
      if (!wallet) {
        return res.status(404).json({ message: "Wallet not found." });
      }
      return res.status(200).json(wallet);
    } else if (method === "PUT" && path === "transactions/status") {
      // Endpoint: /api/zyra/transactions/status
      // Expected body: { txHash: string, status: string }
      const { txHash, status } = req.body;
      if (!txHash || !status) {
        return res.status(400).json({ message: "Missing txHash or status." });
      }
      // const updatedTransaction = await dbWalletRepository.updateTransactionStatus(txHash, status);
      // if (!updatedTransaction) {
      //   return res.status(404).json({ message: "Transaction not found or status update failed." });
      // }
      // return res.status(200).json(updatedTransaction);
      return res.status(501).json({
        message: "Updating transaction status not fully implemented.",
      });
    } else {
      res.setHeader("Allow", ["GET", "POST", "PUT"]);
      return res
        .status(405)
        .json({ message: `Method ${method} Not Allowed for path ${path}` });
    }
  } catch (error: unknown) {
    console.error(`API Error on /api/zyra/${path}:`, error);
    // Ensure sensitive error details are not leaked
    let message = "Internal Server Error";
    if (error instanceof Error) {
      message = error.message;
    }
    // If it's a Prisma known request error, it might have a specific code
    // if (error.code) { /* Handle Prisma errors */ }
    return res.status(500).json({ message });
  } finally {
    // Optional: Disconnect Prisma client if you are instantiating it per request.
    // Not strictly necessary if PrismaClient is instantiated once globally for the API route module.
    // await prisma.$disconnect();
  }
}
