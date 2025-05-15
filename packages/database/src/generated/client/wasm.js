
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  email: 'email',
  phone: 'phone',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ProfileScalarFieldEnum = {
  id: 'id',
  email: 'email',
  fullName: 'fullName',
  avatarUrl: 'avatarUrl',
  subscriptionTier: 'subscriptionTier',
  subscriptionStatus: 'subscriptionStatus',
  subscriptionExpiresAt: 'subscriptionExpiresAt',
  monthlyExecutionQuota: 'monthlyExecutionQuota',
  monthlyExecutionCount: 'monthlyExecutionCount',
  stripeCustomerId: 'stripeCustomerId',
  stripeSubscriptionId: 'stripeSubscriptionId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  lastSeenAt: 'lastSeenAt',
  monthlyExecutionsUsed: 'monthlyExecutionsUsed',
  telegramChatId: 'telegramChatId',
  discordWebhookUrl: 'discordWebhookUrl'
};

exports.Prisma.UserWalletScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  chainId: 'chainId',
  walletAddress: 'walletAddress',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  walletType: 'walletType',
  chainType: 'chainType',
  metadata: 'metadata'
};

exports.Prisma.WorkflowTemplateScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  category: 'category',
  nodes: 'nodes',
  edges: 'edges',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.WorkflowScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  name: 'name',
  description: 'description',
  nodes: 'nodes',
  edges: 'edges',
  isPublic: 'isPublic',
  tags: 'tags',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  definition: 'definition',
  version: 'version',
  createdBy: 'createdBy'
};

exports.Prisma.WorkflowExecutionScalarFieldEnum = {
  id: 'id',
  workflowId: 'workflowId',
  userId: 'userId',
  status: 'status',
  input: 'input',
  output: 'output',
  startedAt: 'startedAt',
  finishedAt: 'finishedAt',
  error: 'error',
  metadata: 'metadata',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  triggerType: 'triggerType',
  triggerData: 'triggerData',
  lockedBy: 'lockedBy',
  logs: 'logs'
};

exports.Prisma.NodeExecutionScalarFieldEnum = {
  id: 'id',
  executionId: 'executionId',
  nodeId: 'nodeId',
  status: 'status',
  outputData: 'outputData',
  error: 'error',
  startedAt: 'startedAt',
  completedAt: 'completedAt',
  durationMs: 'durationMs',
  updatedAt: 'updatedAt',
  retryCount: 'retryCount',
  finishedAt: 'finishedAt',
  output: 'output'
};

exports.Prisma.NodeLogScalarFieldEnum = {
  id: 'id',
  nodeExecutionId: 'nodeExecutionId',
  level: 'level',
  message: 'message',
  createdAt: 'createdAt',
  metadata: 'metadata'
};

exports.Prisma.NodeInputScalarFieldEnum = {
  id: 'id',
  executionId: 'executionId',
  nodeId: 'nodeId',
  inputData: 'inputData',
  createdAt: 'createdAt'
};

exports.Prisma.NodeOutputScalarFieldEnum = {
  id: 'id',
  executionId: 'executionId',
  nodeId: 'nodeId',
  outputData: 'outputData',
  createdAt: 'createdAt'
};

exports.Prisma.ExecutionLogScalarFieldEnum = {
  id: 'id',
  executionId: 'executionId',
  level: 'level',
  message: 'message',
  timestamp: 'timestamp',
  metadata: 'metadata'
};

