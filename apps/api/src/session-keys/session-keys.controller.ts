import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Logger,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Public } from "../auth/decorators/public.decorator";
import { SessionKeysService } from "./session-keys.service";
import { SessionMonitoringService } from "./session-monitoring.service";
import { CreateSessionKeyDto } from "./dto/create-session-key.dto";
import { ValidateSessionKeyDto } from "./dto/validate-session-key.dto";
import { UpdateUsageDto } from "./dto/update-usage.dto";
import { SessionKeyStatus } from "@zzyra/types";

/**
 * Controller for session key management endpoints
 * Following NestJS guidelines and REST conventions
 */
@Controller("session-keys")
export class SessionKeysController {
  private readonly logger = new Logger(SessionKeysController.name);

  constructor(
    private readonly sessionKeysService: SessionKeysService,
    private readonly sessionMonitoringService: SessionMonitoringService
  ) {}

  /**
   * Create a new session key
   * POST /api/session-keys
   */
  @Post()
  async createSessionKey(
    @Body() createSessionKeyDto: CreateSessionKeyDto,
    @Request() req: any
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new HttpException(
          "User not authenticated",
          HttpStatus.UNAUTHORIZED
        );
      }

      this.logger.log("Creating session key", {
        userId,
        chainId: createSessionKeyDto.chainId,
      });

      const result = await this.sessionKeysService.createSessionKey(
        userId,
        {
          walletAddress: createSessionKeyDto.walletAddress,
          smartWalletOwner: createSessionKeyDto.smartWalletOwner,
          chainId: createSessionKeyDto.chainId,
          securityLevel: createSessionKeyDto.securityLevel,
          validUntil: new Date(createSessionKeyDto.validUntil),
          permissions: createSessionKeyDto.permissions,
        },
        createSessionKeyDto.userSignature
      );

