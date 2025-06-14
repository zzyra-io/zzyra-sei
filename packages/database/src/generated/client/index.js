Object.defineProperty(exports, "__esModule", { value: true });

const {
  PrismaClientKnownRequestError,
  PrismaClientUnknownRequestError,
  PrismaClientRustPanicError,
  PrismaClientInitializationError,
  PrismaClientValidationError,
  NotFoundError,
  getPrismaClient,
  sqltag,
  empty,
  join,
  raw,
  skip,
  Decimal,
  Debug,
  objectEnumValues,
  makeStrictEnum,
  Extensions,
  warnOnce,
  defineDmmfProperty,
  Public,
  getRuntime,
} = require("./runtime/library.js");

const Prisma = {};

exports.Prisma = Prisma;
exports.$Enums = {};

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2",
};

Prisma.PrismaClientKnownRequestError = PrismaClientKnownRequestError;
Prisma.PrismaClientUnknownRequestError = PrismaClientUnknownRequestError;
Prisma.PrismaClientRustPanicError = PrismaClientRustPanicError;
Prisma.PrismaClientInitializationError = PrismaClientInitializationError;
Prisma.PrismaClientValidationError = PrismaClientValidationError;
Prisma.NotFoundError = NotFoundError;
Prisma.Decimal = Decimal;

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = sqltag;
Prisma.empty = empty;
Prisma.join = join;
Prisma.raw = raw;
Prisma.validator = Public.validator;

/**
 * Extensions
 */
Prisma.getExtensionContext = Extensions.getExtensionContext;
Prisma.defineExtension = Extensions.defineExtension;

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull;
Prisma.JsonNull = objectEnumValues.instances.JsonNull;
Prisma.AnyNull = objectEnumValues.instances.AnyNull;

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull,
};

const path = require("path");

/**
 * Enums
 */
exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: "ReadUncommitted",
  ReadCommitted: "ReadCommitted",
  RepeatableRead: "RepeatableRead",
  Serializable: "Serializable",
});

exports.Prisma.UserScalarFieldEnum = {
  id: "id",
  email: "email",
  phone: "phone",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
};

exports.Prisma.ProfileScalarFieldEnum = {
  id: "id",
  email: "email",
  fullName: "fullName",
  avatarUrl: "avatarUrl",
  subscriptionTier: "subscriptionTier",
  subscriptionStatus: "subscriptionStatus",
  subscriptionExpiresAt: "subscriptionExpiresAt",
  monthlyExecutionQuota: "monthlyExecutionQuota",
  monthlyExecutionCount: "monthlyExecutionCount",
  stripeCustomerId: "stripeCustomerId",
  stripeSubscriptionId: "stripeSubscriptionId",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
  lastSeenAt: "lastSeenAt",
  monthlyExecutionsUsed: "monthlyExecutionsUsed",
  telegramChatId: "telegramChatId",
  discordWebhookUrl: "discordWebhookUrl",
};

exports.Prisma.UserWalletScalarFieldEnum = {
  id: "id",
  userId: "userId",
  chainId: "chainId",
  walletAddress: "walletAddress",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
  walletType: "walletType",
  chainType: "chainType",
  metadata: "metadata",
};

exports.Prisma.WorkflowTemplateScalarFieldEnum = {
  id: "id",
  name: "name",
  description: "description",
  category: "category",
  nodes: "nodes",
  edges: "edges",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
};

exports.Prisma.WorkflowScalarFieldEnum = {
  id: "id",
  userId: "userId",
  name: "name",
  description: "description",
  nodes: "nodes",
  edges: "edges",
  isPublic: "isPublic",
  tags: "tags",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
  definition: "definition",
  version: "version",
  createdBy: "createdBy",
};

exports.Prisma.WorkflowExecutionScalarFieldEnum = {
  id: "id",
  workflowId: "workflowId",
  userId: "userId",
  status: "status",
  input: "input",
  output: "output",
  startedAt: "startedAt",
  finishedAt: "finishedAt",
  error: "error",
  metadata: "metadata",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
  triggerType: "triggerType",
  triggerData: "triggerData",
  lockedBy: "lockedBy",
  logs: "logs",
};

exports.Prisma.NodeExecutionScalarFieldEnum = {
  id: "id",
  executionId: "executionId",
  nodeId: "nodeId",
  status: "status",
  outputData: "outputData",
  error: "error",
  startedAt: "startedAt",
  completedAt: "completedAt",
  durationMs: "durationMs",
  updatedAt: "updatedAt",
  retryCount: "retryCount",
  finishedAt: "finishedAt",
  output: "output",
};

exports.Prisma.NodeLogScalarFieldEnum = {
  id: "id",
  nodeExecutionId: "nodeExecutionId",
  level: "level",
  message: "message",
  createdAt: "createdAt",
  metadata: "metadata",
};

exports.Prisma.NodeInputScalarFieldEnum = {
  id: "id",
  executionId: "executionId",
  nodeId: "nodeId",
  inputData: "inputData",
  createdAt: "createdAt",
};

exports.Prisma.NodeOutputScalarFieldEnum = {
  id: "id",
  executionId: "executionId",
  nodeId: "nodeId",
  outputData: "outputData",
  createdAt: "createdAt",
};

exports.Prisma.ExecutionLogScalarFieldEnum = {
  id: "id",
  executionId: "executionId",
  level: "level",
  message: "message",
  timestamp: "timestamp",
  metadata: "metadata",
};

exports.Prisma.WorkflowPauseScalarFieldEnum = {
  id: "id",
  workflowId: "workflowId",
  executionId: "executionId",
  nodeId: "nodeId",
  reason: "reason",
  resumeData: "resumeData",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
};

exports.Prisma.BlockchainTransactionScalarFieldEnum = {
  id: "id",
  nodeId: "nodeId",
  executionId: "executionId",
  toAddress: "toAddress",
  value: "value",
  data: "data",
  chainId: "chainId",
  gasLimit: "gasLimit",
  gasUsed: "gasUsed",
  maxFeePerGas: "maxFeePerGas",
  maxPriorityFeePerGas: "maxPriorityFeePerGas",
  nonce: "nonce",
  status: "status",
  hash: "hash",
  txHash: "txHash",
  blockNumber: "blockNumber",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
  userId: "userId",
  walletAddress: "walletAddress",
  effectiveGasPrice: "effectiveGasPrice",
  error: "error",
  fromAddress: "fromAddress",
};

exports.Prisma.TransactionAttemptScalarFieldEnum = {
  id: "id",
  transactionId: "transactionId",
  txHash: "txHash",
  status: "status",
  error: "error",
  blockNumber: "blockNumber",
  gasUsed: "gasUsed",
  effectiveGasPrice: "effectiveGasPrice",
  createdAt: "createdAt",
};

exports.Prisma.AiBlockchainOperationScalarFieldEnum = {
  id: "id",
  userId: "userId",
  executionId: "executionId",
  nodeId: "nodeId",
  operationType: "operationType",
  blockchain: "blockchain",
  prompt: "prompt",
  result: "result",
  status: "status",
  error: "error",
  createdAt: "createdAt",
};

exports.Prisma.BlockExecutionScalarFieldEnum = {
  id: "id",
  executionId: "executionId",
  nodeId: "nodeId",
  blockType: "blockType",
  status: "status",
  input: "input",
  output: "output",
  error: "error",
  startTime: "startTime",
  endTime: "endTime",
};

exports.Prisma.BlockExecutionLogScalarFieldEnum = {
  id: "id",
  blockExecutionId: "blockExecutionId",
  level: "level",
  message: "message",
  timestamp: "timestamp",
};

exports.Prisma.BlockLibraryScalarFieldEnum = {
  id: "id",
  name: "name",
  description: "description",
  blockType: "blockType",
  category: "category",
  configuration: "configuration",
  blockData: "blockData",
  executionCode: "executionCode",
  userId: "userId",
  isPublic: "isPublic",
  isVerified: "isVerified",
  rating: "rating",
  usageCount: "usageCount",
  tags: "tags",
  version: "version",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
};

exports.Prisma.BlockLibraryRatingScalarFieldEnum = {
  id: "id",
  blockId: "blockId",
  userId: "userId",
  rating: "rating",
  comment: "comment",
  createdAt: "createdAt",
};