exports.Prisma.WorkflowPauseScalarFieldEnum = {
  id: 'id',
  workflowId: 'workflowId',
  executionId: 'executionId',
  nodeId: 'nodeId',
  reason: 'reason',
  resumeData: 'resumeData',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BlockchainTransactionScalarFieldEnum = {
  id: 'id',
  nodeId: 'nodeId',
  executionId: 'executionId',
  toAddress: 'toAddress',
  value: 'value',
  data: 'data',
  chainId: 'chainId',
  gasLimit: 'gasLimit',
  gasUsed: 'gasUsed',
  maxFeePerGas: 'maxFeePerGas',
  maxPriorityFeePerGas: 'maxPriorityFeePerGas',
  nonce: 'nonce',
  status: 'status',
  hash: 'hash',
  txHash: 'txHash',
  blockNumber: 'blockNumber',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  userId: 'userId',
  walletAddress: 'walletAddress',
  effectiveGasPrice: 'effectiveGasPrice',
  error: 'error',
  fromAddress: 'fromAddress'
};

exports.Prisma.TransactionAttemptScalarFieldEnum = {
  id: 'id',
  transactionId: 'transactionId',
  txHash: 'txHash',
  status: 'status',
  error: 'error',
  blockNumber: 'blockNumber',
  gasUsed: 'gasUsed',
  effectiveGasPrice: 'effectiveGasPrice',
  createdAt: 'createdAt'
};

exports.Prisma.AiBlockchainOperationScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  executionId: 'executionId',
  nodeId: 'nodeId',
  operationType: 'operationType',
  blockchain: 'blockchain',
  prompt: 'prompt',
  result: 'result',
  status: 'status',
  error: 'error',
  createdAt: 'createdAt'
};

exports.Prisma.BlockExecutionScalarFieldEnum = {
  id: 'id',
  executionId: 'executionId',
  nodeId: 'nodeId',
  blockType: 'blockType',
  status: 'status',
  input: 'input',
  output: 'output',
  error: 'error',
  startTime: 'startTime',
  endTime: 'endTime'
};

exports.Prisma.BlockExecutionLogScalarFieldEnum = {
  id: 'id',
  blockExecutionId: 'blockExecutionId',
  level: 'level',
  message: 'message',
  timestamp: 'timestamp'
};

exports.Prisma.BlockLibraryScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  blockType: 'blockType',
  category: 'category',
  configuration: 'configuration',
  blockData: 'blockData',
  executionCode: 'executionCode',
  userId: 'userId',
  isPublic: 'isPublic',
  isVerified: 'isVerified',
  rating: 'rating',
  usageCount: 'usageCount',
  tags: 'tags',
  version: 'version',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BlockLibraryRatingScalarFieldEnum = {
  id: 'id',
  blockId: 'blockId',
  userId: 'userId',
  rating: 'rating',
  comment: 'comment',
  createdAt: 'createdAt'
};

exports.Prisma.CustomBlockScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  name: 'name',
  description: 'description',
  blockType: 'blockType',
  category: 'category',
  code: 'code',
  logic: 'logic',
  logicType: 'logicType',
  blockData: 'blockData',
  tags: 'tags',
  createdBy: 'createdBy',
  icon: 'icon',
  isPublic: 'isPublic',
  isVerified: 'isVerified',
  rating: 'rating',
  usageCount: 'usageCount',
  version: 'version',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy'
};

exports.Prisma.ExecutionQueueScalarFieldEnum = {
  id: 'id',
  workflowId: 'workflowId',
  executionId: 'executionId',
  userId: 'userId',
  priority: 'priority',
  status: 'status',
  payload: 'payload',
  error: 'error',
  retryCount: 'retryCount',
  maxRetries: 'maxRetries',
  lockedBy: 'lockedBy',
  lockedUntil: 'lockedUntil',
  scheduledFor: 'scheduledFor',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ExecutionNodeStatusScalarFieldEnum = {
  id: 'id',
  nodeId: 'nodeId',
  status: 'status',
  lastHeartbeat: 'lastHeartbeat',
  metadata: 'metadata'
};

exports.Prisma.CircuitBreakerStateScalarFieldEnum = {
  id: 'id',
  circuitId: 'circuitId',
  state: 'state',
  failureCount: 'failureCount',
  successCount: 'successCount',
  lastFailureTime: 'lastFailureTime',
  lastSuccessTime: 'lastSuccessTime',
  lastHalfOpenTime: 'lastHalfOpenTime',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.NotificationScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  title: 'title',
  message: 'message',
  type: 'type',
  read: 'read',
  data: 'data',
  createdAt: 'createdAt'
};

exports.Prisma.NotificationPreferenceScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  emailEnabled: 'emailEnabled',
  pushEnabled: 'pushEnabled',
  webhookEnabled: 'webhookEnabled',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  telegramChatId: 'telegramChatId',
  discordWebhookUrl: 'discordWebhookUrl'
};

