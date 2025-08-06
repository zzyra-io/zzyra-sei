import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { SessionKeysModule } from "./session-keys.module";
import { DatabaseModule } from "../database/database.module";
import { PrismaService } from "../database/prisma.service";
import { SecurityLevel, SessionKeyStatus } from "@zyra/types";

/**
 * Integration test suite for Session Keys functionality
 * Tests the complete flow from API endpoints to database
 */
describe("SessionKeys Integration", () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  // Test data
  const mockUserId = "test-user-123";
  const mockWalletAddress = "0x742d35Cc6634C0532925a3b8d9C9d62e2f6DB4F2";
  const mockUserSignature =
    "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";

  const createSessionKeyDto = {
    walletAddress: mockWalletAddress,
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
    userSignature: mockUserSignature,
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [SessionKeysModule, DatabaseModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prismaService = moduleFixture.get<PrismaService>(PrismaService);

    await app.init();
  });

  afterAll(async () => {
    // Cleanup test data
    await prismaService.client.sessionEvent.deleteMany({
      where: {
        sessionKey: {
          userId: mockUserId,
        },
      },
    });

    await prismaService.client.sessionTransaction.deleteMany({
      where: {
        sessionKey: {
          userId: mockUserId,
        },
      },
    });

    await prismaService.client.sessionPermission.deleteMany({
      where: {
        sessionKey: {
          userId: mockUserId,
        },
      },
    });

    await prismaService.client.sessionKey.deleteMany({
      where: {
        userId: mockUserId,
      },
    });

    await app.close();
  });

  describe("Complete Session Key Lifecycle", () => {
    let sessionKeyId: string;
    let authToken: string;

    beforeAll(() => {
      // Mock JWT token for authentication
      authToken = "Bearer mock-jwt-token";
    });

    it("should create a session key", async () => {
      // Mock authentication middleware by setting user in request
      const response = await request(app.getHttpServer())
        .post("/session-keys")
        .set("Authorization", authToken)
        .send(createSessionKeyDto)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("sessionKey");
      expect(response.body.data).toHaveProperty("delegationMessage");
      expect(response.body.data.sessionKey.userId).toBe(mockUserId);
      expect(response.body.data.sessionKey.walletAddress).toBe(
        mockWalletAddress
      );
      expect(response.body.data.sessionKey.status).toBe(
        SessionKeyStatus.ACTIVE
      );

      sessionKeyId = response.body.data.sessionKey.id;
    });

    it("should retrieve the created session key", async () => {
      const response = await request(app.getHttpServer())
        .get(`/session-keys/${sessionKeyId}`)
        .set("Authorization", authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(sessionKeyId);
      expect(response.body.data.permissions).toHaveLength(1);
      expect(response.body.data.permissions[0].operation).toBe("send");
    });

    it("should list user session keys", async () => {
      const response = await request(app.getHttpServer())
        .get("/session-keys")
        .set("Authorization", authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.meta.total).toBeGreaterThan(0);
    });

    it("should validate session key for authorized operation", async () => {
      const validateDto = {
        operation: "send",
        amount: "0.5",
        toAddress: "0x123456789abcdef123456789abcdef123456789a",
      };

      const response = await request(app.getHttpServer())
        .post(`/session-keys/${sessionKeyId}/validate`)
        .set("Authorization", authToken)
        .send(validateDto)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isValid).toBe(true);
      expect(response.body.data.errors).toHaveLength(0);
      expect(response.body.data.remainingDailyAmount).toBeDefined();
    });

    it("should reject validation for unauthorized operation", async () => {
      const validateDto = {
        operation: "unauthorized-operation",
        amount: "0.5",
        toAddress: "0x123456789abcdef123456789abcdef123456789a",
      };

      const response = await request(app.getHttpServer())
        .post(`/session-keys/${sessionKeyId}/validate`)
        .set("Authorization", authToken)
        .send(validateDto)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isValid).toBe(false);
      expect(response.body.data.errors).toContain(
        "Operation 'unauthorized-operation' is not permitted"
      );
    });

    it("should reject validation for amount exceeding limits", async () => {
      const validateDto = {
        operation: "send",
        amount: "2.0", // Exceeds maxAmountPerTx of 1.0
        toAddress: "0x123456789abcdef123456789abcdef123456789a",
      };

      const response = await request(app.getHttpServer())
        .post(`/session-keys/${sessionKeyId}/validate`)
        .set("Authorization", authToken)
        .send(validateDto)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isValid).toBe(false);
      expect(response.body.data.errors).toContain(
        "Amount 2.0 exceeds per-transaction limit of 1.0"
      );
    });

    it("should update session key usage", async () => {
      const updateUsageDto = {
        amount: "0.5",
        transactionHash:
          "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      };

      const response = await request(app.getHttpServer())
        .put(`/session-keys/${sessionKeyId}/usage`)
        .set("Authorization", authToken)
        .send(updateUsageDto)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe(
        "Session key usage updated successfully"
      );
    });

    it("should retrieve session key usage statistics", async () => {
      const response = await request(app.getHttpServer())
        .get(`/session-keys/${sessionKeyId}/usage`)
        .set("Authorization", authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("totalTransactions");
      expect(response.body.data).toHaveProperty("totalAmount");
      expect(response.body.data).toHaveProperty("dailyTransactions");
      expect(response.body.data).toHaveProperty("dailyAmount");
      expect(response.body.data).toHaveProperty("averageTransactionAmount");
    });

    it("should revoke session key", async () => {
      const reason = "Integration test cleanup";

      const response = await request(app.getHttpServer())
        .delete(`/session-keys/${sessionKeyId}`)
        .set("Authorization", authToken)
        .send({ reason })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Session key revoked successfully");
    });

    it("should not validate revoked session key", async () => {
      const validateDto = {
        operation: "send",
        amount: "0.5",
        toAddress: "0x123456789abcdef123456789abcdef123456789a",
      };

      const response = await request(app.getHttpServer())
        .post(`/session-keys/${sessionKeyId}/validate`)
        .set("Authorization", authToken)
        .send(validateDto)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isValid).toBe(false);
      expect(response.body.data.errors).toContain("Session key is revoked");
    });
  });

  describe("Admin Endpoints", () => {
    it("should return security metrics", async () => {
      const response = await request(app.getHttpServer())
        .get("/session-keys/admin/metrics")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("activeSessions");
      expect(response.body.data).toHaveProperty("alertsLast24h");
      expect(response.body.data).toHaveProperty("pausedSessions");
      expect(response.body.data).toHaveProperty("expiredSessions");
      expect(response.body.data).toHaveProperty("topAlertTypes");
    });

    it("should perform manual cleanup", async () => {
      const response = await request(app.getHttpServer())
        .post("/session-keys/admin/cleanup")
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("cleanedCount");
      expect(response.body.message).toContain("Cleaned up");
    });

    it("should return health check", async () => {
      const response = await request(app.getHttpServer())
        .get("/session-keys/admin/test")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Session Keys service is healthy");
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("should return 401 for unauthenticated requests", async () => {
      const response = await request(app.getHttpServer())
        .post("/session-keys")
        .send(createSessionKeyDto)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("User not authenticated");
    });

    it("should return 404 for non-existent session key", async () => {
      const response = await request(app.getHttpServer())
        .get("/session-keys/non-existent-id")
        .set("Authorization", "Bearer mock-jwt-token")
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Session key not found");
    });

    it("should return 403 for accessing other user session key", async () => {
      // Create a session key for different user
      const otherUserSessionKey = await prismaService.client.sessionKey.create({
        data: {
          userId: "other-user-456",
          walletAddress: "0x987654321fedcba987654321fedcba9876543210",
          chainId: "sei-testnet",
          sessionPublicKey: "other-public-key",
          encryptedPrivateKey: "other-encrypted-key",
          nonce: BigInt(54321),
          securityLevel: SecurityLevel.BASIC,
          status: SessionKeyStatus.ACTIVE,
          validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
          dailyResetAt: new Date(),
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/session-keys/${otherUserSessionKey.id}`)
        .set("Authorization", "Bearer mock-jwt-token")
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Access denied");

      // Cleanup
      await prismaService.client.sessionKey.delete({
        where: { id: otherUserSessionKey.id },
      });
    });

    it("should return 400 for invalid session key creation", async () => {
      const invalidDto = {
        walletAddress: "invalid-address",
        chainId: "sei-testnet",
        securityLevel: SecurityLevel.BASIC,
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        permissions: [],
        userSignature: "invalid-signature",
      };

      const response = await request(app.getHttpServer())
        .post("/session-keys")
        .set("Authorization", "Bearer mock-jwt-token")
        .send(invalidDto)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("Failed to create session key");
    });
  });

  describe("Rate Limiting", () => {
    it("should apply rate limiting to session creation", async () => {
      // Make multiple rapid requests to trigger rate limiting
      const requests = Array(10)
        .fill(null)
        .map(() =>
          request(app.getHttpServer())
            .post("/session-keys")
            .set("Authorization", "Bearer mock-jwt-token")
            .send(createSessionKeyDto)
        );

      const responses = await Promise.allSettled(requests);

      // At least one request should be rate limited
      const rateLimitedResponses = responses.filter(
        (response) =>
          response.status === "fulfilled" && response.value.status === 429
      );

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it("should include rate limit headers", async () => {
      const response = await request(app.getHttpServer())
        .get("/session-keys/admin/test")
        .expect(200);

      expect(response.headers).toHaveProperty("x-ratelimit-limit");
      expect(response.headers).toHaveProperty("x-ratelimit-remaining");
      expect(response.headers).toHaveProperty("x-ratelimit-reset");
    });
  });

  describe("Security Headers", () => {
    it("should include security headers in responses", async () => {
      const response = await request(app.getHttpServer())
        .get("/session-keys/admin/test")
        .expect(200);

      expect(response.headers).toHaveProperty("x-frame-options", "DENY");
      expect(response.headers).toHaveProperty(
        "x-content-type-options",
        "nosniff"
      );
      expect(response.headers).toHaveProperty(
        "x-xss-protection",
        "1; mode=block"
      );
      expect(response.headers).toHaveProperty("strict-transport-security");
      expect(response.headers).toHaveProperty("content-security-policy");
    });
  });
});