exports.Prisma.CustomBlockScalarFieldEnum = {
  id: "id",
  userId: "userId",
  name: "name",
  description: "description",
  blockType: "blockType",
  category: "category",
  code: "code",
  logic: "logic",
  logicType: "logicType",
  blockData: "blockData",
  tags: "tags",
  createdBy: "createdBy",
  icon: "icon",
  isPublic: "isPublic",
  isVerified: "isVerified",
  rating: "rating",
  usageCount: "usageCount",
  version: "version",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
  updatedBy: "updatedBy",
};

exports.Prisma.ExecutionQueueScalarFieldEnum = {
  id: "id",
  workflowId: "workflowId",
  executionId: "executionId",
  userId: "userId",
  priority: "priority",
  status: "status",
  payload: "payload",
  error: "error",
  retryCount: "retryCount",
  maxRetries: "maxRetries",
  lockedBy: "lockedBy",
  lockedUntil: "lockedUntil",
  scheduledFor: "scheduledFor",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
};

exports.Prisma.ExecutionNodeStatusScalarFieldEnum = {
  id: "id",
  nodeId: "nodeId",
  status: "status",
  lastHeartbeat: "lastHeartbeat",
  metadata: "metadata",
};

exports.Prisma.CircuitBreakerStateScalarFieldEnum = {
  id: "id",
  circuitId: "circuitId",
  state: "state",
  failureCount: "failureCount",
  successCount: "successCount",
  lastFailureTime: "lastFailureTime",
  lastSuccessTime: "lastSuccessTime",
  lastHalfOpenTime: "lastHalfOpenTime",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
};

exports.Prisma.NotificationScalarFieldEnum = {
  id: "id",
  userId: "userId",
  title: "title",
  message: "message",
  type: "type",
  read: "read",
  data: "data",
  createdAt: "createdAt",
};

exports.Prisma.NotificationPreferenceScalarFieldEnum = {
  id: "id",
  userId: "userId",
  emailEnabled: "emailEnabled",
  pushEnabled: "pushEnabled",
  webhookEnabled: "webhookEnabled",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
  telegramChatId: "telegramChatId",
  discordWebhookUrl: "discordWebhookUrl",
};

exports.Prisma.NotificationTemplateScalarFieldEnum = {
  id: "id",
  type: "type",
  title: "title",
  message: "message",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
};

exports.Prisma.NotificationLogScalarFieldEnum = {
  id: "id",
  userId: "userId",
  channel: "channel",
  status: "status",
  error: "error",
  notificationId: "notificationId",
  createdAt: "createdAt",
};

exports.Prisma.PricingTierScalarFieldEnum = {
  id: "id",
  name: "name",
  description: "description",
  priceMonthly: "priceMonthly",
  priceYearly: "priceYearly",
  workflowLimit: "workflowLimit",
  executionLimit: "executionLimit",
  features: "features",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
};

exports.Prisma.SubscriptionScalarFieldEnum = {
  id: "id",
  userId: "userId",
  tierId: "tierId",
  status: "status",
  currentPeriodStart: "currentPeriodStart",
  currentPeriodEnd: "currentPeriodEnd",
  cancelAtPeriodEnd: "cancelAtPeriodEnd",
  stripeSubscriptionId: "stripeSubscriptionId",
  stripePriceId: "stripePriceId",
  stripeCustomerId: "stripeCustomerId",
  canceledAt: "canceledAt",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
};

exports.Prisma.SubscriptionInvoiceScalarFieldEnum = {
  id: "id",
  subscriptionId: "subscriptionId",
  stripeInvoiceId: "stripeInvoiceId",
  amount: "amount",
  status: "status",
  paidAt: "paidAt",
  invoiceUrl: "invoiceUrl",
  createdAt: "createdAt",
};

exports.Prisma.TeamScalarFieldEnum = {
  id: "id",
  name: "name",
  description: "description",
  createdBy: "createdBy",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
};

exports.Prisma.TeamMemberScalarFieldEnum = {
  teamId: "teamId",
  userId: "userId",
  role: "role",
  joinedAt: "joinedAt",
};

exports.Prisma.AuditLogScalarFieldEnum = {
  id: "id",
  userId: "userId",
  action: "action",
  resource: "resource",
  resourceId: "resourceId",
  metadata: "metadata",
  createdAt: "createdAt",
};

exports.Prisma.UsageLogScalarFieldEnum = {
  id: "id",
  userId: "userId",
  resourceType: "resourceType",
  action: "action",
  quantity: "quantity",
  metadata: "metadata",
  createdAt: "createdAt",
};

exports.Prisma.WalletTransactionScalarFieldEnum = {
  id: "id",
  userId: "userId",
  walletAddress: "walletAddress",
  txHash: "txHash",
  chainId: "chainId",
  value: "value",
  status: "status",
  blockNumber: "blockNumber",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
};

exports.Prisma.SortOrder = {
  asc: "asc",
  desc: "desc",
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull,
};

exports.Prisma.QueryMode = {
  default: "default",
  insensitive: "insensitive",
};

exports.Prisma.NullsOrder = {
  first: "first",
  last: "last",
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull,
};
exports.WorkflowStatus = exports.$Enums.WorkflowStatus = {
  pending: "pending",
  running: "running",
  completed: "completed",
  failed: "failed",
  paused: "paused",
};

exports.LogLevel = exports.$Enums.LogLevel = {
  info: "info",
  error: "error",
  warn: "warn",
};

exports.BlockStatus = exports.$Enums.BlockStatus = {
  pending: "pending",
  running: "running",
  completed: "completed",
  failed: "failed",
};

exports.Prisma.ModelName = {
  User: "User",
  Profile: "Profile",
  UserWallet: "UserWallet",
  WorkflowTemplate: "WorkflowTemplate",
  Workflow: "Workflow",
  WorkflowExecution: "WorkflowExecution",
  NodeExecution: "NodeExecution",
  NodeLog: "NodeLog",
  NodeInput: "NodeInput",
  NodeOutput: "NodeOutput",
  ExecutionLog: "ExecutionLog",
  WorkflowPause: "WorkflowPause",
  BlockchainTransaction: "BlockchainTransaction",
  TransactionAttempt: "TransactionAttempt",
  AiBlockchainOperation: "AiBlockchainOperation",
  BlockExecution: "BlockExecution",
  BlockExecutionLog: "BlockExecutionLog",
  BlockLibrary: "BlockLibrary",
  BlockLibraryRating: "BlockLibraryRating",
  CustomBlock: "CustomBlock",
  ExecutionQueue: "ExecutionQueue",
  ExecutionNodeStatus: "ExecutionNodeStatus",
  CircuitBreakerState: "CircuitBreakerState",
  Notification: "Notification",
  NotificationPreference: "NotificationPreference",
  NotificationTemplate: "NotificationTemplate",
  NotificationLog: "NotificationLog",
  PricingTier: "PricingTier",
  Subscription: "Subscription",
  SubscriptionInvoice: "SubscriptionInvoice",
  Team: "Team",
  TeamMember: "TeamMember",
  AuditLog: "AuditLog",
  UsageLog: "UsageLog",
  WalletTransaction: "WalletTransaction",
};
/**
 * Create the Client
 */
