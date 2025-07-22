import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { MagicAdminService } from "../services/magic-admin.service";

@ApiTags("magic")
@Controller("magic")
@UseGuards(JwtAuthGuard)
export class MagicController {
  constructor(private readonly magicAdminService: MagicAdminService) {}

  @Post("delegate-transaction")
  @ApiOperation({ summary: "Delegate transaction execution to Magic SDK" })
  async delegateTransaction(
    @Body()
    body: {
      userId: string;
      transaction: any;
      network: string;
      timestamp: string;
    }
  ) {
    try {
      const { userId, transaction, network } = body;

      // Validate user session
      const isValidSession =
        await this.magicAdminService.validateUserSession(userId);
      if (!isValidSession) {
        throw new HttpException(
          "Invalid user session",
          HttpStatus.UNAUTHORIZED
        );
      }

      // Get user's wallet address
      const walletAddress =
        await this.magicAdminService.getUserWalletAddress(userId);
      if (!walletAddress) {
        throw new HttpException(
          "No wallet found for user",
          HttpStatus.BAD_REQUEST
        );
      }

      // Add from address to transaction
      const transactionWithFrom = {
        ...transaction,
        from: walletAddress,
      };

      // Execute transaction through Magic SDK
      const result = await this.magicAdminService.executeTransaction(
        userId,
        transactionWithFrom,
        network
      );

      return {
        success: true,
        txHash: result.txHash,
        status: result.status,
        network,
      };
    } catch (error: any) {
      throw new HttpException(
        error.message || "Transaction delegation failed",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get("wallet-address/:userId")
  @ApiOperation({ summary: "Get user wallet address" })
  async getWalletAddress(@Param("userId") userId: string) {
    try {
      const address = await this.magicAdminService.getUserWalletAddress(userId);
      return { address };
    } catch (error: any) {
      throw new HttpException(
        error.message || "Failed to get wallet address",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get("wallet-balance/:userId")
  @ApiOperation({ summary: "Get user wallet balance" })
  async getWalletBalance(
    @Param("userId") userId: string,
    @Query("tokenAddress") tokenAddress?: string
  ) {
    try {
      const balance = await this.magicAdminService.getUserWalletBalance(
        userId,
        tokenAddress
      );
      return { balance: balance.toString() };
    } catch (error: any) {
      throw new HttpException(
        error.message || "Failed to get wallet balance",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post("estimate-gas")
  @ApiOperation({ summary: "Estimate gas for transaction" })
  async estimateGas(@Body() body: { userId: string; transaction: any }) {
    try {
      const { userId, transaction } = body;

      // Get user's wallet address
      const walletAddress =
        await this.magicAdminService.getUserWalletAddress(userId);
      if (!walletAddress) {
        throw new HttpException(
          "No wallet found for user",
          HttpStatus.BAD_REQUEST
        );
      }

      // Add from address to transaction
      const transactionWithFrom = {
        ...transaction,
        from: walletAddress,
      };

      // Estimate gas through Magic SDK
      const gasEstimate = await this.magicAdminService.estimateGas(
        userId,
        transactionWithFrom
      );

      return {
        gasLimit: gasEstimate.gasLimit.toString(),
        gasPrice: gasEstimate.gasPrice.toString(),
        estimatedCost: gasEstimate.estimatedCost.toString(),
      };
    } catch (error: any) {
      throw new HttpException(
        error.message || "Failed to estimate gas",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post("wait-transaction")
  @ApiOperation({ summary: "Wait for transaction confirmation" })
  async waitTransaction(
    @Body() body: { txHash: string; confirmations: number; timeout: number }
  ) {
    try {
      const { txHash, confirmations, timeout } = body;

      const receipt = await this.magicAdminService.waitForTransaction(
        txHash,
        confirmations,
        timeout
      );

      return { receipt };
    } catch (error: any) {
      throw new HttpException(
        error.message || "Failed to wait for transaction",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get("transaction-status/:txHash")
  @ApiOperation({ summary: "Get transaction status" })
  async getTransactionStatus(@Param("txHash") txHash: string) {
    try {
      const status = await this.magicAdminService.getTransactionStatus(txHash);
      return { status };
    } catch (error: any) {
      return { status: "pending" };
    }
  }

  @Get("transaction-details/:txHash")
  @ApiOperation({ summary: "Get transaction details" })
  async getTransactionDetails(@Param("txHash") txHash: string) {
    try {
      const details =
        await this.magicAdminService.getTransactionDetails(txHash);
      return details;
    } catch (error: any) {
      throw new HttpException(
        error.message || "Failed to get transaction details",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post("request-approval")
  @ApiOperation({ summary: "Request transaction approval from user" })
  async requestApproval(
    @Body()
    body: {
      userId: string;
      transaction: any;
      reason: string;
      timestamp: string;
    }
  ) {
    try {
      const { userId, transaction, reason } = body;

      // Request approval through Magic SDK
      const approved = await this.magicAdminService.requestTransactionApproval(
        userId,
        transaction,
        reason
      );

      return { approved };
    } catch (error: any) {
      console.error("Approval request failed:", error);
      return { approved: false };
    }
  }

  @Get("user-session/:userId")
  @ApiOperation({ summary: "Get user session info" })
  async getUserSession(@Param("userId") userId: string) {
    try {
      const isValidSession =
        await this.magicAdminService.validateUserSession(userId);
      return { isValid: isValidSession };
    } catch (error: any) {
      throw new HttpException(
        error.message || "Failed to get user session",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
