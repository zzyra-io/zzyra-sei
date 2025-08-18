/**
 * Session Key Types for Secure Blockchain Delegation
 * Following TypeScript general guidelines and Zzyra patterns
 */

// ================ Enums ================

export enum SessionKeyStatus {
  ACTIVE = "active",
  EXPIRED = "expired",
  REVOKED = "revoked",
  PAUSED = "paused",
}

export enum SecurityLevel {
  BASIC = "basic",
  ENHANCED = "enhanced",
  MAXIMUM = "maximum",
}

export enum SessionEventType {
  CREATED = "created",
  USED = "used",
  REVOKED = "revoked",
  EXPIRED = "expired",
  SECURITY_ALERT = "security_alert",
  RATE_LIMITED = "rate_limited",
  AMOUNT_EXCEEDED = "amount_exceeded",
}

export enum TransactionStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  FAILED = "failed",
}

// ================ Core Types ================

export interface SessionKeyPermission {
  operation: string;
  maxAmountPerTx: string;
  maxDailyAmount: string;
  allowedContracts: string[];
  requireConfirmation: boolean;
  emergencyStop: boolean;
}

export interface SessionKeyData {
  id: string;
  userId: string;
  walletAddress: string; // Session key's own address
  smartWalletOwner?: string; // Smart wallet that owns this session key
  parentWalletAddress?: string; // Original EOA address
  chainId: string;
  sessionPublicKey: string;
  encryptedPrivateKey: string;
  nonce: string;
  securityLevel: SecurityLevel;
  status: SessionKeyStatus;
  validUntil: Date;
  createdAt: Date;
  updatedAt: Date;
  revokedAt?: Date;
  totalUsedAmount: string;
  dailyUsedAmount: string;
  lastUsedAt?: Date;
  dailyResetAt: Date;
  parentDelegationSignature?: string; // Original Dynamic delegation
  permissions: SessionKeyPermission[];
}

export interface SessionTransaction {
  id: string;
  sessionKeyId: string;
  workflowExecutionId?: string;
  transactionHash?: string;
  chainId: string;
  fromAddress: string;
  toAddress: string;
  amount: string;
  operation: string;
  status: TransactionStatus;
  gasUsed?: bigint;
  gasPrice?: bigint;
  blockNumber?: bigint;
  metadata?: Record<string, unknown>;
  errorMessage?: string;
  createdAt: Date;
  confirmedAt?: Date;
  failedAt?: Date;
}

export interface SessionEvent {
  id: string;
  sessionKeyId: string;
  eventType: SessionEventType;
  eventData: Record<string, unknown>;
  severity: "info" | "warning" | "error" | "critical";
  ipAddress?: string;
  userAgent?: string;
  location?: Record<string, unknown>;
  createdAt: Date;
}

// ================ Request/Response DTOs ================

export interface CreateSessionKeyRequest {
  walletAddress: string; // EOA address that initially authorized
  smartWalletOwner?: string; // Smart wallet address that owns the session key
  smartAccountAddress?: string; // Real SimpleAccount address from frontend (for Pimlico integration)
  chainId: string;
  securityLevel: SecurityLevel;
  validUntil: Date;
  permissions: Omit<
    SessionKeyPermission,
    "id" | "sessionKeyId" | "createdAt" | "updatedAt"
  >[];
  serializedSessionParams?: string; // ZeroDv SessionKeyProvider serialized params
}

export interface CreateSessionKeyResponse {
  sessionKey: SessionKeyData;
  sessionPublicKey: string;
  delegationMessage: string;
}

export interface SessionKeyAuthRequest {
  sessionKeyId: string;
  operation: string;
  amount: string;
  toAddress: string;
  metadata?: Record<string, unknown>;
}

export interface SessionKeyValidationResult {
  isValid: boolean;
  errors: string[];
  remainingDailyAmount?: string;
  remainingTotalAmount?: string;
}

export interface SessionUsageStats {
  totalTransactions: number;
  totalAmount: string;
  dailyTransactions: number;
  dailyAmount: string;
  lastTransactionAt?: Date;
  averageTransactionAmount: string;
}

// ================ Security Types ================