const config = {
  generator: {
    name: "client",
    provider: {
      fromEnvVar: null,
      value: "prisma-client-js",
    },
    output: {
      value:
        "/Users/argahv/Documents/projects/personal/ai/zyra/packages/database/src/generated/client",
      fromEnvVar: null,
    },
    config: {
      engineType: "library",
    },
    binaryTargets: [
      {
        fromEnvVar: null,
        value: "darwin-arm64",
        native: true,
      },
    ],
    previewFeatures: [],
    sourceFilePath:
      "/Users/argahv/Documents/projects/personal/ai/zyra/packages/database/prisma/schema.prisma",
    isCustomOutput: true,
  },
  relativeEnvPaths: {
    rootEnvPath: null,
    schemaEnvPath: "../../../.env",
  },
  relativePath: "../../../prisma",
  clientVersion: "5.22.0",
  engineVersion: "605197351a3c8bdd595af2d2a9bc3025bca48ea2",
  datasourceNames: ["db"],
  activeProvider: "postgresql",
  postinstall: false,
  inlineDatasources: {
    db: {
      url: {
        fromEnvVar: "DATABASE_URL",
        value: null,
      },
    },
  },
  inlineSchema:
    '// Prisma schema for Zzyra platform\n// This schema represents a migration from Supabase to Prisma\n\ngenerator client {\n  provider = "prisma-client-js"\n  output   = "../src/generated/client"\n}\n\ndatasource db {\n  provider = "postgresql"\n  url      = env("DATABASE_URL")\n}\n\n// ================ Enums ================\n\nenum BlockStatus {\n  pending\n  running\n  completed\n  failed\n\n  @@map("block_status")\n}\n\nenum LogLevel {\n  info\n  error\n  warn\n\n  @@map("log_level")\n}\n\nenum WorkflowStatus {\n  pending\n  running\n  completed\n  failed\n  paused\n\n  @@map("workflow_status")\n}\n\n// ================ Authentication & Users ================\n\nmodel User {\n  id        String   @id @default(uuid())\n  email     String?  @unique\n  phone     String?  @unique\n  createdAt DateTime @default(now()) @map("created_at")\n  updatedAt DateTime @updatedAt @map("updated_at")\n\n  // Relations\n  profile                 Profile?\n  userWallets             UserWallet[]\n  workflows               Workflow[]\n  workflowExecutions      WorkflowExecution[]\n  notifications           Notification[]\n  subscription            Subscription?\n  teamMemberships         TeamMember[]\n  ownedTeams              Team[]                  @relation("TeamOwner")\n  notificationPreferences NotificationPreference?\n\n  @@map("users")\n}\n\nmodel Profile {\n  id                    String    @id\n  email                 String?\n  fullName              String?   @map("full_name")\n  avatarUrl             String?   @map("avatar_url")\n  subscriptionTier      String?   @default("free") @map("subscription_tier")\n  subscriptionStatus    String?   @default("inactive") @map("subscription_status")\n  subscriptionExpiresAt DateTime? @map("subscription_expires_at")\n  monthlyExecutionQuota Int?      @default(100) @map("monthly_execution_quota")\n  monthlyExecutionCount Int?      @default(0) @map("monthly_execution_count")\n  stripeCustomerId      String?   @map("stripe_customer_id")\n  stripeSubscriptionId  String?   @map("stripe_subscription_id")\n  createdAt             DateTime? @default(now()) @map("created_at")\n  updatedAt             DateTime? @default(now()) @map("updated_at")\n  lastSeenAt            DateTime? @default(now()) @map("last_seen_at")\n  monthlyExecutionsUsed Int       @default(0) @map("monthly_executions_used")\n  telegramChatId        String?   @map("telegram_chat_id")\n  discordWebhookUrl     String?   @map("discord_webhook_url")\n\n  // Relations\n  user User @relation(fields: [id], references: [id], onDelete: Cascade)\n\n  @@map("profiles")\n}\n\nmodel UserWallet {\n  id            String   @id @default(uuid())\n  userId        String   @map("user_id")\n  chainId       String   @map("chain_id")\n  walletAddress String   @map("wallet_address")\n  createdAt     DateTime @default(now()) @map("created_at")\n  updatedAt     DateTime @default(now()) @map("updated_at")\n  walletType    String?  @map("wallet_type")\n  chainType     String?  @map("chain_type")\n  metadata      Json?    @default("{}")\n\n  // Relations\n  user User @relation(fields: [userId], references: [id], onDelete: Cascade)\n\n  @@index([userId])\n  @@index([walletAddress])\n  @@map("user_wallets")\n}\n\n// ================ Workflows & Execution ================\n\nmodel WorkflowTemplate {\n  id          String    @id @default(uuid())\n  name        String\n  description String?\n  category    String?\n  nodes       Json?     @default("[]")\n  edges       Json?     @default("[]")\n  createdAt   DateTime? @default(now()) @map("created_at")\n  updatedAt   DateTime? @default(now()) @map("updated_at")\n\n  @@map("workflow_templates")\n}\n\nmodel Workflow {\n  id          String    @id @default(uuid())\n  userId      String    @map("user_id")\n  name        String\n  description String?\n  nodes       Json?     @default("[]")\n  edges       Json?     @default("[]")\n  isPublic    Boolean?  @default(false) @map("is_public")\n  tags        String[]  @default([])\n  createdAt   DateTime? @default(now()) @map("created_at")\n  updatedAt   DateTime? @default(now()) @map("updated_at")\n  definition  Json      @default("{}")\n  version     Int       @default(1)\n  createdBy   String?   @map("created_by")\n\n  // Relations\n  user       User                @relation(fields: [userId], references: [id], onDelete: Cascade)\n  executions WorkflowExecution[]\n  pauses     WorkflowPause[]\n\n  @@index([userId])\n  @@map("workflows")\n}\n\nmodel WorkflowExecution {\n  id          String         @id @default(uuid())\n  workflowId  String         @map("workflow_id")\n  userId      String         @map("user_id")\n  status      WorkflowStatus @default(pending)\n  input       Json?          @default("{}")\n  output      Json?\n  startedAt   DateTime       @default(now()) @map("started_at")\n  finishedAt  DateTime?      @map("finished_at")\n  error       String?\n  metadata    Json?          @default("{}")\n  createdAt   DateTime       @default(now()) @map("created_at")\n  updatedAt   DateTime       @default(now()) @map("updated_at")\n  triggerType String?        @map("trigger_type")\n  triggerData Json?          @map("trigger_data")\n  lockedBy    String?        @map("locked_by")\n  logs        Json?\n\n  // Relations\n  workflow               Workflow                @relation(fields: [workflowId], references: [id], onDelete: Cascade)\n  user                   User                    @relation(fields: [userId], references: [id], onDelete: Cascade)\n  nodeExecutions         NodeExecution[]\n  executionLogs          ExecutionLog[]\n  blockExecutions        BlockExecution[]\n  blockchainTransactions BlockchainTransaction[]\n  workflowPauses         WorkflowPause[]\n\n  @@index([workflowId])\n  @@index([userId])\n  @@index([status])\n  @@map("workflow_executions")\n}\n\nmodel NodeExecution {\n  id          String    @id @default(uuid())\n  executionId String    @map("execution_id")\n  nodeId      String    @map("node_id")\n  status      String\n  outputData  Json?     @map("output_data")\n  error       String?\n  startedAt   DateTime  @default(now()) @map("started_at")\n  completedAt DateTime  @default(now()) @map("completed_at")\n  durationMs  Int?      @map("duration_ms")\n  updatedAt   DateTime? @default(now()) @map("updated_at")\n  retryCount  Int?      @default(0) @map("retry_count")\n  finishedAt  DateTime? @map("finished_at")\n  output      Json?\n\n  // Relations\n  execution   WorkflowExecution @relation(fields: [executionId], references: [id], onDelete: Cascade)\n  logs        NodeLog[]\n  nodeInputs  NodeInput[]\n  nodeOutputs NodeOutput[]\n\n  @@unique([executionId, nodeId])\n  @@index([executionId])\n  @@index([nodeId])\n  @@map("node_executions")\n}\n\nmodel NodeLog {\n  id              String   @id @default(uuid())\n  nodeExecutionId String   @map("node_execution_id")\n  level           LogLevel\n  message         String\n  createdAt       DateTime @default(now()) @map("created_at")\n  metadata        Json?    @default("{}")\n\n  // Relations\n  nodeExecution NodeExecution @relation(fields: [nodeExecutionId], references: [id], onDelete: Cascade)\n\n  @@index([nodeExecutionId])\n  @@map("node_logs")\n}\n\nmodel NodeInput {\n  id          String    @id @default(uuid())\n  executionId String    @map("execution_id")\n  nodeId      String    @map("node_id")\n  inputData   Json?     @map("input_data")\n  createdAt   DateTime? @default(now()) @map("created_at")\n\n  // Relations\n  nodeExecution NodeExecution @relation(fields: [executionId, nodeId], references: [executionId, nodeId], onDelete: Cascade)\n\n  @@index([executionId])\n  @@index([nodeId])\n  @@map("node_inputs")\n}\n\nmodel NodeOutput {\n  id          String    @id @default(uuid())\n  executionId String    @map("execution_id")\n  nodeId      String    @map("node_id")\n  outputData  Json?     @map("output_data")\n  createdAt   DateTime? @default(now()) @map("created_at")\n\n  // Relations\n  nodeExecution NodeExecution @relation(fields: [executionId, nodeId], references: [executionId, nodeId], onDelete: Cascade)\n\n  @@index([executionId])\n  @@index([nodeId])\n  @@map("node_outputs")\n}\n\nmodel ExecutionLog {\n  id          String   @id @default(uuid())\n  executionId String   @map("execution_id")\n  level       LogLevel\n  message     String\n  timestamp   DateTime @default(now())\n  metadata    Json?    @default("{}")\n\n  // Relations\n  execution WorkflowExecution @relation(fields: [executionId], references: [id], onDelete: Cascade)\n\n  @@index([executionId])\n  @@map("execution_logs")\n}\n\nmodel WorkflowPause {\n  id          String   @id @default(uuid())\n  workflowId  String   @map("workflow_id")\n  executionId String   @map("execution_id")\n  nodeId      String   @map("node_id")\n  reason      String\n  resumeData  Json?    @map("resume_data")\n  createdAt   DateTime @default(now()) @map("created_at")\n  updatedAt   DateTime @default(now()) @map("updated_at")\n\n  // Relations\n  workflow  Workflow          @relation(fields: [workflowId], references: [id], onDelete: Cascade)\n  execution WorkflowExecution @relation(fields: [executionId], references: [id], onDelete: Cascade)\n\n  @@index([workflowId])\n  @@index([executionId])\n  @@map("workflow_pauses")\n}\n\n// ================ Blockchain & AI Integration ================\n\nmodel BlockchainTransaction {\n  id                   String   @id @default(uuid())\n  nodeId               String   @map("node_id")\n  executionId          String   @map("execution_id")\n  toAddress            String   @map("to_address")\n  value                String\n  data                 Json?\n  chainId              Int      @map("chain_id")\n  gasLimit             String?  @map("gas_limit")\n  gasUsed              String?  @map("gas_used")\n  maxFeePerGas         String?  @map("max_fee_per_gas")\n  maxPriorityFeePerGas String?  @map("max_priority_fee_per_gas")\n  nonce                Int?\n  status               String\n  hash                 String?\n  txHash               String?  @map("tx_hash")\n  blockNumber          Int?     @map("block_number")\n  createdAt            DateTime @default(now()) @map("created_at")\n  updatedAt            DateTime @default(now()) @map("updated_at")\n  userId               String?  @map("user_id")\n  walletAddress        String   @map("wallet_address")\n  effectiveGasPrice    String?  @map("effective_gas_price")\n  error                String?\n  fromAddress          String?  @map("from_address")\n\n  // Relations\n  execution           WorkflowExecution    @relation(fields: [executionId], references: [id], onDelete: Cascade)\n  transactionAttempts TransactionAttempt[]\n\n  @@index([executionId])\n  @@index([nodeId])\n  @@map("blockchain_transactions")\n}\n\nmodel TransactionAttempt {\n  id                String   @id @default(uuid())\n  transactionId     String   @map("transaction_id")\n  txHash            String?  @map("tx_hash")\n  status            String\n  error             String?\n  blockNumber       Int?     @map("block_number")\n  gasUsed           String?  @map("gas_used")\n  effectiveGasPrice String?  @map("effective_gas_price")\n  createdAt         DateTime @default(now()) @map("created_at")\n\n  // Relations\n  transaction BlockchainTransaction @relation(fields: [transactionId], references: [id], onDelete: Cascade)\n\n  @@index([transactionId])\n  @@map("transaction_attempts")\n}\n\nmodel AiBlockchainOperation {\n  id            String   @id @default(uuid())\n  userId        String   @map("user_id")\n  executionId   String   @map("execution_id")\n  nodeId        String   @map("node_id")\n  operationType String   @map("operation_type")\n  blockchain    String?\n  prompt        String?\n  result        Json?\n  status        String\n  error         String?\n  createdAt     DateTime @default(now()) @map("created_at")\n\n  @@index([userId])\n  @@index([executionId])\n  @@map("ai_blockchain_operations")\n}\n\n// ================ Block & Execution Models ================\n\nmodel BlockExecution {\n  id          String      @id @default(uuid())\n  executionId String      @map("execution_id")\n  nodeId      String      @map("node_id")\n  blockType   String      @map("block_type")\n  status      BlockStatus\n  input       Json?\n  output      Json?\n  error       String?\n  startTime   DateTime    @map("start_time")\n  endTime     DateTime?   @map("end_time")\n\n  // Relations\n  execution WorkflowExecution   @relation(fields: [executionId], references: [id], onDelete: Cascade)\n  logs      BlockExecutionLog[]\n\n  @@index([executionId])\n  @@index([nodeId])\n  @@map("block_executions")\n}\n\nmodel BlockExecutionLog {\n  id               String   @id @default(uuid())\n  blockExecutionId String   @map("block_execution_id")\n  level            LogLevel\n  message          String\n  timestamp        DateTime @default(now())\n\n  // Relations\n  blockExecution BlockExecution @relation(fields: [blockExecutionId], references: [id], onDelete: Cascade)\n\n  @@index([blockExecutionId])\n  @@map("block_execution_logs")\n}\n\nmodel BlockLibrary {\n  id            String               @id @default(uuid())\n  name          String\n  description   String\n  blockType     String               @map("block_type")\n  category      String?\n  configuration Json                 @default("{}")\n  blockData     Json?\n  executionCode String?\n  userId        String               @map("user_id")\n  isPublic      Boolean?             @default(false) @map("is_public")\n  isVerified    Boolean?             @map("is_verified")\n  rating        Float?\n  usageCount    Int?                 @map("usage_count")\n  tags          String[]             @default([])\n  version       String?\n  createdAt     DateTime?            @default(now()) @map("created_at")\n  updatedAt     DateTime?            @default(now()) @map("updated_at")\n  ratings       BlockLibraryRating[]\n\n  @@map("block_library")\n}\n\nmodel BlockLibraryRating {\n  id        String   @id @default(uuid())\n  blockId   String   @map("block_id")\n  userId    String   @map("user_id")\n  rating    Int\n  comment   String?\n  createdAt DateTime @default(now()) @map("created_at")\n\n  // Relations\n  block BlockLibrary @relation(fields: [blockId], references: [id], onDelete: Cascade)\n\n  @@unique([blockId, userId])\n  @@map("block_library_ratings")\n}\n\nmodel CustomBlock {\n  id          String    @id @default(uuid())\n  userId      String    @map("user_id")\n  name        String\n  description String?\n  blockType   String?   @map("block_type")\n  category    String\n  code        String\n  logic       String\n  logicType   String    @map("logic_type")\n  blockData   Json?     @default("{}") @map("block_data")\n  tags        Json      @default("[]")\n  createdBy   String?   @map("created_by")\n  icon        String?\n  isPublic    Boolean?  @default(false) @map("is_public")\n  isVerified  Boolean?  @map("is_verified")\n  rating      Float?\n  usageCount  Int?      @map("usage_count")\n  version     String?\n  createdAt   DateTime? @default(now()) @map("created_at")\n  updatedAt   DateTime? @default(now()) @map("updated_at")\n  updatedBy   String?   @map("updated_by")\n\n  @@index([userId])\n  @@map("custom_blocks")\n}\n\n// ================ Execution Queue & Status ================\n\nmodel ExecutionQueue {\n  id           String    @id @default(uuid())\n  workflowId   String    @map("workflow_id")\n  executionId  String    @map("execution_id")\n  userId       String?   @map("user_id")\n  priority     Int       @default(0)\n  status       String    @default("pending")\n  payload      Json?\n  error        String?\n  retryCount   Int       @default(0) @map("retry_count")\n  maxRetries   Int       @default(3) @map("max_retries")\n  lockedBy     String?   @map("locked_by")\n  lockedUntil  DateTime? @map("locked_until")\n  scheduledFor DateTime  @default(now()) @map("scheduled_for")\n  createdAt    DateTime  @default(now()) @map("created_at")\n  updatedAt    DateTime  @default(now()) @map("updated_at")\n\n  @@index([status])\n  @@index([userId])\n  @@map("execution_queue")\n}\n\nmodel ExecutionNodeStatus {\n  id            String   @id @default(uuid())\n  nodeId        String   @unique @map("node_id")\n  status        String   @default("idle")\n  lastHeartbeat DateTime @default(now()) @map("last_heartbeat")\n  metadata      Json?    @default("{}")\n\n  @@map("execution_node_status")\n}\n\nmodel CircuitBreakerState {\n  id               String    @id @default(uuid())\n  circuitId        String    @map("circuit_id")\n  state            String    @default("closed")\n  failureCount     Int       @default(0) @map("failure_count")\n  successCount     Int       @default(0) @map("success_count")\n  lastFailureTime  DateTime? @map("last_failure_time")\n  lastSuccessTime  DateTime? @map("last_success_time")\n  lastHalfOpenTime DateTime? @map("last_half_open_time")\n  createdAt        DateTime  @default(now()) @map("created_at")\n  updatedAt        DateTime  @default(now()) @map("updated_at")\n\n  @@map("circuit_breaker_state")\n}\n\n// ================ Notifications & Subscriptions ================\n\nmodel Notification {\n  id        String    @id @default(uuid())\n  userId    String    @map("user_id")\n  title     String\n  message   String\n  type      String\n  read      Boolean   @default(false)\n  data      Json?\n  createdAt DateTime? @default(now()) @map("created_at")\n\n  // Relations\n  user User @relation(fields: [userId], references: [id], onDelete: Cascade)\n\n  @@index([userId])\n  @@map("notifications")\n}\n\nmodel NotificationPreference {\n  id                String    @id @default(uuid())\n  userId            String    @unique @map("user_id")\n  emailEnabled      Boolean   @default(true) @map("email_enabled")\n  pushEnabled       Boolean   @default(true) @map("push_enabled")\n  webhookEnabled    Boolean   @default(true) @map("webhook_enabled")\n  createdAt         DateTime? @default(now()) @map("created_at")\n  updatedAt         DateTime? @default(now()) @map("updated_at")\n  telegramChatId    String?   @map("telegram_chat_id")\n  discordWebhookUrl String?   @map("discord_webhook_url")\n\n  // Relations\n  user User @relation(fields: [userId], references: [id], onDelete: Cascade)\n\n  @@map("notification_preferences")\n}\n\nmodel NotificationTemplate {\n  id        String   @id @default(uuid())\n  type      String\n  title     String\n  message   String\n  createdAt DateTime @default(now()) @map("created_at")\n  updatedAt DateTime @default(now()) @map("updated_at")\n\n  @@unique([type])\n  @@map("notification_templates")\n}\n\nmodel NotificationLog {\n  id             String   @id @default(uuid())\n  userId         String   @map("user_id")\n  channel        String\n  status         String\n  error          String?\n  notificationId String?  @map("notification_id")\n  createdAt      DateTime @default(now()) @map("created_at")\n\n  @@index([userId])\n  @@map("notification_logs")\n}\n\n// ================ Subscriptions & Billing ================\n\nmodel PricingTier {\n  id             String   @id @default(uuid())\n  name           String\n  description    String?\n  priceMonthly   Decimal  @map("price_monthly")\n  priceYearly    Decimal  @map("price_yearly")\n  workflowLimit  Int      @map("workflow_limit")\n  executionLimit Int      @map("execution_limit")\n  features       Json     @default("{}")\n  createdAt      DateTime @default(now()) @map("created_at")\n  updatedAt      DateTime @default(now()) @map("updated_at")\n\n  // Relations\n  subscriptions Subscription[]\n\n  @@map("pricing_tiers")\n}\n\nmodel Subscription {\n  id                   String    @id @default(uuid())\n  userId               String    @unique @map("user_id")\n  tierId               String    @map("tier_id")\n  status               String\n  currentPeriodStart   DateTime  @map("current_period_start")\n  currentPeriodEnd     DateTime  @map("current_period_end")\n  cancelAtPeriodEnd    Boolean   @default(false) @map("cancel_at_period_end")\n  stripeSubscriptionId String?   @map("stripe_subscription_id")\n  stripePriceId        String?   @map("stripe_price_id")\n  stripeCustomerId     String?   @map("stripe_customer_id")\n  canceledAt           DateTime? @map("canceled_at")\n  createdAt            DateTime  @default(now()) @map("created_at")\n  updatedAt            DateTime  @default(now()) @map("updated_at")\n\n  // Relations\n  user     User                  @relation(fields: [userId], references: [id], onDelete: Cascade)\n  tier     PricingTier           @relation(fields: [tierId], references: [id])\n  invoices SubscriptionInvoice[]\n\n  @@map("subscriptions")\n}\n\nmodel SubscriptionInvoice {\n  id              String    @id @default(uuid())\n  subscriptionId  String    @map("subscription_id")\n  stripeInvoiceId String?   @map("stripe_invoice_id")\n  amount          Decimal\n  status          String\n  paidAt          DateTime? @map("paid_at")\n  invoiceUrl      String?   @map("invoice_url")\n  createdAt       DateTime  @default(now()) @map("created_at")\n\n  // Relations\n  subscription Subscription @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)\n\n  @@index([subscriptionId])\n  @@map("subscription_invoices")\n}\n\n// ================ Teams ================\n\nmodel Team {\n  id          String    @id @default(uuid())\n  name        String\n  description String?\n  createdBy   String    @map("created_by")\n  createdAt   DateTime? @default(now()) @map("created_at")\n  updatedAt   DateTime? @default(now()) @map("updated_at")\n\n  // Relations\n  owner   User         @relation("TeamOwner", fields: [createdBy], references: [id], onDelete: Cascade)\n  members TeamMember[]\n\n  @@map("teams")\n}\n\nmodel TeamMember {\n  teamId   String    @map("team_id")\n  userId   String    @map("user_id")\n  role     String\n  joinedAt DateTime? @default(now()) @map("joined_at")\n\n  // Relations\n  team Team @relation(fields: [teamId], references: [id], onDelete: Cascade)\n  user User @relation(fields: [userId], references: [id], onDelete: Cascade)\n\n  @@id([teamId, userId])\n  @@map("team_members")\n}\n\n// ================ Auditing & Usage ================\n\nmodel AuditLog {\n  id         String   @id @default(uuid())\n  userId     String?  @map("user_id")\n  action     String\n  resource   String?\n  resourceId String?  @map("resource_id")\n  metadata   Json?\n  createdAt  DateTime @default(now()) @map("created_at")\n\n  @@index([userId])\n  @@index([action])\n  @@map("audit_logs")\n}\n\nmodel UsageLog {\n  id           String   @id @default(uuid())\n  userId       String   @map("user_id")\n  resourceType String   @map("resource_type")\n  action       String\n  quantity     Int      @default(1)\n  metadata     Json?\n  createdAt    DateTime @default(now()) @map("created_at")\n\n  @@index([userId])\n  @@index([resourceType])\n  @@map("usage_logs")\n}\n\n// ================ Wallet & Transaction ================\n\nmodel WalletTransaction {\n  id            String   @id @default(uuid())\n  userId        String   @map("user_id")\n  walletAddress String   @map("wallet_address")\n  txHash        String   @map("tx_hash")\n  chainId       Int      @map("chain_id")\n  value         String\n  status        String\n  blockNumber   Int?     @map("block_number")\n  createdAt     DateTime @default(now()) @map("created_at")\n  updatedAt     DateTime @default(now()) @map("updated_at")\n\n  @@index([userId])\n  @@index([walletAddress])\n  @@index([txHash])\n  @@map("wallet_transactions")\n}\n',
  inlineSchemaHash:
    "367946043464c2fb2f06d5acde8913eda9f4167d08ed79534ef4500d4c92614c",
  copyEngine: true,
};