      return {
        success: true,
        data: {
          sessionKey: {
            ...result.sessionKey,
            // Ensure BigInt-like fields are serializable
            nonce: result.sessionKey.nonce,
          },
          delegationMessage: result.delegationMessage,
        },
      };
    } catch (error) {
      this.logger.error("Failed to create session key", error);
      throw new HttpException(
        (error as Error).message || "Failed to create session key",
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Get session key by ID (Public for worker access)
   * GET /api/session-keys/:id
   */
  @Get(":id")
  @Public()
  async getSessionKey(@Param("id") id: string, @Request() req: any) {
    try {
      const userId = req.user?.id;

      // Skip user auth check for system requests (worker authentication)
      // In production, you'd verify the worker token here
      if (userId) {
        // User request - verify ownership
        const sessionKey = await this.sessionKeysService.getSessionKeyById(id);
        if (!sessionKey) {
          throw new HttpException(
            "Session key not found",
            HttpStatus.NOT_FOUND
          );
        }

        if (sessionKey.userId !== userId) {
          throw new HttpException("Access denied", HttpStatus.FORBIDDEN);
        }

        return { success: true, data: sessionKey };
      }

      // System request (worker) - allow access to any session key when service auth is present
      const sessionKey = await this.sessionKeysService.getSessionKeyById(id);

      if (!sessionKey) {
        throw new HttpException("Session key not found", HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        data: sessionKey,
      };
    } catch (error) {
      this.logger.error("Failed to get session key", error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        "Internal server error",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get session key status and deployment info
   * GET /api/session-keys/status
   */
  @Get("status")
  async getSessionKeyStatus(@Request() req: any) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return {
          hasActiveSession: false,
          error: "User not authenticated",
        };
      }

      const activeSessionKeys =
        await this.sessionKeysService.getSessionKeysByUserId(
          userId,
          SessionKeyStatus.ACTIVE
        );

      if (!activeSessionKeys || activeSessionKeys.length === 0) {
        return {
          hasActiveSession: false,
          message: "No active session keys found",
        };
      }

      // Get the most recent active session key
      const mostRecentSession = activeSessionKeys[0];

      // Check if this is a recently created session (likely means deployment completed)
      const isRecentlyCreated =
        new Date().getTime() - new Date(mostRecentSession.createdAt).getTime() <
        10 * 60 * 1000; // 10 minutes

      return {
        hasActiveSession: true,
        sessionKeyId: mostRecentSession.id,
        walletAddress: mostRecentSession.walletAddress,
        smartWalletAddress: mostRecentSession.smartWalletOwner,
        status: mostRecentSession.status,
        createdAt: mostRecentSession.createdAt,
        isRecentlyCreated,
        deploymentLikely: isRecentlyCreated,
        message: isRecentlyCreated
          ? "Recent session key found - smart wallet likely deployed"
          : "Active session key found",
      };
    } catch (error) {
      this.logger.error("Error checking session key status:", error);
      return {
        hasActiveSession: false,
        error: "Failed to check session status",
      };
    }
  }

  /**
   * Get all session keys for authenticated user
   * GET /api/session-keys
   */
  @Get()
  async getUserSessionKeys(
    @Query("status") status?: SessionKeyStatus,
    @Request() req?: any
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new HttpException(
          "User not authenticated",
          HttpStatus.UNAUTHORIZED
        );
      }

      const sessionKeys = await this.sessionKeysService.getSessionKeysByUserId(
        userId,
        status
      );

      return {
        success: true,
        data: sessionKeys,
        meta: {
          total: sessionKeys.length,
          status: status || "all",
        },
      };
    } catch (error) {
      this.logger.error("Failed to get user session keys", error);
      throw new HttpException(
        "Internal server error",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Validate session key for transaction (Public for worker access)
   * POST /api/session-keys/:id/validate
   */
  @Post(":id/validate")
  @Public()
  async validateSessionKey(
    @Param("id") id: string,
    @Body() validateDto: ValidateSessionKeyDto,
    @Request() req: any
  ) {
    try {
      const userId = req.user?.id;

      // For system requests (worker), allow access without user verification
      if (userId) {
        // User request - verify ownership
        const sessionKey = await this.sessionKeysService.getSessionKeyById(id);
        if (!sessionKey || sessionKey.userId !== userId) {
          throw new HttpException(
            "Session key not found or access denied",
            HttpStatus.FORBIDDEN
          );
        }
      }

      const validationResult = await this.sessionKeysService.validateSessionKey(
        id,
        validateDto.operation,
        validateDto.amount,
        validateDto.toAddress
      );

      return {
        success: true,
        data: validationResult,
      };
    } catch (error) {
      this.logger.error("Failed to validate session key", error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        "Internal server error",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Update session key usage after transaction (Public for worker access)
   * PUT /api/session-keys/:id/usage
   */
  @Put(":id/usage")
  @Public()
  async updateSessionKeyUsage(
    @Param("id") id: string,
    @Body() updateUsageDto: UpdateUsageDto,
    @Request() req: any
  ) {
    try {
      const userId = req.user?.id;

      // For system requests (worker), allow access without user verification
      if (userId) {
        // User request - verify ownership
        const sessionKey = await this.sessionKeysService.getSessionKeyById(id);
        if (!sessionKey || sessionKey.userId !== userId) {
          throw new HttpException(
            "Session key not found or access denied",
            HttpStatus.FORBIDDEN
          );
        }
      }

      await this.sessionKeysService.updateSessionKeyUsage(
        id,
        updateUsageDto.amount,
        updateUsageDto.transactionHash
      );

      return {
        success: true,
        message: "Session key usage updated successfully",
      };
    } catch (error) {
      this.logger.error("Failed to update session key usage", error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        "Internal server error",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get session key usage statistics
   * GET /api/session-keys/:id/usage
   */
  @Get(":id/usage")
  async getSessionKeyUsage(@Param("id") id: string, @Request() req: any) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new HttpException(
          "User not authenticated",
          HttpStatus.UNAUTHORIZED
        );
      }

      // Verify user owns this session key
      const sessionKey = await this.sessionKeysService.getSessionKeyById(id);
      if (!sessionKey || sessionKey.userId !== userId) {
        throw new HttpException(
          "Session key not found or access denied",
          HttpStatus.FORBIDDEN
        );
      }

      const usage = await this.sessionKeysService.getSessionKeyUsage(id);

      return {
        success: true,
        data: usage,
      };
    } catch (error) {
      this.logger.error("Failed to get session key usage", error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        "Internal server error",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Revoke session key
   * DELETE /api/session-keys/:id
   */
  @Delete(":id")
  async revokeSessionKey(
    @Param("id") id: string,
    @Body("reason") reason?: string,
    @Request() req?: any
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new HttpException(
          "User not authenticated",
          HttpStatus.UNAUTHORIZED
        );
      }

      // Verify user owns this session key
      const sessionKey = await this.sessionKeysService.getSessionKeyById(id);
      if (!sessionKey || sessionKey.userId !== userId) {
        throw new HttpException(
          "Session key not found or access denied",
          HttpStatus.FORBIDDEN
        );
      }

      await this.sessionKeysService.revokeSessionKey(id, reason);

      return {
        success: true,
        message: "Session key revoked successfully",
      };
    } catch (error) {
      this.logger.error("Failed to revoke session key", error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        "Internal server error",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Admin endpoint to cleanup expired sessions
   * POST /api/session-keys/cleanup
   */
  @Post("cleanup")
  async cleanupExpiredSessions(@Request() req: any) {
    try {
      // This should be protected by admin guard in production
      const cleanedCount =
        await this.sessionKeysService.cleanupExpiredSessions();

      return {
        success: true,
        data: {
          cleanedCount,
        },
        message: `Cleaned up ${cleanedCount} expired sessions`,
      };
    } catch (error) {
      this.logger.error("Failed to cleanup expired sessions", error);
      throw new HttpException(
        "Internal server error",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get security metrics for monitoring
   * GET /api/session-keys/admin/metrics
   */
  @Get("admin/metrics")
  async getSecurityMetrics() {
    try {
      const metrics = await this.sessionMonitoringService.getSecurityMetrics();

      return {
        success: true,
        data: metrics,
      };
    } catch (error) {
      this.logger.error("Failed to get security metrics", error);
      throw new HttpException(
        "Internal server error",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Manual cleanup of expired sessions
   * POST /api/session-keys/admin/cleanup
   */
  @Post("admin/cleanup")
  async manualCleanup() {
    try {
      const cleanedCount =
        await this.sessionMonitoringService.cleanupExpiredSessions();

      return {
        success: true,
        data: {
          cleanedCount,
        },
        message: `Cleaned up ${cleanedCount} expired sessions`,
      };
    } catch (error) {
      this.logger.error("Failed to cleanup expired sessions", error);
      throw new HttpException(
        "Internal server error",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Health check endpoint for testing
   * GET /api/session-keys/admin/test
   */
  @Get("admin/test")
  async adminTest() {
    return {
      success: true,
      message: "Session Keys service is healthy",
      timestamp: new Date().toISOString(),
    };
  }
}
