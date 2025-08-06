import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { SessionKeysService } from "./session-keys.service";
import { SessionKeyCryptoService } from "../shared/services/session-key-crypto.service";
import { PrismaService } from "../database/prisma.service";
import {
  SessionKeyStatus,
  SecurityLevel,
  CreateSessionKeyRequest,
  SessionEventType,
} from "@zyra/types";

/**
 * Test suite for SessionKeysService
 * Following Jest testing guidelines and AAA pattern
 */
describe("SessionKeysService", () => {
  let service: SessionKeysService;
  let cryptoService: SessionKeyCryptoService;
  let prismaService: PrismaService;

  // Mock data
  const mockUserId = "user-123";
  const mockSessionKeyId = "session-456";
  const mockWalletAddress = "0x742d35Cc6634C0532925a3b8d9C9d62e2f6DB4F2";
  const mockUserSignature = "0xabcdef...";

  const mockCreateSessionKeyRequest: CreateSessionKeyRequest = {
    walletAddress: mockWalletAddress,
    chainId: "sei-testnet",
    securityLevel: SecurityLevel.BASIC,
    validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
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

  const mockSessionKeyData = {
    id: mockSessionKeyId,
    userId: mockUserId,
    walletAddress: mockWalletAddress,
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
    permissions: mockCreateSessionKeyRequest.permissions,
  };

  // Mock implementations
  const mockCryptoService = {
    generateSessionKeyPair: jest.fn(),
    encryptSessionKey: jest.fn(),
    generateNonce: jest.fn(),
  };

  const mockPrismaService = {
    $transaction: jest.fn(),
    sessionKey: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    sessionPermission: {
      create: jest.fn(),
    },
    sessionEvent: {
      create: jest.fn(),
    },
    sessionTransaction: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionKeysService,
        {
          provide: SessionKeyCryptoService,
          useValue: mockCryptoService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SessionKeysService>(SessionKeysService);
    cryptoService = module.get<SessionKeyCryptoService>(
      SessionKeyCryptoService
    );
    prismaService = module.get<PrismaService>(PrismaService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe("createSessionKey", () => {
    beforeEach(() => {
      // Setup default mock responses
      mockCryptoService.generateSessionKeyPair.mockResolvedValue({
        publicKey: "mock-public-key",
        privateKey: "mock-private-key",
      });
      mockCryptoService.encryptSessionKey.mockResolvedValue(
        "mock-encrypted-private-key"
      );
      mockCryptoService.generateNonce.mockReturnValue(BigInt(12345));
    });

    it("should create a session key successfully", async () => {
      // Arrange
      const expectedSessionKey = { ...mockSessionKeyData, permissions: [] };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          sessionKey: {
            create:
              mockPrismaService.sessionKey.create.mockResolvedValue(
                expectedSessionKey
              ),
          },
          sessionPermission: {
            create: mockPrismaService.sessionPermission.create,
          },
          sessionEvent: {
            create: mockPrismaService.sessionEvent.create,
          },
        });
      });

      // Mock getSessionKeyById to return the created session key
      jest
        .spyOn(service, "getSessionKeyById")
        .mockResolvedValue(mockSessionKeyData);

      // Act
      const result = await service.createSessionKey(
        mockUserId,
        mockCreateSessionKeyRequest,
        mockUserSignature
      );

      // Assert
      expect(result).toHaveProperty("sessionKey");
      expect(result).toHaveProperty("delegationMessage");
      expect(result.sessionKey.id).toBe(mockSessionKeyId);
      expect(result.sessionKey.userId).toBe(mockUserId);

      expect(mockCryptoService.generateSessionKeyPair).toHaveBeenCalledTimes(1);
      expect(mockCryptoService.encryptSessionKey).toHaveBeenCalledWith(
        "mock-private-key",
        mockUserSignature
      );
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
    });

    it("should throw BadRequestException when crypto operations fail", async () => {
      // Arrange
      mockCryptoService.generateSessionKeyPair.mockRejectedValue(
        new Error("Crypto error")
      );

      // Act & Assert
      await expect(
        service.createSessionKey(
          mockUserId,
          mockCreateSessionKeyRequest,
          mockUserSignature
        )
      ).rejects.toThrow(BadRequestException);
    });

    it("should create permissions for the session key", async () => {
      // Arrange
      const mockTransaction = {
        sessionKey: {
          create: jest
            .fn()
            .mockResolvedValue({ ...mockSessionKeyData, permissions: [] }),
        },
        sessionPermission: {
          create: jest.fn(),
        },
        sessionEvent: {
          create: jest.fn(),
        },
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockTransaction);
      });

      jest
        .spyOn(service, "getSessionKeyById")
        .mockResolvedValue(mockSessionKeyData);

      // Act
      await service.createSessionKey(
        mockUserId,
        mockCreateSessionKeyRequest,
        mockUserSignature
      );

      // Assert
      expect(mockTransaction.sessionPermission.create).toHaveBeenCalledTimes(
        mockCreateSessionKeyRequest.permissions.length
      );
      expect(mockTransaction.sessionPermission.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          operation: "send",
          maxAmountPerTx: "1.0",
          maxDailyAmount: "10.0",
        }),
      });
    });
  });

  describe("getSessionKeyById", () => {
    it("should return session key when found", async () => {
      // Arrange
      const mockPrismaResult = {
        ...mockSessionKeyData,
        permissions: [
          {
            operation: "send",
            maxAmountPerTx: { toString: () => "1.0" },
            maxDailyAmount: { toString: () => "10.0" },
            allowedContracts: [],
            requireConfirmation: false,
            emergencyStop: false,
          },
        ],
        totalUsedAmount: { toString: () => "0" },
        dailyUsedAmount: { toString: () => "0" },
      };

      mockPrismaService.sessionKey.findUnique.mockResolvedValue(
        mockPrismaResult
      );

      // Act
      const result = await service.getSessionKeyById(mockSessionKeyId);

      // Assert
      expect(result).toBeDefined();
      expect(result?.id).toBe(mockSessionKeyId);
      expect(result?.permissions).toHaveLength(1);
      expect(mockPrismaService.sessionKey.findUnique).toHaveBeenCalledWith({
        where: { id: mockSessionKeyId },
        include: { permissions: true },
      });
    });

    it("should return null when session key not found", async () => {
      // Arrange
      mockPrismaService.sessionKey.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.getSessionKeyById("non-existent-id");

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("validateSessionKey", () => {
    const mockValidationParams = {
      operation: "send",
      amount: "0.5",
      toAddress: "0x123...",
    };

    it("should return valid result for authorized operation", async () => {
      // Arrange
      jest
        .spyOn(service, "getSessionKeyById")
        .mockResolvedValue(mockSessionKeyData);

      // Act
      const result = await service.validateSessionKey(
        mockSessionKeyId,
        mockValidationParams.operation,
        mockValidationParams.amount,
        mockValidationParams.toAddress
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.remainingDailyAmount).toBeDefined();
    });

    it("should return invalid result when session key not found", async () => {
      // Arrange
      jest.spyOn(service, "getSessionKeyById").mockResolvedValue(null);

      // Act
      const result = await service.validateSessionKey(
        "non-existent-id",
        mockValidationParams.operation,
        mockValidationParams.amount,
        mockValidationParams.toAddress
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Session key not found");
    });

    it("should return invalid result when session key is expired", async () => {
      // Arrange
      const expiredSessionKey = {
        ...mockSessionKeyData,
        validUntil: new Date(Date.now() - 1000), // Expired 1 second ago
      };
      jest
        .spyOn(service, "getSessionKeyById")
        .mockResolvedValue(expiredSessionKey);
      jest
        .spyOn(service as any, "expireSessionKey")
        .mockResolvedValue(undefined);

      // Act
      const result = await service.validateSessionKey(
        mockSessionKeyId,
        mockValidationParams.operation,
        mockValidationParams.amount,
        mockValidationParams.toAddress
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Session key has expired");
    });

    it("should return invalid result when operation not permitted", async () => {
      // Arrange
      jest
        .spyOn(service, "getSessionKeyById")
        .mockResolvedValue(mockSessionKeyData);

      // Act
      const result = await service.validateSessionKey(
        mockSessionKeyId,
        "unauthorized-operation",
        mockValidationParams.amount,
        mockValidationParams.toAddress
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Operation 'unauthorized-operation' is not permitted"
      );
    });

    it("should return invalid result when amount exceeds per-transaction limit", async () => {
      // Arrange
      jest
        .spyOn(service, "getSessionKeyById")
        .mockResolvedValue(mockSessionKeyData);

      // Act
      const result = await service.validateSessionKey(
        mockSessionKeyId,
        mockValidationParams.operation,
        "2.0", // Exceeds maxAmountPerTx of 1.0
        mockValidationParams.toAddress
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Amount 2.0 exceeds per-transaction limit of 1.0"
      );
    });
  });

  describe("updateSessionKeyUsage", () => {
    it("should update usage successfully", async () => {
      // Arrange
      const mockAmount = "0.5";
      const mockTransactionHash = "0xabcdef...";

      const mockSessionKey = {
        ...mockSessionKeyData,
        dailyUsedAmount: { toString: () => "1.0" },
        totalUsedAmount: { toString: () => "5.0" },
      };

      const mockTransaction = {
        sessionKey: {
          findUnique: jest.fn().mockResolvedValue(mockSessionKey),
          update: jest.fn(),
        },
        sessionEvent: {
          create: jest.fn(),
        },
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockTransaction);
      });

      // Act
      await service.updateSessionKeyUsage(
        mockSessionKeyId,
        mockAmount,
        mockTransactionHash
      );

      // Assert
      expect(mockTransaction.sessionKey.update).toHaveBeenCalledWith({
        where: { id: mockSessionKeyId },
        data: expect.objectContaining({
          totalUsedAmount: { increment: parseFloat(mockAmount) },
          lastUsedAt: expect.any(Date),
        }),
      });

      expect(mockTransaction.sessionEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sessionKeyId: mockSessionKeyId,
          eventType: SessionEventType.USED,
          eventData: expect.objectContaining({
            amount: mockAmount,
            transactionHash: mockTransactionHash,
          }),
        }),
      });
    });

    it("should throw NotFoundException when session key not found", async () => {
      // Arrange
      const mockTransaction = {
        sessionKey: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockTransaction);
      });

      // Act & Assert
      await expect(
        service.updateSessionKeyUsage(mockSessionKeyId, "0.5")
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("revokeSessionKey", () => {
    it("should revoke session key successfully", async () => {
      // Arrange
      const mockReason = "User requested revocation";

      const mockTransaction = {
        sessionKey: {
          update: jest.fn(),
        },
        sessionEvent: {
          create: jest.fn(),
        },
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockTransaction);
      });

      // Act
      await service.revokeSessionKey(mockSessionKeyId, mockReason);

      // Assert
      expect(mockTransaction.sessionKey.update).toHaveBeenCalledWith({
        where: { id: mockSessionKeyId },
        data: {
          status: SessionKeyStatus.REVOKED,
          revokedAt: expect.any(Date),
        },
      });

      expect(mockTransaction.sessionEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sessionKeyId: mockSessionKeyId,
          eventType: SessionEventType.REVOKED,
          eventData: expect.objectContaining({
            reason: mockReason,
          }),
        }),
      });
    });
  });

  describe("getSessionKeyUsage", () => {
    it("should return usage statistics", async () => {
      // Arrange
      jest
        .spyOn(service, "getSessionKeyById")
        .mockResolvedValue(mockSessionKeyData);

      const mockTransactions = [
        {
          id: "tx-1",
          amount: { toString: () => "0.5" },
          createdAt: new Date(),
        },
        {
          id: "tx-2",
          amount: { toString: () => "1.0" },
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        },
      ];

      mockPrismaService.sessionTransaction.findMany.mockResolvedValue(
        mockTransactions
      );

      // Act
      const result = await service.getSessionKeyUsage(mockSessionKeyId);

      // Assert
      expect(result).toHaveProperty("totalTransactions", 2);
      expect(result).toHaveProperty("totalAmount", "1.5");
      expect(result).toHaveProperty("dailyTransactions");
      expect(result).toHaveProperty("dailyAmount");
      expect(result).toHaveProperty("averageTransactionAmount", "0.75");
    });

    it("should throw NotFoundException when session key not found", async () => {
      // Arrange
      jest.spyOn(service, "getSessionKeyById").mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getSessionKeyUsage("non-existent-id")
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("cleanupExpiredSessions", () => {
    it("should cleanup expired sessions", async () => {
      // Arrange
      const mockExpiredSessions = [{ id: "expired-1" }, { id: "expired-2" }];

      mockPrismaService.sessionKey.findMany.mockResolvedValue(
        mockExpiredSessions
      );
      jest
        .spyOn(service as any, "expireSessionKey")
        .mockResolvedValue(undefined);

      // Act
      const result = await service.cleanupExpiredSessions();

      // Assert
      expect(result).toBe(2);
      expect(mockPrismaService.sessionKey.findMany).toHaveBeenCalledWith({
        where: {
          validUntil: { lt: expect.any(Date) },
          status: SessionKeyStatus.ACTIVE,
        },
      });
    });
  });
});
