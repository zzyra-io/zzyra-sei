import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  CreateSessionKeyRequest,
  SecurityLevel,
  SessionEventType,
  SessionKeyData,
  SessionKeyStatus,
  SessionKeyValidationResult,
  SessionUsageStats,
} from "@zzyra/types";
import { PrismaService } from "../database/prisma.service";
import { SessionKeyCryptoService } from "../shared/services/session-key-crypto.service";

/**
 * Service for managing session keys and blockchain delegation
 * Following NestJS guidelines and repository pattern
 */
@Injectable()
export class SessionKeysService {
  private readonly logger = new Logger(SessionKeysService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoService: SessionKeyCryptoService
  ) {}

  /**
   * Create a new session key with encrypted private key
   * FIXED: Proper delegation hierarchy for smart wallet integration
   */
  async createSessionKey(
    userId: string,
    request: CreateSessionKeyRequest,
    userSignature: string
  ): Promise<{ sessionKey: SessionKeyData; delegationMessage: string }> {
    try {
      this.logger.log("Creating new session key for smart wallet delegation", {
        userId,
        chainId: request.chainId,
        smartWalletOwner: request.smartWalletOwner,
      });

      // Generate session key pair
      const { address: sessionKeyAddress, privateKey } =
        await this.cryptoService.generateSessionKeyPair();

      // Encrypt private key with user signature (Dynamic delegation message)
      const encryptedPrivateKey = await this.cryptoService.encryptSessionKey(
        privateKey,
        userSignature
      );

      // Generate nonce
      const nonce = this.cryptoService.generateNonce();

      // Create delegation message for smart wallet → session key delegation
      const delegationMessage = {
        smartWalletAddress: request.smartWalletOwner, // Smart wallet that owns this session key
        sessionKeyAddress, // Generated session key address
        delegatedBy: request.walletAddress, // Original EOA that authorized the smart wallet
        chainId: request.chainId,
        securityLevel: request.securityLevel,
        validUntil: request.validUntil.toISOString(),
        nonce: nonce.toString(),
        permissions: request.permissions,
        timestamp: new Date().toISOString(),
        purpose: "workflow_automation_delegation",
        parentSignature: userSignature, // Original Dynamic signature
      };

      // Create session key in database with transaction
      const sessionKey = await this.prisma.client.$transaction(async (tx) => {
        // Create session key
        const newSessionKey = await tx.sessionKey.create({
          data: {
            userId,
            walletAddress: sessionKeyAddress, // Session key's own address
            smartWalletOwner: request.smartWalletOwner, // Smart wallet that owns this session key
            parentWalletAddress: request.walletAddress, // Original EOA address
            chainId: request.chainId,
            sessionPublicKey: sessionKeyAddress,
            encryptedPrivateKey,
            // Let DB autogenerate nonce via default(autoincrement()) to avoid BigInt transport issues
            securityLevel: request.securityLevel,
            validUntil: request.validUntil,
            dailyResetAt: new Date(),
            parentDelegationSignature: userSignature,
          },
          include: {
            permissions: true,
          },
        });

        // Create permissions
        for (const permission of request.permissions) {
          await tx.sessionPermission.create({
            data: {
              sessionKeyId: newSessionKey.id,
              operation: permission.operation,
              maxAmountPerTx: permission.maxAmountPerTx,
              maxDailyAmount: permission.maxDailyAmount,
              allowedContracts: permission.allowedContracts,
              requireConfirmation: permission.requireConfirmation,
              emergencyStop: permission.emergencyStop,
            },
          });
        }

        // Create creation event
        await tx.sessionEvent.create({
          data: {
            sessionKeyId: newSessionKey.id,
            eventType: SessionEventType.CREATED,
            eventData: {
              securityLevel: request.securityLevel,
              chainId: request.chainId,
              permissionCount: request.permissions.length,
            },
            severity: "info",
          },
        });

        return newSessionKey;
      });

      // Convert to SessionKeyData format
      const sessionKeyData = await this.getSessionKeyById(sessionKey.id);

      this.logger.log("Session key created successfully", {
        sessionKeyId: sessionKey.id,
        userId,
      });

      return {
        sessionKey: sessionKeyData!,
        delegationMessage: JSON.stringify(delegationMessage),
      };
    } catch (error) {
      this.logger.error("Failed to create session key", error);
      throw new BadRequestException("Failed to create session key");
    }
  }