export interface SecurityConfig {
  maxSessionDuration: number; // hours
  maxDailyAmount: string;
  maxTransactionAmount: string;
  allowedOperations: string[];
  requireMultiSig: boolean;
  multiSigThreshold?: number;
  rateLimit: {
    maxTransactionsPerMinute: number;
    maxTransactionsPerHour: number;
  };
  anomalyDetection: {
    enabled: boolean;
    velocityThreshold: number;
    amountThreshold: string;
  };
}

export interface AnomalyAlert {
  sessionKeyId: string;
  alertType: "velocity" | "amount" | "location" | "pattern";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  metadata: Record<string, unknown>;
  triggeredAt: Date;
}

// ================ Enhanced Blockchain Auth Types ================

export interface SecureBlockchainAuthConfig {
  // Existing fields (backward compatibility)
  selectedChains: Array<{
    chainId: string;
    chainName: string;
    maxDailySpending: string;
    allowedOperations: string[];
    tokenSymbol: string;
    enabled: boolean;
  }>;
  duration: number;
  timestamp: number;

  // New security fields
  securityLevel: SecurityLevel;
  requireConfirmation: boolean;
  emergencyContacts: string[];
  spendingAlerts: Array<{
    threshold: number;
    method: "email" | "sms" | "push";
  }>;

  // Session key specific
  sessionKeyId?: string;
  delegationSignature?: string;
}

// ================ Utility Types ================

export interface ChainConfig {
  chainId: string;
  name: string;
  symbol: string;
  rpcUrl: string;
  explorer: string;
  faucet?: string;
  maxGasPrice: string;
  avgBlockTime: number; // seconds
}

export interface SessionKeyMetrics {
  activeSessionsCount: number;
  totalTransactionsToday: number;
  totalVolumeToday: string;
  averageSessionDuration: number; // hours
  securityIncidents: number;
  topOperations: Array<{
    operation: string;
    count: number;
    volume: string;
  }>;
}

// ================ Error Types ================

export class SessionKeyError extends Error {
  constructor(
    message: string,
    public code: string,
    public sessionKeyId?: string,
    public metadata?: Record<string, unknown>
  ) {
    super(message);
    this.name = "SessionKeyError";
  }
}

export class SecurityViolationError extends SessionKeyError {
  constructor(
    message: string,
    sessionKeyId: string,
    public violationType: string,
    metadata?: Record<string, unknown>
  ) {
    super(message, "SECURITY_VIOLATION", sessionKeyId, metadata);
    this.name = "SecurityViolationError";
  }
}

// ================ Repository Interfaces ================

export interface SessionKeyRepository {
  create(
    data: CreateSessionKeyRequest & {
      userId: string;
      encryptedPrivateKey: string;
      sessionPublicKey: string;
    }
  ): Promise<SessionKeyData>;
  findById(id: string): Promise<SessionKeyData | null>;
  findByUserId(
    userId: string,
    status?: SessionKeyStatus
  ): Promise<SessionKeyData[]>;
  findByWalletAddress(
    walletAddress: string,
    status?: SessionKeyStatus
  ): Promise<SessionKeyData[]>;
  update(id: string, data: Partial<SessionKeyData>): Promise<SessionKeyData>;
  revoke(id: string, reason?: string): Promise<void>;
  updateUsage(id: string, amount: string): Promise<void>;
  cleanup(): Promise<number>; // Clean up expired sessions
}

export interface SessionTransactionRepository {
  create(
    data: Omit<SessionTransaction, "id" | "createdAt">
  ): Promise<SessionTransaction>;
  findById(id: string): Promise<SessionTransaction | null>;
  findBySessionKeyId(
    sessionKeyId: string,
    limit?: number
  ): Promise<SessionTransaction[]>;
  updateStatus(
    id: string,
    status: TransactionStatus,
    metadata?: Record<string, unknown>
  ): Promise<void>;
  getUsageStats(
    sessionKeyId: string,
    timeframe?: "day" | "week" | "month"
  ): Promise<SessionUsageStats>;
}

export interface SessionEventRepository {
  create(data: Omit<SessionEvent, "id" | "createdAt">): Promise<SessionEvent>;
  findBySessionKeyId(
    sessionKeyId: string,
    eventType?: SessionEventType
  ): Promise<SessionEvent[]>;
  findSecurityEvents(
    severity?: string,
    limit?: number
  ): Promise<SessionEvent[]>;
}