const fs = require("fs");

config.dirname = __dirname;
if (!fs.existsSync(path.join(__dirname, "schema.prisma"))) {
  const alternativePaths = ["src/generated/client", "generated/client"];

  const alternativePath =
    alternativePaths.find((altPath) => {
      return fs.existsSync(path.join(process.cwd(), altPath, "schema.prisma"));
    }) ?? alternativePaths[0];

  config.dirname = path.join(process.cwd(), alternativePath);
  config.isBundled = true;
}

config.runtimeDataModel = JSON.parse(
  '{"models":{"User":{"dbName":"users","fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","default":{"name":"uuid(4)","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"email","kind":"scalar","isList":false,"isRequired":false,"isUnique":true,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"phone","kind":"scalar","isList":false,"isRequired":false,"isUnique":true,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","dbName":"created_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","dbName":"updated_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","isGenerated":false,"isUpdatedAt":true},{"name":"profile","kind":"object","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Profile","relationName":"ProfileToUser","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"userWallets","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"UserWallet","relationName":"UserToUserWallet","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"workflows","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Workflow","relationName":"UserToWorkflow","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"workflowExecutions","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"WorkflowExecution","relationName":"UserToWorkflowExecution","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"notifications","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Notification","relationName":"NotificationToUser","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"subscription","kind":"object","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Subscription","relationName":"SubscriptionToUser","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"teamMemberships","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"TeamMember","relationName":"TeamMemberToUser","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"ownedTeams","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Team","relationName":"TeamOwner","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"notificationPreferences","kind":"object","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"NotificationPreference","relationName":"NotificationPreferenceToUser","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"Profile":{"dbName":"profiles","fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":true,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"email","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"fullName","dbName":"full_name","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"avatarUrl","dbName":"avatar_url","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"subscriptionTier","dbName":"subscription_tier","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"String","default":"free","isGenerated":false,"isUpdatedAt":false},{"name":"subscriptionStatus","dbName":"subscription_status","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"String","default":"inactive","isGenerated":false,"isUpdatedAt":false},{"name":"subscriptionExpiresAt","dbName":"subscription_expires_at","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","isGenerated":false,"isUpdatedAt":false},{"name":"monthlyExecutionQuota","dbName":"monthly_execution_quota","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","default":100,"isGenerated":false,"isUpdatedAt":false},{"name":"monthlyExecutionCount","dbName":"monthly_execution_count","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","default":0,"isGenerated":false,"isUpdatedAt":false},{"name":"stripeCustomerId","dbName":"stripe_customer_id","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"stripeSubscriptionId","dbName":"stripe_subscription_id","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","dbName":"created_at","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","dbName":"updated_at","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"lastSeenAt","dbName":"last_seen_at","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"monthlyExecutionsUsed","dbName":"monthly_executions_used","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","default":0,"isGenerated":false,"isUpdatedAt":false},{"name":"telegramChatId","dbName":"telegram_chat_id","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"discordWebhookUrl","dbName":"discord_webhook_url","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"user","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"User","relationName":"ProfileToUser","relationFromFields":["id"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"UserWallet":{"dbName":"user_wallets","fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","default":{"name":"uuid(4)","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"userId","dbName":"user_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"chainId","dbName":"chain_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"walletAddress","dbName":"wallet_address","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","dbName":"created_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","dbName":"updated_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"walletType","dbName":"wallet_type","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"chainType","dbName":"chain_type","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"metadata","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Json","default":"{}","isGenerated":false,"isUpdatedAt":false},{"name":"user","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"User","relationName":"UserToUserWallet","relationFromFields":["userId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"WorkflowTemplate":{"dbName":"workflow_templates","fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","default":{"name":"uuid(4)","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"name","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"description","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"category","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"nodes","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Json","default":"[]","isGenerated":false,"isUpdatedAt":false},{"name":"edges","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Json","default":"[]","isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","dbName":"created_at","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","dbName":"updated_at","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"Workflow":{"dbName":"workflows","fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","default":{"name":"uuid(4)","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"userId","dbName":"user_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"name","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"description","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"nodes","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Json","default":"[]","isGenerated":false,"isUpdatedAt":false},{"name":"edges","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Json","default":"[]","isGenerated":false,"isUpdatedAt":false},{"name":"isPublic","dbName":"is_public","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Boolean","default":false,"isGenerated":false,"isUpdatedAt":false},{"name":"tags","kind":"scalar","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"String","default":[],"isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","dbName":"created_at","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","dbName":"updated_at","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"definition","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Json","default":"{}","isGenerated":false,"isUpdatedAt":false},{"name":"version","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","default":1,"isGenerated":false,"isUpdatedAt":false},{"name":"createdBy","dbName":"created_by","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"user","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"User","relationName":"UserToWorkflow","relationFromFields":["userId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false},{"name":"executions","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"WorkflowExecution","relationName":"WorkflowToWorkflowExecution","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"pauses","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"WorkflowPause","relationName":"WorkflowToWorkflowPause","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"WorkflowExecution":{"dbName":"workflow_executions","fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","default":{"name":"uuid(4)","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"workflowId","dbName":"workflow_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"userId","dbName":"user_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"status","kind":"enum","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"WorkflowStatus","default":"pending","isGenerated":false,"isUpdatedAt":false},{"name":"input","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Json","default":"{}","isGenerated":false,"isUpdatedAt":false},{"name":"output","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Json","isGenerated":false,"isUpdatedAt":false},{"name":"startedAt","dbName":"started_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"finishedAt","dbName":"finished_at","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","isGenerated":false,"isUpdatedAt":false},{"name":"error","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"metadata","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Json","default":"{}","isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","dbName":"created_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","dbName":"updated_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"triggerType","dbName":"trigger_type","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"triggerData","dbName":"trigger_data","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Json","isGenerated":false,"isUpdatedAt":false},{"name":"lockedBy","dbName":"locked_by","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"logs","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Json","isGenerated":false,"isUpdatedAt":false},{"name":"workflow","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Workflow","relationName":"WorkflowToWorkflowExecution","relationFromFields":["workflowId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false},{"name":"user","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"User","relationName":"UserToWorkflowExecution","relationFromFields":["userId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false},{"name":"nodeExecutions","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"NodeExecution","relationName":"NodeExecutionToWorkflowExecution","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"executionLogs","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"ExecutionLog","relationName":"ExecutionLogToWorkflowExecution","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"blockExecutions","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"BlockExecution","relationName":"BlockExecutionToWorkflowExecution","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"blockchainTransactions","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"BlockchainTransaction","relationName":"BlockchainTransactionToWorkflowExecution","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"workflowPauses","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"WorkflowPause","relationName":"WorkflowExecutionToWorkflowPause","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"NodeExecution":{"dbName":"node_executions","fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","default":{"name":"uuid(4)","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"executionId","dbName":"execution_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"nodeId","dbName":"node_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"status","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"outputData","dbName":"output_data","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Json","isGenerated":false,"isUpdatedAt":false},{"name":"error","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"startedAt","dbName":"started_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"completedAt","dbName":"completed_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"durationMs","dbName":"duration_ms","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Int","isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","dbName":"updated_at","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"retryCount","dbName":"retry_count","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","default":0,"isGenerated":false,"isUpdatedAt":false},{"name":"finishedAt","dbName":"finished_at","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","isGenerated":false,"isUpdatedAt":false},{"name":"output","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Json","isGenerated":false,"isUpdatedAt":false},{"name":"execution","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"WorkflowExecution","relationName":"NodeExecutionToWorkflowExecution","relationFromFields":["executionId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false},{"name":"logs","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"NodeLog","relationName":"NodeExecutionToNodeLog","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"nodeInputs","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"NodeInput","relationName":"NodeExecutionToNodeInput","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"nodeOutputs","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"NodeOutput","relationName":"NodeExecutionToNodeOutput","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[["executionId","nodeId"]],"uniqueIndexes":[{"name":null,"fields":["executionId","nodeId"]}],"isGenerated":false},"NodeLog":{"dbName":"node_logs","fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","default":{"name":"uuid(4)","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"nodeExecutionId","dbName":"node_execution_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"level","kind":"enum","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"LogLevel","isGenerated":false,"isUpdatedAt":false},{"name":"message","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","dbName":"created_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"metadata","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Json","default":"{}","isGenerated":false,"isUpdatedAt":false},{"name":"nodeExecution","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"NodeExecution","relationName":"NodeExecutionToNodeLog","relationFromFields":["nodeExecutionId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"NodeInput":{"dbName":"node_inputs","fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","default":{"name":"uuid(4)","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"executionId","dbName":"execution_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"nodeId","dbName":"node_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"inputData","dbName":"input_data","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Json","isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","dbName":"created_at","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"nodeExecution","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"NodeExecution","relationName":"NodeExecutionToNodeInput","relationFromFields":["executionId","nodeId"],"relationToFields":["executionId","nodeId"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"NodeOutput":{"dbName":"node_outputs","fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","default":{"name":"uuid(4)","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"executionId","dbName":"execution_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"nodeId","dbName":"node_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"outputData","dbName":"output_data","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Json","isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","dbName":"created_at","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"nodeExecution","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"NodeExecution","relationName":"NodeExecutionToNodeOutput","relationFromFields":["executionId","nodeId"],"relationToFields":["executionId","nodeId"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"ExecutionLog":{"dbName":"execution_logs","fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","default":{"name":"uuid(4)","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"executionId","dbName":"execution_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"level","kind":"enum","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"LogLevel","isGenerated":false,"isUpdatedAt":false},{"name":"message","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"timestamp","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"metadata","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Json","default":"{}","isGenerated":false,"isUpdatedAt":false},{"name":"execution","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"WorkflowExecution","relationName":"ExecutionLogToWorkflowExecution","relationFromFields":["executionId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"WorkflowPause":{"dbName":"workflow_pauses","fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","default":{"name":"uuid(4)","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"workflowId","dbName":"workflow_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"executionId","dbName":"execution_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"nodeId","dbName":"node_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"reason","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"resumeData","dbName":"resume_data","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Json","isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","dbName":"created_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","dbName":"updated_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"workflow","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Workflow","relationName":"WorkflowToWorkflowPause","relationFromFields":["workflowId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false},{"name":"execution","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"WorkflowExecution","relationName":"WorkflowExecutionToWorkflowPause","relationFromFields":["executionId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"BlockchainTransaction":{"dbName":"blockchain_transactions","fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","default":{"name":"uuid(4)","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"nodeId","dbName":"node_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"executionId","dbName":"execution_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"toAddress","dbName":"to_address","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"value","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"data","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Json","isGenerated":false,"isUpdatedAt":false},{"name":"chainId","dbName":"chain_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Int","isGenerated":false,"isUpdatedAt":false},{"name":"gasLimit","dbName":"gas_limit","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"gasUsed","dbName":"gas_used","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"maxFeePerGas","dbName":"max_fee_per_gas","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"maxPriorityFeePerGas","dbName":"max_priority_fee_per_gas","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"nonce","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Int","isGenerated":false,"isUpdatedAt":false},{"name":"status","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"hash","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"txHash","dbName":"tx_hash","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"blockNumber","dbName":"block_number","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Int","isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","dbName":"created_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","dbName":"updated_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"userId","dbName":"user_id","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"walletAddress","dbName":"wallet_address","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"effectiveGasPrice","dbName":"effective_gas_price","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"error","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"fromAddress","dbName":"from_address","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"execution","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"WorkflowExecution","relationName":"BlockchainTransactionToWorkflowExecution","relationFromFields":["executionId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false},{"name":"transactionAttempts","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"TransactionAttempt","relationName":"BlockchainTransactionToTransactionAttempt","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"TransactionAttempt":{"dbName":"transaction_attempts","fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","default":{"name":"uuid(4)","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"transactionId","dbName":"transaction_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"txHash","dbName":"tx_hash","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"status","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"error","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"blockNumber","dbName":"block_number","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Int","isGenerated":false,"isUpdatedAt":false},{"name":"gasUsed","dbName":"gas_used","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"effectiveGasPrice","dbName":"effective_gas_price","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","dbName":"created_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"transaction","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"BlockchainTransaction","relationName":"BlockchainTransactionToTransactionAttempt","relationFromFields":["transactionId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"AiBlockchainOperation":{"dbName":"ai_blockchain_operations","fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","default":{"name":"uuid(4)","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"userId","dbName":"user_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"executionId","dbName":"execution_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"nodeId","dbName":"node_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"operationType","dbName":"operation_type","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"blockchain","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"prompt","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"result","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Json","isGenerated":false,"isUpdatedAt":false},{"name":"status","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"error","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","dbName":"created_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"BlockExecution":{"dbName":"block_executions","fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","default":{"name":"uuid(4)","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"executionId","dbName":"execution_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"nodeId","dbName":"node_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"blockType","dbName":"block_type","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"status","kind":"enum","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"BlockStatus","isGenerated":false,"isUpdatedAt":false},{"name":"input","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Json","isGenerated":false,"isUpdatedAt":false},{"name":"output","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Json","isGenerated":false,"isUpdatedAt":false},{"name":"error","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"startTime","dbName":"start_time","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","isGenerated":false,"isUpdatedAt":false},{"name":"endTime","dbName":"end_time","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","isGenerated":false,"isUpdatedAt":false},{"name":"execution","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"WorkflowExecution","relationName":"BlockExecutionToWorkflowExecution","relationFromFields":["executionId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false},{"name":"logs","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"BlockExecutionLog","relationName":"BlockExecutionToBlockExecutionLog","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"BlockExecutionLog":{"dbName":"block_execution_logs","fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","default":{"name":"uuid(4)","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"blockExecutionId","dbName":"block_execution_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"level","kind":"enum","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"LogLevel","isGenerated":false,"isUpdatedAt":false},{"name":"message","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"timestamp","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"blockExecution","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"BlockExecution","relationName":"BlockExecutionToBlockExecutionLog","relationFromFields":["blockExecutionId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"BlockLibrary":{"dbName":"block_library","fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","default":{"name":"uuid(4)","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"name","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"description","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"blockType","dbName":"block_type","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"category","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"configuration","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Json","default":"{}","isGenerated":false,"isUpdatedAt":false},{"name":"blockData","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Json","isGenerated":false,"isUpdatedAt":false},{"name":"executionCode","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"userId","dbName":"user_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"isPublic","dbName":"is_public","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Boolean","default":false,"isGenerated":false,"isUpdatedAt":false},{"name":"isVerified","dbName":"is_verified","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Boolean","isGenerated":false,"isUpdatedAt":false},{"name":"rating","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Float","isGenerated":false,"isUpdatedAt":false},{"name":"usageCount","dbName":"usage_count","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Int","isGenerated":false,"isUpdatedAt":false},{"name":"tags","kind":"scalar","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"String","default":[],"isGenerated":false,"isUpdatedAt":false},{"name":"version","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","dbName":"created_at","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","dbName":"updated_at","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"ratings","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"BlockLibraryRating","relationName":"BlockLibraryToBlockLibraryRating","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"BlockLibraryRating":{"dbName":"block_library_ratings","fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","default":{"name":"uuid(4)","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"blockId","dbName":"block_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"userId","dbName":"user_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"rating","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Int","isGenerated":false,"isUpdatedAt":false},{"name":"comment","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","dbName":"created_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"block","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"BlockLibrary","relationName":"BlockLibraryToBlockLibraryRating","relationFromFields":["blockId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[["blockId","userId"]],"uniqueIndexes":[{"name":null,"fields":["blockId","userId"]}],"isGenerated":false},"CustomBlock":{"dbName":"custom_blocks","fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","default":{"name":"uuid(4)","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"userId","dbName":"user_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"name","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"description","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"blockType","dbName":"block_type","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"category","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"code","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"logic","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"logicType","dbName":"logic_type","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"blockData","dbName":"block_data","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Json","default":"{}","isGenerated":false,"isUpdatedAt":false},{"name":"tags","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Json","default":"[]","isGenerated":false,"isUpdatedAt":false},{"name":"createdBy","dbName":"created_by","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"icon","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"isPublic","dbName":"is_public","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Boolean","default":false,"isGenerated":false,"isUpdatedAt":false},{"name":"isVerified","dbName":"is_verified","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Boolean","isGenerated":false,"isUpdatedAt":false},{"name":"rating","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Float","isGenerated":false,"isUpdatedAt":false},{"name":"usageCount","dbName":"usage_count","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Int","isGenerated":false,"isUpdatedAt":false},{"name":"version","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","dbName":"created_at","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","dbName":"updated_at","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedBy","dbName":"updated_by","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"ExecutionQueue":{"dbName":"execution_queue","fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","default":{"name":"uuid(4)","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"workflowId","dbName":"workflow_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"executionId","dbName":"execution_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"userId","dbName":"user_id","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"priority","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","default":0,"isGenerated":false,"isUpdatedAt":false},{"name":"status","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"String","default":"pending","isGenerated":false,"isUpdatedAt":false},{"name":"payload","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Json","isGenerated":false,"isUpdatedAt":false},{"name":"error","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"retryCount","dbName":"retry_count","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","default":0,"isGenerated":false,"isUpdatedAt":false},{"name":"maxRetries","dbName":"max_retries","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","default":3,"isGenerated":false,"isUpdatedAt":false},{"name":"lockedBy","dbName":"locked_by","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"lockedUntil","dbName":"locked_until","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","isGenerated":false,"isUpdatedAt":false},{"name":"scheduledFor","dbName":"scheduled_for","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","dbName":"created_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","dbName":"updated_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"ExecutionNodeStatus":{"dbName":"execution_node_status","fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","default":{"name":"uuid(4)","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"nodeId","dbName":"node_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":true,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"status","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"String","default":"idle","isGenerated":false,"isUpdatedAt":false},{"name":"lastHeartbeat","dbName":"last_heartbeat","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"metadata","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Json","default":"{}","isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"CircuitBreakerState":{"dbName":"circuit_breaker_state","fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","default":{"name":"uuid(4)","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"circuitId","dbName":"circuit_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"state","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"String","default":"closed","isGenerated":false,"isUpdatedAt":false},{"name":"failureCount","dbName":"failure_count","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","default":0,"isGenerated":false,"isUpdatedAt":false},{"name":"successCount","dbName":"success_count","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","default":0,"isGenerated":false,"isUpdatedAt":false},{"name":"lastFailureTime","dbName":"last_failure_time","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","isGenerated":false,"isUpdatedAt":false},{"name":"lastSuccessTime","dbName":"last_success_time","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","isGenerated":false,"isUpdatedAt":false},{"name":"lastHalfOpenTime","dbName":"last_half_open_time","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","dbName":"created_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","dbName":"updated_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"Notification":{"dbName":"notifications","fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","default":{"name":"uuid(4)","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"userId","dbName":"user_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"title","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"message","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"type","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"read","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Boolean","default":false,"isGenerated":false,"isUpdatedAt":false},{"name":"data","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Json","isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","dbName":"created_at","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"user","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"User","relationName":"NotificationToUser","relationFromFields":["userId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"NotificationPreference":{"dbName":"notification_preferences","fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","default":{"name":"uuid(4)","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"userId","dbName":"user_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":true,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"emailEnabled","dbName":"email_enabled","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Boolean","default":true,"isGenerated":false,"isUpdatedAt":false},{"name":"pushEnabled","dbName":"push_enabled","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Boolean","default":true,"isGenerated":false,"isUpdatedAt":false},{"name":"webhookEnabled","dbName":"webhook_enabled","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Boolean","default":true,"isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","dbName":"created_at","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","dbName":"updated_at","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"telegramChatId","dbName":"telegram_chat_id","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"discordWebhookUrl","dbName":"discord_webhook_url","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"user","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"User","relationName":"NotificationPreferenceToUser","relationFromFields":["userId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"NotificationTemplate":{"dbName":"notification_templates","fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","default":{"name":"uuid(4)","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"type","kind":"scalar","isList":false,"isRequired":true,"isUnique":true,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"title","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"message","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","dbName":"created_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","dbName":"updated_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[["type"]],"uniqueIndexes":[{"name":null,"fields":["type"]}],"isGenerated":false},"NotificationLog":{"dbName":"notification_logs","fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","default":{"name":"uuid(4)","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"userId","dbName":"user_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"channel","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"status","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"error","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"notificationId","dbName":"notification_id","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","dbName":"created_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"PricingTier":{"dbName":"pricing_tiers","fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","default":{"name":"uuid(4)","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"name","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"description","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"priceMonthly","dbName":"price_monthly","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Decimal","isGenerated":false,"isUpdatedAt":false},{"name":"priceYearly","dbName":"price_yearly","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Decimal","isGenerated":false,"isUpdatedAt":false},{"name":"workflowLimit","dbName":"workflow_limit","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Int","isGenerated":false,"isUpdatedAt":false},{"name":"executionLimit","dbName":"execution_limit","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Int","isGenerated":false,"isUpdatedAt":false},{"name":"features","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Json","default":"{}","isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","dbName":"created_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","dbName":"updated_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"subscriptions","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Subscription","relationName":"PricingTierToSubscription","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"Subscription":{"dbName":"subscriptions","fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","default":{"name":"uuid(4)","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"userId","dbName":"user_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":true,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"tierId","dbName":"tier_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"status","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"currentPeriodStart","dbName":"current_period_start","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","isGenerated":false,"isUpdatedAt":false},{"name":"currentPeriodEnd","dbName":"current_period_end","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","isGenerated":false,"isUpdatedAt":false},{"name":"cancelAtPeriodEnd","dbName":"cancel_at_period_end","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Boolean","default":false,"isGenerated":false,"isUpdatedAt":false},{"name":"stripeSubscriptionId","dbName":"stripe_subscription_id","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"stripePriceId","dbName":"stripe_price_id","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"stripeCustomerId","dbName":"stripe_customer_id","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"canceledAt","dbName":"canceled_at","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","dbName":"created_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","dbName":"updated_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"user","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"User","relationName":"SubscriptionToUser","relationFromFields":["userId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false},{"name":"tier","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"PricingTier","relationName":"PricingTierToSubscription","relationFromFields":["tierId"],"relationToFields":["id"],"isGenerated":false,"isUpdatedAt":false},{"name":"invoices","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"SubscriptionInvoice","relationName":"SubscriptionToSubscriptionInvoice","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"SubscriptionInvoice":{"dbName":"subscription_invoices","fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","default":{"name":"uuid(4)","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"subscriptionId","dbName":"subscription_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"stripeInvoiceId","dbName":"stripe_invoice_id","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"amount","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Decimal","isGenerated":false,"isUpdatedAt":false},{"name":"status","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"paidAt","dbName":"paid_at","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","isGenerated":false,"isUpdatedAt":false},{"name":"invoiceUrl","dbName":"invoice_url","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","dbName":"created_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"subscription","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Subscription","relationName":"SubscriptionToSubscriptionInvoice","relationFromFields":["subscriptionId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"Team":{"dbName":"teams","fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","default":{"name":"uuid(4)","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"name","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"description","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"createdBy","dbName":"created_by","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","dbName":"created_at","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","dbName":"updated_at","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"owner","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"User","relationName":"TeamOwner","relationFromFields":["createdBy"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false},{"name":"members","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"TeamMember","relationName":"TeamToTeamMember","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"TeamMember":{"dbName":"team_members","fields":[{"name":"teamId","dbName":"team_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"userId","dbName":"user_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"role","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"joinedAt","dbName":"joined_at","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"team","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Team","relationName":"TeamToTeamMember","relationFromFields":["teamId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false},{"name":"user","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"User","relationName":"TeamMemberToUser","relationFromFields":["userId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false}],"primaryKey":{"name":null,"fields":["teamId","userId"]},"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"AuditLog":{"dbName":"audit_logs","fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","default":{"name":"uuid(4)","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"userId","dbName":"user_id","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"action","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"resource","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"resourceId","dbName":"resource_id","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"metadata","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Json","isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","dbName":"created_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"UsageLog":{"dbName":"usage_logs","fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","default":{"name":"uuid(4)","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"userId","dbName":"user_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"resourceType","dbName":"resource_type","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"action","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"quantity","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","default":1,"isGenerated":false,"isUpdatedAt":false},{"name":"metadata","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Json","isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","dbName":"created_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"WalletTransaction":{"dbName":"wallet_transactions","fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","default":{"name":"uuid(4)","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"userId","dbName":"user_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"walletAddress","dbName":"wallet_address","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"txHash","dbName":"tx_hash","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"chainId","dbName":"chain_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Int","isGenerated":false,"isUpdatedAt":false},{"name":"value","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"status","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"blockNumber","dbName":"block_number","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Int","isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","dbName":"created_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","dbName":"updated_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false}},"enums":{"BlockStatus":{"values":[{"name":"pending","dbName":null},{"name":"running","dbName":null},{"name":"completed","dbName":null},{"name":"failed","dbName":null}],"dbName":"block_status"},"LogLevel":{"values":[{"name":"info","dbName":null},{"name":"error","dbName":null},{"name":"warn","dbName":null}],"dbName":"log_level"},"WorkflowStatus":{"values":[{"name":"pending","dbName":null},{"name":"running","dbName":null},{"name":"completed","dbName":null},{"name":"failed","dbName":null},{"name":"paused","dbName":null}],"dbName":"workflow_status"}},"types":{}}'
);
defineDmmfProperty(exports.Prisma, config.runtimeDataModel);
config.engineWasm = undefined;

const { warnEnvConflicts } = require("./runtime/library.js");

warnEnvConflicts({
  rootEnvPath:
    config.relativeEnvPaths.rootEnvPath &&
    path.resolve(config.dirname, config.relativeEnvPaths.rootEnvPath),
  schemaEnvPath:
    config.relativeEnvPaths.schemaEnvPath &&
    path.resolve(config.dirname, config.relativeEnvPaths.schemaEnvPath),
});

const PrismaClient = getPrismaClient(config);
exports.PrismaClient = PrismaClient;
Object.assign(exports, Prisma);

// file annotations for bundling tools to include these files
path.join(__dirname, "libquery_engine-darwin-arm64.dylib.node");
path.join(
  process.cwd(),
  "src/generated/client/libquery_engine-darwin-arm64.dylib.node"
);
// file annotations for bundling tools to include these files
path.join(__dirname, "schema.prisma");
path.join(process.cwd(), "src/generated/client/schema.prisma");