  /**
   * Get session key by ID with permissions
   */
  async getSessionKeyById(id: string): Promise<SessionKeyData | null> {
    try {
      const sessionKey = await this.prisma.client.sessionKey.findUnique({
        where: { id },
        include: {
          permissions: true,
        },
      });

      if (!sessionKey) {
        return null;
      }

      return this.mapToSessionKeyData(sessionKey);
    } catch (error) {
      this.logger.error("Failed to get session key by ID", error);
      throw error;
    }
  }

  /**
   * Get all session keys for a user
   */
  async getSessionKeysByUserId(
    userId: string,
    status?: SessionKeyStatus
  ): Promise<SessionKeyData[]> {
    try {
      const where: any = { userId };
      if (status) {
        where.status = status;
      }

      const sessionKeys = await this.prisma.client.sessionKey.findMany({
        where,
        include: {
          permissions: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return sessionKeys.map((sk) => this.mapToSessionKeyData(sk));
    } catch (error) {
      this.logger.error("Failed to get session keys by user ID", error);
      throw error;
    }
  }

  /**
   * Validate session key for transaction execution
   */
  async validateSessionKey(
    sessionKeyId: string,
    operation: string,
    amount: string,
    toAddress: string
  ): Promise<SessionKeyValidationResult> {
    try {
      const sessionKey = await this.getSessionKeyById(sessionKeyId);

      if (!sessionKey) {
        return {
          isValid: false,
          errors: ["Session key not found"],
        };
      }

      const errors: string[] = [];

      // Check if session key is active
      if (sessionKey.status !== SessionKeyStatus.ACTIVE) {
        errors.push(`Session key is ${sessionKey.status}`);
      }

      // Check if session key is expired
      if (new Date() > sessionKey.validUntil) {
        errors.push("Session key has expired");
        // Auto-expire the session key
        await this.expireSessionKey(sessionKeyId);
      }

      // Check if operation is permitted
      const permission = sessionKey.permissions.find(
        (p) => p.operation === operation
      );
      if (!permission) {
        errors.push(`Operation '${operation}' is not permitted`);
      }

      if (permission) {
        // Check emergency stop
        if (permission.emergencyStop) {
          errors.push("Emergency stop is activated for this operation");
        }

        // Check per-transaction amount limit
        const amountNum = parseFloat(amount);
        const maxPerTx = parseFloat(permission.maxAmountPerTx);
        if (amountNum > maxPerTx) {
          errors.push(
            `Amount ${amount} exceeds per-transaction limit of ${permission.maxAmountPerTx}`
          );
        }

        // Check daily amount limit
        const dailyUsed = parseFloat(sessionKey.dailyUsedAmount);
        const maxDaily = parseFloat(permission.maxDailyAmount);
        if (dailyUsed + amountNum > maxDaily) {
          errors.push(
            `Amount would exceed daily limit. Used: ${dailyUsed}, Limit: ${maxDaily}`
          );
        }

        // Check allowed contracts (if specified)
        if (
          permission.allowedContracts.length > 0 &&
          !permission.allowedContracts.includes(toAddress)
        ) {
          errors.push(`Address ${toAddress} is not in allowed contracts list`);
        }
      }

      const isValid = errors.length === 0;

      // Log validation attempt
      await this.logSessionEvent(sessionKeyId, {
        eventType: isValid
          ? SessionEventType.USED
          : SessionEventType.SECURITY_ALERT,
        eventData: {
          operation,
          amount,
          toAddress,
          validationResult: isValid,
          errors: errors.length > 0 ? errors : undefined,
        },
        severity: isValid ? "info" : "warning",
      });

      return {
        isValid,
        errors,
        remainingDailyAmount: permission
          ? (
              parseFloat(permission.maxDailyAmount) -
              parseFloat(sessionKey.dailyUsedAmount)
            ).toString()
          : undefined,
      };
    } catch (error) {
      this.logger.error("Failed to validate session key", error);
      return {
        isValid: false,
        errors: ["Validation failed due to internal error"],
      };
    }
  }

  /**
   * Update session key usage after successful transaction
   */
  async updateSessionKeyUsage(
    sessionKeyId: string,
    amount: string,
    transactionHash?: string
  ): Promise<void> {
    try {
      const amountNum = parseFloat(amount);

      await this.prisma.client.$transaction(async (tx) => {
        const sessionKey = await tx.sessionKey.findUnique({
          where: { id: sessionKeyId },
        });

        if (!sessionKey) {
          throw new NotFoundException("Session key not found");
        }

        // Check if we need to reset daily usage
        const now = new Date();
        const daysSinceReset = Math.floor(
          (now.getTime() - sessionKey.dailyResetAt.getTime()) /
            (24 * 60 * 60 * 1000)
        );

        let dailyUsedAmount = parseFloat(sessionKey.dailyUsedAmount.toString());
        let dailyResetAt = sessionKey.dailyResetAt;

        if (daysSinceReset >= 1) {
          // Reset daily usage
          dailyUsedAmount = 0;
          dailyResetAt = now;
        }

        // Update usage
        await tx.sessionKey.update({
          where: { id: sessionKeyId },
          data: {
            totalUsedAmount: {
              increment: amountNum,
            },
            dailyUsedAmount: dailyUsedAmount + amountNum,
            dailyResetAt,
            lastUsedAt: now,
          },
        });

        // Log usage event
        await tx.sessionEvent.create({
          data: {
            sessionKeyId,
            eventType: SessionEventType.USED,
            eventData: {
              amount,
              transactionHash,
              newTotalUsage:
                parseFloat(sessionKey.totalUsedAmount.toString()) + amountNum,
              newDailyUsage: dailyUsedAmount + amountNum,
            },
            severity: "info",
          },
        });
      });

      this.logger.log("Session key usage updated", { sessionKeyId, amount });
    } catch (error) {
      this.logger.error("Failed to update session key usage", error);
      throw error;
    }
  }

  /**
   * Revoke session key
   */
  async revokeSessionKey(sessionKeyId: string, reason?: string): Promise<void> {
    try {
      await this.prisma.client.$transaction(async (tx) => {
        await tx.sessionKey.update({
          where: { id: sessionKeyId },
          data: {
            status: SessionKeyStatus.REVOKED,
            revokedAt: new Date(),
          },
        });

        await tx.sessionEvent.create({
          data: {
            sessionKeyId,
            eventType: SessionEventType.REVOKED,
            eventData: {
              reason: reason || "Manual revocation",
              revokedAt: new Date().toISOString(),
            },
            severity: "info",
          },
        });
      });

      this.logger.log("Session key revoked", { sessionKeyId, reason });
    } catch (error) {
      this.logger.error("Failed to revoke session key", error);
      throw error;
    }
  }

  /**
   * Get session key usage statistics
   */
  async getSessionKeyUsage(sessionKeyId: string): Promise<SessionUsageStats> {
    try {
      const sessionKey = await this.getSessionKeyById(sessionKeyId);
      if (!sessionKey) {
        throw new NotFoundException("Session key not found");
      }

      const transactions = await this.prisma.client.sessionTransaction.findMany(
        {
          where: { sessionKeyId },
          orderBy: { createdAt: "desc" },
        }
      );

      const totalTransactions = transactions.length;
      const totalAmount = transactions.reduce(
        (sum, tx) => sum + parseFloat(tx.amount.toString()),
        0
      );

      // Get daily transactions (last 24 hours)
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const dailyTransactions = transactions.filter(
        (tx) => tx.createdAt > dayAgo
      );
      const dailyAmount = dailyTransactions.reduce(
        (sum, tx) => sum + parseFloat(tx.amount.toString()),
        0
      );

      return {
        totalTransactions,
        totalAmount: totalAmount.toString(),
        dailyTransactions: dailyTransactions.length,
        dailyAmount: dailyAmount.toString(),
        lastTransactionAt: transactions[0]?.createdAt,
        averageTransactionAmount:
          totalTransactions > 0
            ? (totalAmount / totalTransactions).toString()
            : "0",
      };
    } catch (error) {
      this.logger.error("Failed to get session key usage", error);
      throw error;
    }
  }

  /**
   * Clean up expired session keys
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const expiredSessions = await this.prisma.client.sessionKey.findMany({
        where: {
          validUntil: {
            lt: new Date(),
          },
          status: SessionKeyStatus.ACTIVE,
        },
      });

      for (const session of expiredSessions) {
        await this.expireSessionKey(session.id);
      }

      this.logger.log(`Cleaned up ${expiredSessions.length} expired sessions`);
      return expiredSessions.length;
    } catch (error) {
      this.logger.error("Failed to cleanup expired sessions", error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private async expireSessionKey(sessionKeyId: string): Promise<void> {
    await this.prisma.client.$transaction(async (tx) => {
      await tx.sessionKey.update({
        where: { id: sessionKeyId },
        data: {
          status: SessionKeyStatus.EXPIRED,
        },
      });

      await tx.sessionEvent.create({
        data: {
          sessionKeyId,
          eventType: SessionEventType.EXPIRED,
          eventData: {
            expiredAt: new Date().toISOString(),
          },
          severity: "info",
        },
      });
    });
  }

  private async logSessionEvent(
    sessionKeyId: string,
    event: {
      eventType: SessionEventType;
      eventData: Record<string, unknown>;
      severity: "info" | "warning" | "error" | "critical";
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<void> {
    try {
      await this.prisma.client.sessionEvent.create({
        data: {
          sessionKeyId,
          eventType: event.eventType,
          eventData: event.eventData as any,
          severity: event.severity,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
        },
      });
    } catch (error) {
      this.logger.error("Failed to log session event", error);
      // Don't throw - logging failure shouldn't break main flow
    }
  }

  private mapToSessionKeyData(sessionKey: any): SessionKeyData {
    return {
      id: sessionKey.id,
      userId: sessionKey.userId,
      walletAddress: sessionKey.walletAddress,
      smartWalletOwner: sessionKey.smartWalletOwner, // Added for worker
      parentWalletAddress: sessionKey.parentWalletAddress, // Added for worker
      chainId: sessionKey.chainId,
      sessionPublicKey: sessionKey.sessionPublicKey,
      encryptedPrivateKey: sessionKey.encryptedPrivateKey,
      nonce: sessionKey.nonce.toString(),
      securityLevel: sessionKey.securityLevel as SecurityLevel,
      status: sessionKey.status as SessionKeyStatus,
      validUntil: sessionKey.validUntil,
      createdAt: sessionKey.createdAt,
      updatedAt: sessionKey.updatedAt,
      revokedAt: sessionKey.revokedAt,
      totalUsedAmount: sessionKey.totalUsedAmount.toString(),
      dailyUsedAmount: sessionKey.dailyUsedAmount.toString(),
      lastUsedAt: sessionKey.lastUsedAt,
      dailyResetAt: sessionKey.dailyResetAt,
      parentDelegationSignature: sessionKey.parentDelegationSignature, // Added for decryption
      permissions:
        sessionKey.permissions?.map((p: any) => ({
          operation: p.operation,
          maxAmountPerTx: p.maxAmountPerTx.toString(),
          maxDailyAmount: p.maxDailyAmount.toString(),
          allowedContracts: p.allowedContracts,
          requireConfirmation: p.requireConfirmation,
          emergencyStop: p.emergencyStop,
        })) || [],
    };
  }

  /**
   * Create Pimlico SimpleAccount session key
   * Uses existing infrastructure for Pimlico SimpleAccount integration
   */
  async createPimlicoSessionKey(
    userId: string,
    request: CreateSessionKeyRequest,
    userSignature: string
  ): Promise<{
    sessionKey: SessionKeyData;
    delegationMessage: string;
    smartAccountInfo: any;
  }> {
    try {
      this.logger.log("Creating Pimlico SimpleAccount session key", {
        userId,
        chainId: request.chainId,
        walletAddress: request.walletAddress,
      });

      // Generate session key pair
      const { address: sessionKeyAddress, privateKey } =
        await this.cryptoService.generateSessionKeyPair();

      // Use the real smart account address provided by the frontend
      const smartAccountAddress = request.smartAccountAddress!;

      this.logger.log("✅ Using real smart account address from frontend", {
        eoaAddress: request.walletAddress,
        smartAccountAddress,
        chainId: request.chainId,
        sessionKeyAddress,
        source: "frontend_permissionless_js",
      });

      // Encrypt private key with user signature
      const encryptedPrivateKey = await this.cryptoService.encryptSessionKey(
        privateKey,
        userSignature
      );

      // Store session key with Pimlico provider metadata
      const sessionKey = await this.prisma.client.$transaction(async (tx) => {
        const newSessionKey = await tx.sessionKey.create({
          data: {
            userId,
            walletAddress: sessionKeyAddress, // Session key's own address
            smartWalletOwner: smartAccountAddress, // ✅ Correct smart account address
            parentWalletAddress: request.walletAddress, // Original EOA address
            chainId: request.chainId,
            sessionPublicKey: sessionKeyAddress,
            encryptedPrivateKey,
            securityLevel: request.securityLevel,
            validUntil: request.validUntil,
            dailyResetAt: new Date(),
            parentDelegationSignature: userSignature,
            // Pimlico provider metadata
            providerType: "pimlico_simple_account",
            smartAccountMetadata: {
              ownerAddress: request.walletAddress,
              smartAccountAddress: smartAccountAddress,
              provider: "pimlico",
              createdAt: new Date().toISOString(),
            },
            smartAccountFactory: "0x5de4839a76cf55d0c90e2061ef4386d962E15ae3", // Standard SimpleAccount factory
            entryPoint: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789", // EntryPoint v0.6
          },
          include: { permissions: true },
        });

        // Create permissions
        for (const permission of request.permissions) {
          await tx.sessionPermission.create({
            data: {
              sessionKeyId: newSessionKey.id,
              operation: permission.operation,
              maxAmountPerTx: permission.maxAmountPerTx,
              maxDailyAmount: permission.maxDailyAmount,
              allowedContracts: permission.allowedContracts,
              requireConfirmation: permission.requireConfirmation,
              emergencyStop: permission.emergencyStop,
            },
          });
        }

        // Create creation event
        await tx.sessionEvent.create({
          data: {
            sessionKeyId: newSessionKey.id,
            eventType: SessionEventType.CREATED,
            eventData: {
              provider: "pimlico_simple_account",
              securityLevel: request.securityLevel,
              chainId: request.chainId,
              permissionCount: request.permissions.length,
            },
            severity: "info",
          },
        });

        return newSessionKey;
      });

      const sessionKeyData = await this.getSessionKeyById(sessionKey.id);

      this.logger.log("Pimlico session key created successfully", {
        sessionKeyId: sessionKey.id,
        userId,
      });

      return {
        sessionKey: sessionKeyData!,
        delegationMessage: JSON.stringify({
          sessionKeyAddress,
          chainId: request.chainId,
          provider: "pimlico_simple_account",
          ownerAddress: request.walletAddress,
          timestamp: new Date().toISOString(),
        }),
        smartAccountInfo: {
          provider: "pimlico_simple_account",
          ownerAddress: request.walletAddress,
          chainId: request.chainId,
        },
      };
    } catch (error) {
      this.logger.error("Failed to create Pimlico session key", error);
      throw new BadRequestException("Failed to create Pimlico session key");
    }
  }

  /**
   * Decrypt session key private key for worker access
   * Direct decryption without database lookup
   */
  async decryptSessionKeyForWorker(
    encryptedPrivateKey: string,
    userSignature: string
  ): Promise<string> {
    try {
      this.logger.log("Decrypting session key for worker access");

      const privateKey = await this.cryptoService.decryptSessionKey(
        encryptedPrivateKey,
        userSignature
      );

      this.logger.log("Session key decrypted successfully for worker");
      return privateKey;
    } catch (error) {
      this.logger.error("Failed to decrypt session key for worker", error);
      throw new Error(
        `Session key decryption failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Get session keys that are due for recurring execution
   * Used by worker to find scheduled operations
   */
  async getDueRecurringOperations(
    tolerance: number = 5 * 60 * 1000
  ): Promise<SessionKeyData[]> {
    try {
      const now = new Date();

      // Get all active session keys that have recurring schedules
      const sessionKeys = await this.prisma.client.sessionKey.findMany({
        where: {
          status: SessionKeyStatus.ACTIVE,
          validUntil: {
            gt: now,
          },
          // Add filter for session keys with recurring metadata
          // This would be stored in a JSON field or separate table
        },
        include: {
          permissions: true,
        },
      });

      // Filter to those that are due for execution
      const dueOperations: SessionKeyData[] = [];

      for (const sessionKey of sessionKeys) {
        const sessionKeyData = this.mapToSessionKeyData(sessionKey);

        // Check if this session key has recurring schedule configured
        // This would be enhanced with proper storage of recurring schedule data
        const isRecurringDue = this.isRecurringOperationDue(
          sessionKeyData,
          now,
          tolerance
        );

        if (isRecurringDue) {
          dueOperations.push(sessionKeyData);
        }
      }

      this.logger.log(
        `Found ${dueOperations.length} due recurring operations`,
        {
          total: sessionKeys.length,
          due: dueOperations.length,
        }
      );

      return dueOperations;
    } catch (error) {
      this.logger.error("Failed to get due recurring operations", error);
      throw error;
    }
  }

  /**
   * Update session key with recurring execution log
   * Tracks when recurring operations are executed
   */
  async logRecurringExecution(
    sessionKeyId: string,
    executionResult: {
      success: boolean;
      transactionHash?: string;
      error?: string;
      nextScheduledTime?: Date;
    }
  ): Promise<void> {
    try {
      await this.prisma.client.$transaction(async (tx) => {
        // Update last execution time
        await tx.sessionKey.update({
          where: { id: sessionKeyId },
          data: {
            lastUsedAt: new Date(),
          },
        });

        // Log execution event
        await tx.sessionEvent.create({
          data: {
            sessionKeyId,
            eventType: executionResult.success
              ? SessionEventType.USED
              : SessionEventType.SECURITY_ALERT,
            eventData: {
              executionType: "recurring",
              transactionHash: executionResult.transactionHash,
              error: executionResult.error,
              nextScheduledTime:
                executionResult.nextScheduledTime?.toISOString(),
            },
            severity: executionResult.success ? "info" : "warning",
          },
        });
      });

      this.logger.log("Recurring execution logged", {
        sessionKeyId,
        success: executionResult.success,
      });
    } catch (error) {
      this.logger.error("Failed to log recurring execution", error);
      throw error;
    }
  }

  /**
   * Create session key with enhanced recurring schedule support
   */
  async createEnhancedSessionKey(
    userId: string,
    request: CreateSessionKeyRequest & {
      recurringSchedule?: {
        type: "daily" | "weekly" | "monthly";
        dayOfWeek?: number;
        dayOfMonth?: number;
        time?: string;
        timezone?: string;
      };
      gasPayment?: {
        method: "sponsor" | "native" | "erc20";
        erc20Token?: {
          address: string;
          symbol: string;
          decimals: number;
        };
      };
    },
    userSignature: string
  ): Promise<{ sessionKey: SessionKeyData; delegationMessage: string }> {
    try {
      this.logger.log("Creating enhanced session key with recurring support", {
        userId,
        chainId: request.chainId,
        hasRecurringSchedule: !!request.recurringSchedule,
        gasPaymentMethod: request.gasPayment?.method || "native",
      });

      // Generate session key pair
      const { address: sessionKeyAddress, privateKey } =
        await this.cryptoService.generateSessionKeyPair();

      // Encrypt private key with user signature
      const encryptedPrivateKey = await this.cryptoService.encryptSessionKey(
        privateKey,
        userSignature
      );

      // Generate nonce
      const nonce = this.cryptoService.generateNonce();

      // Create enhanced delegation message with recurring schedule
      const delegationMessage = {
        smartWalletAddress: request.smartWalletOwner,
        sessionKeyAddress,
        delegatedBy: request.walletAddress,
        chainId: request.chainId,
        securityLevel: request.securityLevel,
        validUntil: request.validUntil.toISOString(),
        nonce: nonce.toString(),
        permissions: request.permissions,
        recurringSchedule: request.recurringSchedule,
        gasPayment: request.gasPayment,
        timestamp: new Date().toISOString(),
        purpose: "enhanced_workflow_automation",
        parentSignature: userSignature,
      };

      // Create session key in database with enhanced features
      const sessionKey = await this.prisma.client.$transaction(async (tx) => {
        const newSessionKey = await tx.sessionKey.create({
          data: {
            userId,
            walletAddress: sessionKeyAddress,
            smartWalletOwner: request.smartWalletOwner,
            parentWalletAddress: request.walletAddress,
            chainId: request.chainId,
            sessionPublicKey: sessionKeyAddress,
            encryptedPrivateKey,
            securityLevel: request.securityLevel,
            validUntil: request.validUntil,
            dailyResetAt: new Date(),
            parentDelegationSignature: userSignature,
            // Enhanced configuration is stored in the delegation message for now
            // TODO: Add proper schema fields for recurringSchedule and gasPayment when needed
          },
          include: {
            permissions: true,
          },
        });

        // Create permissions with enhanced features
        for (const permission of request.permissions) {
          await tx.sessionPermission.create({
            data: {
              sessionKeyId: newSessionKey.id,
              operation: permission.operation,
              maxAmountPerTx: permission.maxAmountPerTx,
              maxDailyAmount: permission.maxDailyAmount,
              allowedContracts: permission.allowedContracts,
              requireConfirmation: permission.requireConfirmation,
              emergencyStop: permission.emergencyStop,
            },
          });
        }

        // Create creation event with enhanced data
        await tx.sessionEvent.create({
          data: {
            sessionKeyId: newSessionKey.id,
            eventType: SessionEventType.CREATED,
            eventData: {
              securityLevel: request.securityLevel,
              chainId: request.chainId,
              permissionCount: request.permissions.length,
              hasRecurringSchedule: !!request.recurringSchedule,
              gasPaymentMethod: request.gasPayment?.method || "native",
              enhancedFeatures: true,
            },
            severity: "info",
          },
        });

        return newSessionKey;
      });

      // Convert to SessionKeyData format
      const sessionKeyData = await this.getSessionKeyById(sessionKey.id);

      this.logger.log("Enhanced session key created successfully", {
        sessionKeyId: sessionKey.id,
        userId,
        hasRecurringSchedule: !!request.recurringSchedule,
      });

      return {
        sessionKey: sessionKeyData!,
        delegationMessage: JSON.stringify(delegationMessage),
      };
    } catch (error) {
      this.logger.error("Failed to create enhanced session key", error);
      throw new BadRequestException("Failed to create enhanced session key");
    }
  }

  /**
   * Private helper to check if recurring operation is due
   */
  private isRecurringOperationDue(
    sessionKey: SessionKeyData,
    currentTime: Date,
    tolerance: number
  ): boolean {
    // This is a simplified check - in production, this would be more sophisticated
    // and would read the recurring schedule from the session key metadata

    // For now, return false as this needs proper implementation with stored schedule data
    // This would be enhanced to check against stored recurring schedule configuration
    return false;
  }
}