exports.Prisma.NotificationTemplateScalarFieldEnum = {
  id: 'id',
  type: 'type',
  title: 'title',
  message: 'message',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.NotificationLogScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  channel: 'channel',
  status: 'status',
  error: 'error',
  notificationId: 'notificationId',
  createdAt: 'createdAt'
};

exports.Prisma.PricingTierScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  priceMonthly: 'priceMonthly',
  priceYearly: 'priceYearly',
  workflowLimit: 'workflowLimit',
  executionLimit: 'executionLimit',
  features: 'features',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SubscriptionScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  tierId: 'tierId',
  status: 'status',
  currentPeriodStart: 'currentPeriodStart',
  currentPeriodEnd: 'currentPeriodEnd',
  cancelAtPeriodEnd: 'cancelAtPeriodEnd',
  stripeSubscriptionId: 'stripeSubscriptionId',
  stripePriceId: 'stripePriceId',
  stripeCustomerId: 'stripeCustomerId',
  canceledAt: 'canceledAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SubscriptionInvoiceScalarFieldEnum = {
  id: 'id',
  subscriptionId: 'subscriptionId',
  stripeInvoiceId: 'stripeInvoiceId',
  amount: 'amount',
  status: 'status',
  paidAt: 'paidAt',
  invoiceUrl: 'invoiceUrl',
  createdAt: 'createdAt'
};

exports.Prisma.TeamScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TeamMemberScalarFieldEnum = {
  teamId: 'teamId',
  userId: 'userId',
  role: 'role',
  joinedAt: 'joinedAt'
};

exports.Prisma.AuditLogScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  action: 'action',
  resource: 'resource',
  resourceId: 'resourceId',
  metadata: 'metadata',
  createdAt: 'createdAt'
};

exports.Prisma.UsageLogScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  resourceType: 'resourceType',
  action: 'action',
  quantity: 'quantity',
  metadata: 'metadata',
  createdAt: 'createdAt'
};

exports.Prisma.WalletTransactionScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  walletAddress: 'walletAddress',
  txHash: 'txHash',
  chainId: 'chainId',
  value: 'value',
  status: 'status',
  blockNumber: 'blockNumber',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};
exports.WorkflowStatus = exports.$Enums.WorkflowStatus = {
  pending: 'pending',
  running: 'running',
  completed: 'completed',
  failed: 'failed',
  paused: 'paused'
};

exports.LogLevel = exports.$Enums.LogLevel = {
  info: 'info',
  error: 'error',
  warn: 'warn'
};

exports.BlockStatus = exports.$Enums.BlockStatus = {
  pending: 'pending',
  running: 'running',
  completed: 'completed',
  failed: 'failed'
};

exports.Prisma.ModelName = {
  User: 'User',
  Profile: 'Profile',
  UserWallet: 'UserWallet',
  WorkflowTemplate: 'WorkflowTemplate',
  Workflow: 'Workflow',
  WorkflowExecution: 'WorkflowExecution',
  NodeExecution: 'NodeExecution',
  NodeLog: 'NodeLog',
  NodeInput: 'NodeInput',
  NodeOutput: 'NodeOutput',
  ExecutionLog: 'ExecutionLog',
  WorkflowPause: 'WorkflowPause',
  BlockchainTransaction: 'BlockchainTransaction',
  TransactionAttempt: 'TransactionAttempt',
  AiBlockchainOperation: 'AiBlockchainOperation',
  BlockExecution: 'BlockExecution',
  BlockExecutionLog: 'BlockExecutionLog',
  BlockLibrary: 'BlockLibrary',
  BlockLibraryRating: 'BlockLibraryRating',
  CustomBlock: 'CustomBlock',
  ExecutionQueue: 'ExecutionQueue',
  ExecutionNodeStatus: 'ExecutionNodeStatus',
  CircuitBreakerState: 'CircuitBreakerState',
  Notification: 'Notification',
  NotificationPreference: 'NotificationPreference',
  NotificationTemplate: 'NotificationTemplate',
  NotificationLog: 'NotificationLog',
  PricingTier: 'PricingTier',
  Subscription: 'Subscription',
  SubscriptionInvoice: 'SubscriptionInvoice',
  Team: 'Team',
  TeamMember: 'TeamMember',
  AuditLog: 'AuditLog',
  UsageLog: 'UsageLog',
  WalletTransaction: 'WalletTransaction'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
