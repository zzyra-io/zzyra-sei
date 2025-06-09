import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  UseGuards,
  Request,
  Param,
  Query,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { WalletsService } from "./wallets.service";
import {
  CreateWalletDto,
  WalletResponseDto,
  WalletTransactionResponseDto,
} from "./dto/user.dto";

@ApiTags("user/wallets")
@Controller("user/wallets")
@ApiBearerAuth()
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Get()
  @ApiOperation({ summary: "Get user wallets" })
  @ApiResponse({
    status: 200,
    description: "Returns user wallets",
    type: [WalletResponseDto],
  })
  async getUserWallets(
    @Request() req: { user?: { id: string } }
  ): Promise<WalletResponseDto[]> {
    const userId = req.user?.id || "user1";
    return this.walletsService.getUserWallets(userId);
  }

  @Post()
  @ApiOperation({ summary: "Create or update wallet" })
  @ApiResponse({
    status: 201,
    description: "Wallet created/updated successfully",
    type: WalletResponseDto,
  })
  async createWallet(
    @Request() req: { user?: { id: string } },
    @Body() createData: CreateWalletDto
  ): Promise<WalletResponseDto> {
    const userId = req.user?.id || "user1";
    return this.walletsService.createWallet(userId, createData);
  }

  @Delete(":walletId")
  @ApiOperation({ summary: "Delete wallet" })
  @ApiResponse({
    status: 200,
    description: "Wallet deleted successfully",
  })
  async deleteWallet(
    @Request() req: { user?: { id: string } },
    @Param("walletId") walletId: string
  ): Promise<{ success: boolean; walletId: string }> {
    const userId = req.user?.id || "user1";
    return this.walletsService.deleteWallet(userId, walletId);
  }

  @Get("transactions")
  @ApiOperation({ summary: "Get wallet transactions" })
  @ApiResponse({
    status: 200,
    description: "Returns wallet transactions",
    type: [WalletTransactionResponseDto],
  })
  async getWalletTransactions(
    @Request() req: { user?: { id: string } },
    @Query("walletAddress") walletAddress?: string,
    @Query("limit") limit?: string
  ): Promise<WalletTransactionResponseDto[]> {
    const userId = req.user?.id || "user1";
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    return this.walletsService.getWalletTransactions(
      userId,
      walletAddress,
      parsedLimit
    );
  }
}
