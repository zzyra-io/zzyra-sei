import { Test, TestingModule } from "@nestjs/testing";
import { HttpException, HttpStatus } from "@nestjs/common";
import { SessionKeysController } from "./session-keys.controller";
import { SessionKeysService } from "./session-keys.service";
import { SessionMonitoringService } from "./session-monitoring.service";
import { SessionKeyStatus, SecurityLevel, SessionKeyData } from "@zyra/types";

/**
 * Test suite for SessionKeysController
 * Following Jest testing guidelines and AAA pattern
 */
describe("SessionKeysController", () => {
  let controller: SessionKeysController;
  let sessionKeysService: SessionKeysService;
  let sessionMonitoringService: SessionMonitoringService;

  // Mock data
  const mockUserId = "user-123";
  const mockSessionKeyId = "session-456";

  const mockSessionKeyData: SessionKeyData = {
    id: mockSessionKeyId,
    userId: mockUserId,
    walletAddress: "0x742d35Cc6634C0532925a3b8d9C9d62e2f6DB4F2",
    chainId: "sei-testnet",
    sessionPublicKey: "mock-public-key",
    encryptedPrivateKey: "mock-encrypted-private-key",
    nonce: BigInt(12345),
    securityLevel: SecurityLevel.BASIC,
    status: SessionKeyStatus.ACTIVE,
    validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
    revokedAt: undefined,
    totalUsedAmount: "0",
    dailyUsedAmount: "0",
    lastUsedAt: undefined,
    dailyResetAt: new Date(),
    permissions: [
      {
        operation: "send",
        maxAmountPerTx: "1.0",
        maxDailyAmount: "10.0",
        allowedContracts: [],
        requireConfirmation: false,
        emergencyStop: false,
      },
    ],
  };

  const mockRequest = {
    user: { id: mockUserId },
  };

  // Mock services
  const mockSessionKeysService = {
    createSessionKey: jest.fn(),
    getSessionKeyById: jest.fn(),
    getSessionKeysByUserId: jest.fn(),
    validateSessionKey: jest.fn(),
    updateSessionKeyUsage: jest.fn(),
    revokeSessionKey: jest.fn(),
    getSessionKeyUsage: jest.fn(),
    cleanupExpiredSessions: jest.fn(),
  };

  const mockSessionMonitoringService = {
    getSecurityMetrics: jest.fn(),
    cleanupExpiredSessions: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SessionKeysController],
      providers: [
        {
          provide: SessionKeysService,
          useValue: mockSessionKeysService,
        },
        {
          provide: SessionMonitoringService,
          useValue: mockSessionMonitoringService,
        },
      ],
    }).compile();

    controller = module.get<SessionKeysController>(SessionKeysController);
    sessionKeysService = module.get<SessionKeysService>(SessionKeysService);
    sessionMonitoringService = module.get<SessionMonitoringService>(
      SessionMonitoringService
    );

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe("createSessionKey", () => {
    const mockCreateSessionKeyDto = {
      walletAddress: "0x742d35Cc6634C0532925a3b8d9C9d62e2f6DB4F2",
      chainId: "sei-testnet",
      securityLevel: SecurityLevel.BASIC,
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      permissions: [
        {
          operation: "send",
          maxAmountPerTx: "1.0",
          maxDailyAmount: "10.0",
          allowedContracts: [],
          requireConfirmation: false,
          emergencyStop: false,
        },
      ],
      userSignature: "0xabcdef...",
    };

    it("should create session key successfully", async () => {
      // Arrange
      const expectedResult = {
        sessionKey: mockSessionKeyData,
        delegationMessage: "mock-delegation-message",
      };

      mockSessionKeysService.createSessionKey.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.createSessionKey(
        mockCreateSessionKeyDto,
        mockRequest
      );

      // Assert
      expect(result).toEqual({
        success: true,
        data: expectedResult,
      });

      expect(mockSessionKeysService.createSessionKey).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          walletAddress: mockCreateSessionKeyDto.walletAddress,
          chainId: mockCreateSessionKeyDto.chainId,
          securityLevel: mockCreateSessionKeyDto.securityLevel,
          validUntil: expect.any(Date),
          permissions: mockCreateSessionKeyDto.permissions,
        }),
        mockCreateSessionKeyDto.userSignature
      );
    });

    it("should throw HttpException when user not authenticated", async () => {
      // Arrange
      const unauthenticatedRequest = { user: null };

      // Act & Assert
      await expect(
        controller.createSessionKey(
          mockCreateSessionKeyDto,
          unauthenticatedRequest
        )
      ).rejects.toThrow(
        new HttpException("User not authenticated", HttpStatus.UNAUTHORIZED)
      );
    });

    it("should throw HttpException when service fails", async () => {
      // Arrange
      mockSessionKeysService.createSessionKey.mockRejectedValue(
        new Error("Service error")
      );

      // Act & Assert
      await expect(
        controller.createSessionKey(mockCreateSessionKeyDto, mockRequest)
      ).rejects.toThrow(HttpException);
    });
  });

  describe("getSessionKey", () => {
    it("should return session key when found and user owns it", async () => {
      // Arrange
      mockSessionKeysService.getSessionKeyById.mockResolvedValue(
        mockSessionKeyData
      );

      // Act
      const result = await controller.getSessionKey(
        mockSessionKeyId,
        mockRequest
      );

      // Assert
      expect(result).toEqual({
        success: true,
        data: mockSessionKeyData,
      });

      expect(mockSessionKeysService.getSessionKeyById).toHaveBeenCalledWith(
        mockSessionKeyId
      );
    });

    it("should throw HttpException when session key not found", async () => {
      // Arrange
      mockSessionKeysService.getSessionKeyById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        controller.getSessionKey("non-existent-id", mockRequest)
      ).rejects.toThrow(
        new HttpException("Session key not found", HttpStatus.NOT_FOUND)
      );
    });

    it("should throw HttpException when user does not own session key", async () => {
      // Arrange
      const otherUserSessionKey = {
        ...mockSessionKeyData,
        userId: "other-user",
      };
      mockSessionKeysService.getSessionKeyById.mockResolvedValue(
        otherUserSessionKey
      );

      // Act & Assert
      await expect(
        controller.getSessionKey(mockSessionKeyId, mockRequest)
      ).rejects.toThrow(
        new HttpException("Access denied", HttpStatus.FORBIDDEN)
      );
    });
  });

  describe("getUserSessionKeys", () => {
    it("should return user session keys", async () => {
      // Arrange
      const mockSessionKeys = [mockSessionKeyData];
      mockSessionKeysService.getSessionKeysByUserId.mockResolvedValue(
        mockSessionKeys
      );

      // Act
      const result = await controller.getUserSessionKeys(
        undefined,
        mockRequest
      );

      // Assert
      expect(result).toEqual({
        success: true,
        data: mockSessionKeys,
        meta: {
          total: 1,
          status: "all",
        },
      });

      expect(
        mockSessionKeysService.getSessionKeysByUserId
      ).toHaveBeenCalledWith(mockUserId, undefined);
    });

    it("should filter by status when provided", async () => {
      // Arrange
      const mockSessionKeys = [mockSessionKeyData];
      mockSessionKeysService.getSessionKeysByUserId.mockResolvedValue(
        mockSessionKeys
      );

      // Act
      const result = await controller.getUserSessionKeys(
        SessionKeyStatus.ACTIVE,
        mockRequest
      );

      // Assert
      expect(result.meta.status).toBe(SessionKeyStatus.ACTIVE);
      expect(
        mockSessionKeysService.getSessionKeysByUserId
      ).toHaveBeenCalledWith(mockUserId, SessionKeyStatus.ACTIVE);
    });
  });

  describe("validateSessionKey", () => {
    const mockValidateDto = {
      operation: "send",
      amount: "0.5",
      toAddress: "0x123...",
    };

    it("should validate session key successfully", async () => {
      // Arrange
      const mockValidationResult = {
        isValid: true,
        errors: [],
        remainingDailyAmount: "9.5",
      };

      mockSessionKeysService.getSessionKeyById.mockResolvedValue(
        mockSessionKeyData
      );
      mockSessionKeysService.validateSessionKey.mockResolvedValue(
        mockValidationResult
      );

      // Act
      const result = await controller.validateSessionKey(
        mockSessionKeyId,
        mockValidateDto,
        mockRequest
      );

      // Assert
      expect(result).toEqual({
        success: true,
        data: mockValidationResult,
      });

      expect(mockSessionKeysService.validateSessionKey).toHaveBeenCalledWith(
        mockSessionKeyId,
        mockValidateDto.operation,
        mockValidateDto.amount,
        mockValidateDto.toAddress
      );
    });

    it("should throw HttpException when user does not own session key", async () => {
      // Arrange
      const otherUserSessionKey = {
        ...mockSessionKeyData,
        userId: "other-user",
      };
      mockSessionKeysService.getSessionKeyById.mockResolvedValue(
        otherUserSessionKey
      );

      // Act & Assert
      await expect(
        controller.validateSessionKey(
          mockSessionKeyId,
          mockValidateDto,
          mockRequest
        )
      ).rejects.toThrow(
        new HttpException(
          "Session key not found or access denied",
          HttpStatus.FORBIDDEN
        )
      );
    });
  });

  describe("updateSessionKeyUsage", () => {
    const mockUpdateUsageDto = {
      amount: "0.5",
      transactionHash: "0xabcdef...",
    };

    it("should update session key usage successfully", async () => {
      // Arrange
      mockSessionKeysService.getSessionKeyById.mockResolvedValue(
        mockSessionKeyData
      );
      mockSessionKeysService.updateSessionKeyUsage.mockResolvedValue(undefined);

      // Act
      const result = await controller.updateSessionKeyUsage(
        mockSessionKeyId,
        mockUpdateUsageDto,
        mockRequest
      );

      // Assert
      expect(result).toEqual({
        success: true,
        message: "Session key usage updated successfully",
      });

      expect(mockSessionKeysService.updateSessionKeyUsage).toHaveBeenCalledWith(
        mockSessionKeyId,
        mockUpdateUsageDto.amount,
        mockUpdateUsageDto.transactionHash
      );
    });
  });

  describe("getSessionKeyUsage", () => {
    it("should return session key usage statistics", async () => {
      // Arrange
      const mockUsageStats = {
        totalTransactions: 5,
        totalAmount: "2.5",
        dailyTransactions: 3,
        dailyAmount: "1.5",
        lastTransactionAt: new Date(),
        averageTransactionAmount: "0.5",
      };

      mockSessionKeysService.getSessionKeyById.mockResolvedValue(
        mockSessionKeyData
      );
      mockSessionKeysService.getSessionKeyUsage.mockResolvedValue(
        mockUsageStats
      );

      // Act
      const result = await controller.getSessionKeyUsage(
        mockSessionKeyId,
        mockRequest
      );

      // Assert
      expect(result).toEqual({
        success: true,
        data: mockUsageStats,
      });

      expect(mockSessionKeysService.getSessionKeyUsage).toHaveBeenCalledWith(
        mockSessionKeyId
      );
    });
  });

  describe("revokeSessionKey", () => {
    it("should revoke session key successfully", async () => {
      // Arrange
      const mockReason = "User requested revocation";
      mockSessionKeysService.getSessionKeyById.mockResolvedValue(
        mockSessionKeyData
      );
      mockSessionKeysService.revokeSessionKey.mockResolvedValue(undefined);

      // Act
      const result = await controller.revokeSessionKey(
        mockSessionKeyId,
        mockReason,
        mockRequest
      );

      // Assert
      expect(result).toEqual({
        success: true,
        message: "Session key revoked successfully",
      });

      expect(mockSessionKeysService.revokeSessionKey).toHaveBeenCalledWith(
        mockSessionKeyId,
        mockReason
      );
    });
  });

  describe("getSecurityMetrics", () => {
    it("should return security metrics", async () => {
      // Arrange
      const mockMetrics = {
        activeSessions: 10,
        alertsLast24h: 2,
        pausedSessions: 1,
        expiredSessions: 5,
        topAlertTypes: [
          { type: "velocity", count: 1 },
          { type: "amount", count: 1 },
        ],
      };

      mockSessionMonitoringService.getSecurityMetrics.mockResolvedValue(
        mockMetrics
      );

      // Act
      const result = await controller.getSecurityMetrics();

      // Assert
      expect(result).toEqual({
        success: true,
        data: mockMetrics,
      });

      expect(
        mockSessionMonitoringService.getSecurityMetrics
      ).toHaveBeenCalledTimes(1);
    });

    it("should throw HttpException when service fails", async () => {
      // Arrange
      mockSessionMonitoringService.getSecurityMetrics.mockRejectedValue(
        new Error("Service error")
      );

      // Act & Assert
      await expect(controller.getSecurityMetrics()).rejects.toThrow(
        new HttpException(
          "Internal server error",
          HttpStatus.INTERNAL_SERVER_ERROR
        )
      );
    });
  });

  describe("manualCleanup", () => {
    it("should perform manual cleanup successfully", async () => {
      // Arrange
      const cleanedCount = 3;
      mockSessionMonitoringService.cleanupExpiredSessions.mockResolvedValue(
        cleanedCount
      );

      // Act
      const result = await controller.manualCleanup();

      // Assert
      expect(result).toEqual({
        success: true,
        data: { cleanedCount },
        message: `Cleaned up ${cleanedCount} expired sessions`,
      });

      expect(
        mockSessionMonitoringService.cleanupExpiredSessions
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe("adminTest", () => {
    it("should return health check response", async () => {
      // Act
      const result = await controller.adminTest();

      // Assert
      expect(result).toEqual({
        success: true,
        message: "Session Keys service is healthy",
        timestamp: expect.any(String),
      });
    });
  });
});
