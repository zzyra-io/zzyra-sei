import { v4 as uuidv4 } from "uuid";
import { BlockType } from "@zyra/types";

interface FlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  animated?: boolean;
  sourceHandle?: string;
  targetHandle?: string;
}

interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  estimatedSetupTime: number; // minutes
  requiredIntegrations: string[];
  createTemplate: () => { nodes: FlowNode[]; edges: FlowEdge[] };
}

/**
 * Template 1: Daily Price Alert System
 * Monitors crypto/stock prices and sends alerts when thresholds are hit
 */
export function createPriceAlertTemplate(): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const priceMonitorId = `price-monitor-${uuidv4()}`;
  const conditionId = `condition-${uuidv4()}`;
  const emailId = `email-${uuidv4()}`;
  const notificationId = `notification-${uuidv4()}`;

  const nodes: FlowNode[] = [
    {
      id: priceMonitorId,
      type: "custom",
      position: { x: 100, y: 100 },
      data: {
        blockType: BlockType.PRICE_MONITOR,
        label: "Price Monitor",
        description: "Monitor BTC price every 5 minutes",
        nodeType: "TRIGGER",
        iconName: "trending-up",
        isEnabled: true,
        config: {
          symbol: "BTC-USD",
          interval: 300, // 5 minutes
          source: "coinbase",
        },
        inputs: [],
        outputs: [{ name: "price", type: "number" }],
      },
    },
    {
      id: conditionId,
      type: "custom",
      position: { x: 300, y: 100 },
      data: {
        blockType: BlockType.CONDITION,
        label: "Price Threshold Check",
        description: "Check if price is above or below threshold",
        nodeType: "LOGIC",
        iconName: "filter",
        isEnabled: true,
        config: {
          condition: "{{data.price}} > {{config.upperThreshold}} || {{data.price}} < {{config.lowerThreshold}}",
          upperThreshold: 70000,
          lowerThreshold: 40000,
        },
        inputs: [{ name: "price", type: "number" }],
        outputs: [{ name: "triggered", type: "boolean" }],
      },
    },
    {
      id: emailId,
      type: "custom",
      position: { x: 500, y: 50 },
      data: {
        blockType: BlockType.EMAIL,
        label: "Email Alert",
        description: "Send email notification",
        nodeType: "ACTION",
        iconName: "mail",
        isEnabled: true,
        config: {
          to: "{{config.userEmail}}",
          subject: "Price Alert: {{data.symbol}}",
          body: "Price alert triggered! {{data.symbol}} is now {{data.price}}",
          userEmail: "user@example.com",
        },
        inputs: [{ name: "triggered", type: "boolean" }],
        outputs: [],
      },
    },
    {
      id: notificationId,
      type: "custom",
      position: { x: 500, y: 150 },
      data: {
        blockType: BlockType.NOTIFICATION,
        label: "Push Notification",
        description: "Send push notification",
        nodeType: "ACTION",
        iconName: "bell",
        isEnabled: true,
        config: {
          title: "Price Alert",
          message: "{{data.symbol}} price: {{data.price}}",
          urgency: "normal",
        },
        inputs: [{ name: "triggered", type: "boolean" }],
        outputs: [],
      },
    },
  ];

  const edges: FlowEdge[] = [
    {
      id: `${priceMonitorId}-${conditionId}`,
      source: priceMonitorId,
      target: conditionId,
      animated: true,
    },
    {
      id: `${conditionId}-${emailId}`,
      source: conditionId,
      target: emailId,
      animated: true,
    },
    {
      id: `${conditionId}-${notificationId}`,
      source: conditionId,
      target: notificationId,
      animated: true,
    },
  ];

  return { nodes, edges };
}

/**
 * Template 2: Automated Daily Report Generator
 * Fetches data from APIs, processes it, and emails a summary report
 */
export function createDailyReportTemplate(): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const scheduleId = `schedule-${uuidv4()}`;
  const dataFetchId = `data-fetch-${uuidv4()}`;
  const calculatorId = `calculator-${uuidv4()}`;
  const transformerId = `transformer-${uuidv4()}`;
  const emailId = `email-${uuidv4()}`;
  const databaseId = `database-${uuidv4()}`;

  const nodes: FlowNode[] = [
    {
      id: scheduleId,
      type: "custom",
      position: { x: 100, y: 100 },
      data: {
        blockType: BlockType.SCHEDULE,
        label: "Daily Schedule",
        description: "Trigger daily at 9 AM",
        nodeType: "TRIGGER",
        iconName: "clock",
        isEnabled: true,
        config: {
          schedule: "0 9 * * *", // 9 AM daily
          timezone: "UTC",
        },
        inputs: [],
        outputs: [{ name: "triggered", type: "boolean" }],
      },
    },
    {
      id: dataFetchId,
      type: "custom",
      position: { x: 300, y: 100 },
      data: {
        blockType: BlockType.HTTP_REQUEST,
        label: "Fetch Analytics Data",
        description: "Get daily analytics from API",
        nodeType: "ACTION",
        iconName: "download",
        isEnabled: true,
        config: {
          url: "{{config.analyticsApiUrl}}",
          method: "GET",
          headers: {
            "Authorization": "Bearer {{config.apiKey}}",
          },
          analyticsApiUrl: "https://api.analytics.com/daily",
          apiKey: "your-api-key",
        },
        inputs: [{ name: "triggered", type: "boolean" }],
        outputs: [{ name: "data", type: "object" }],
      },
    },
    {
      id: calculatorId,
      type: "custom",
      position: { x: 500, y: 100 },
      data: {
        blockType: BlockType.CALCULATOR,
        label: "Calculate Metrics",
        description: "Calculate key performance metrics",
        nodeType: "PROCESSING",
        iconName: "calculator",
        isEnabled: true,
        config: {
          operations: [
            { name: "totalRevenue", formula: "sum({{data.sales}})" },
            { name: "avgOrderValue", formula: "{{totalRevenue}} / {{data.orderCount}}" },
            { name: "growthRate", formula: "({{totalRevenue}} - {{data.previousRevenue}}) / {{data.previousRevenue}} * 100" }
          ],
        },
        inputs: [{ name: "data", type: "object" }],
        outputs: [{ name: "metrics", type: "object" }],
      },
    },
    {
      id: transformerId,
      type: "custom",
      position: { x: 700, y: 100 },
      data: {
        blockType: BlockType.TRANSFORMER,
        label: "Format Report",
        description: "Transform data into report format",
        nodeType: "PROCESSING",
        iconName: "file-text",
        isEnabled: true,
        config: {
          template: `
            Daily Business Report - {{date}}
            
            Revenue: ${{metrics.totalRevenue}}
            Average Order Value: ${{metrics.avgOrderValue}}
            Growth Rate: {{metrics.growthRate}}%
            
            Orders: {{data.orderCount}}
            New Customers: {{data.newCustomers}}
          `,
        },
        inputs: [{ name: "metrics", type: "object" }],
        outputs: [{ name: "report", type: "string" }],
      },
    },
    {
      id: emailId,
      type: "custom",
      position: { x: 900, y: 50 },
      data: {
        blockType: BlockType.EMAIL,
        label: "Email Report",
        description: "Send report via email",
        nodeType: "ACTION",
        iconName: "send",
        isEnabled: true,
        config: {
          to: "{{config.reportRecipients}}",
          subject: "Daily Business Report - {{date}}",
          body: "{{data.report}}",
          reportRecipients: "manager@company.com,team@company.com",
        },
        inputs: [{ name: "report", type: "string" }],
        outputs: [],
      },
    },
    {
      id: databaseId,
      type: "custom",
      position: { x: 900, y: 150 },
      data: {
        blockType: BlockType.DATABASE_WRITE,
        label: "Store Report",
        description: "Save report to database",
        nodeType: "ACTION",
        iconName: "database",
        isEnabled: true,
        config: {
          table: "daily_reports",
          operation: "insert",
          data: {
            date: "{{date}}",
            metrics: "{{data.metrics}}",
            report_content: "{{data.report}}",
          },
        },
        inputs: [{ name: "report", type: "string" }],
        outputs: [],
      },
    },
  ];

  const edges: FlowEdge[] = [
    {
      id: `${scheduleId}-${dataFetchId}`,
      source: scheduleId,
      target: dataFetchId,
      animated: true,
    },
    {
      id: `${dataFetchId}-${calculatorId}`,
      source: dataFetchId,
      target: calculatorId,
      animated: true,
    },
    {
      id: `${calculatorId}-${transformerId}`,
      source: calculatorId,
      target: transformerId,
      animated: true,
    },
    {
      id: `${transformerId}-${emailId}`,
      source: transformerId,
      target: emailId,
      animated: true,
    },
    {
      id: `${transformerId}-${databaseId}`,
      source: transformerId,
      target: databaseId,
      animated: true,
    },
  ];

  return { nodes, edges };
}

/**
 * Template 3: Simple Expense Approval Workflow
 * Webhook-triggered expense processing with approval logic
 */
export function createExpenseApprovalTemplate(): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const webhookId = `webhook-${uuidv4()}`;
  const conditionId = `condition-${uuidv4()}`;
  const autoApproveId = `auto-approve-${uuidv4()}`;
  const manualApprovalId = `manual-approval-${uuidv4()}`;
  const notificationId = `notification-${uuidv4()}`;
  const databaseId = `database-${uuidv4()}`;

  const nodes: FlowNode[] = [
    {
      id: webhookId,
      type: "custom",
      position: { x: 100, y: 100 },
      data: {
        blockType: BlockType.WEBHOOK,
        label: "Expense Submitted",
        description: "Receive expense submission",
        nodeType: "TRIGGER",
        iconName: "webhook",
        isEnabled: true,
        config: {
          path: "/expense-webhook",
          method: "POST",
          authentication: "token",
        },
        inputs: [],
        outputs: [{ name: "expense", type: "object" }],
      },
    },
    {
      id: conditionId,
      type: "custom",
      position: { x: 300, y: 100 },
      data: {
        blockType: BlockType.CONDITION,
        label: "Check Amount",
        description: "Auto-approve if under $500",
        nodeType: "LOGIC",
        iconName: "filter",
        isEnabled: true,
        config: {
          condition: "{{data.expense.amount}} < 500",
        },
        inputs: [{ name: "expense", type: "object" }],
        outputs: [{ name: "autoApprove", type: "boolean" }],
      },
    },
    {
      id: autoApproveId,
      type: "custom",
      position: { x: 500, y: 50 },
      data: {
        blockType: BlockType.DATABASE_WRITE,
        label: "Auto Approve",
        description: "Automatically approve expense",
        nodeType: "ACTION",
        iconName: "check",
        isEnabled: true,
        config: {
          table: "expenses",
          operation: "update",
          data: {
            status: "approved",
            approved_at: "{{now}}",
            approved_by: "system",
          },
          conditions: { id: "{{data.expense.id}}" },
        },
        inputs: [{ name: "autoApprove", type: "boolean" }],
        outputs: [],
      },
    },
    {
      id: manualApprovalId,
      type: "custom",
      position: { x: 500, y: 150 },
      data: {
        blockType: BlockType.MESSAGE_SEND,
        label: "Request Approval",
        description: "Send to manager for approval",
        nodeType: "ACTION",
        iconName: "user-check",
        isEnabled: true,
        config: {
          channel: "slack",
          recipient: "{{data.expense.manager_id}}",
          message: `Expense approval needed:
            Employee: {{data.expense.employee_name}}
            Amount: ${{data.expense.amount}}
            Description: {{data.expense.description}}
            
            Approve: /approve {{data.expense.id}}
            Reject: /reject {{data.expense.id}}`,
        },
        inputs: [{ name: "autoApprove", type: "boolean" }],
        outputs: [],
      },
    },
    {
      id: notificationId,
      type: "custom",
      position: { x: 700, y: 100 },
      data: {
        blockType: BlockType.EMAIL,
        label: "Notify Employee",
        description: "Send status email to employee",
        nodeType: "ACTION",
        iconName: "mail",
        isEnabled: true,
        config: {
          to: "{{data.expense.employee_email}}",
          subject: "Expense Status Update",
          body: `Your expense of ${{data.expense.amount}} has been {{data.status}}.
            
            Description: {{data.expense.description}}
            Submitted: {{data.expense.submitted_at}}`,
        },
        inputs: [{ name: "expense", type: "object" }],
        outputs: [],
      },
    },
  ];

  const edges: FlowEdge[] = [
    {
      id: `${webhookId}-${conditionId}`,
      source: webhookId,
      target: conditionId,
      animated: true,
    },
    {
      id: `${conditionId}-${autoApproveId}`,
      source: conditionId,
      target: autoApproveId,
      animated: true,
      sourceHandle: "true",
    },
    {
      id: `${conditionId}-${manualApprovalId}`,
      source: conditionId,
      target: manualApprovalId,
      animated: true,
      sourceHandle: "false",
    },
    {
      id: `${autoApproveId}-${notificationId}`,
      source: autoApproveId,
      target: notificationId,
      animated: true,
    },
    {
      id: `${manualApprovalId}-${notificationId}`,
      source: manualApprovalId,
      target: notificationId,
      animated: true,
    },
  ];

  return { nodes, edges };
}

/**
 * Template 4: Data Backup & Sync Workflow
 * Scheduled data backup with multiple destinations
 */
export function createDataBackupTemplate(): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const scheduleId = `schedule-${uuidv4()}`;
  const queryId = `query-${uuidv4()}`;
  const transformId = `transform-${uuidv4()}`;
  const fileWriteId = `file-write-${uuidv4()}`;
  const cloudSyncId = `cloud-sync-${uuidv4()}`;
  const notificationId = `notification-${uuidv4()}`;

  const nodes: FlowNode[] = [
    {
      id: scheduleId,
      type: "custom",
      position: { x: 100, y: 100 },
      data: {
        blockType: BlockType.SCHEDULE,
        label: "Weekly Backup",
        description: "Trigger backup every Sunday at 2 AM",
        nodeType: "TRIGGER",
        iconName: "clock",
        isEnabled: true,
        config: {
          schedule: "0 2 * * 0", // Sunday 2 AM
          timezone: "UTC",
        },
        inputs: [],
        outputs: [{ name: "triggered", type: "boolean" }],
      },
    },
    {
      id: queryId,
      type: "custom",
      position: { x: 300, y: 100 },
      data: {
        blockType: BlockType.DATABASE_QUERY,
        label: "Extract Data",
        description: "Query data for backup",
        nodeType: "ACTION",
        iconName: "database",
        isEnabled: true,
        config: {
          query: "SELECT * FROM {{config.tables}} WHERE updated_at >= {{lastBackup}}",
          tables: "users,orders,products",
        },
        inputs: [{ name: "triggered", type: "boolean" }],
        outputs: [{ name: "data", type: "array" }],
      },
    },
    {
      id: transformId,
      type: "custom",
      position: { x: 500, y: 100 },
      data: {
        blockType: BlockType.TRANSFORMER,
        label: "Format Data",
        description: "Convert to backup format",
        nodeType: "PROCESSING",
        iconName: "file-text",
        isEnabled: true,
        config: {
          format: "json",
          compression: "gzip",
          encryption: true,
        },
        inputs: [{ name: "data", type: "array" }],
        outputs: [{ name: "formatted", type: "string" }],
      },
    },
    {
      id: fileWriteId,
      type: "custom",
      position: { x: 700, y: 50 },
      data: {
        blockType: BlockType.FILE_WRITE,
        label: "Save Local Backup",
        description: "Write to local storage",
        nodeType: "ACTION",
        iconName: "hard-drive",
        isEnabled: true,
        config: {
          path: "/backups/{{date}}-backup.json.gz",
          content: "{{data.formatted}}",
          encoding: "binary",
        },
        inputs: [{ name: "formatted", type: "string" }],
        outputs: [{ name: "filePath", type: "string" }],
      },
    },
    {
      id: cloudSyncId,
      type: "custom",
      position: { x: 700, y: 150 },
      data: {
        blockType: BlockType.HTTP_CALL,
        label: "Upload to Cloud",
        description: "Sync to cloud storage",
        nodeType: "ACTION",
        iconName: "cloud-upload",
        isEnabled: true,
        config: {
          url: "{{config.cloudStorageUrl}}",
          method: "PUT",
          headers: {
            "Authorization": "Bearer {{config.cloudApiKey}}",
            "Content-Type": "application/octet-stream",
          },
          body: "{{data.formatted}}",
          cloudStorageUrl: "https://api.cloudstorage.com/upload",
          cloudApiKey: "your-cloud-api-key",
        },
        inputs: [{ name: "formatted", type: "string" }],
        outputs: [{ name: "uploadResult", type: "object" }],
      },
    },
    {
      id: notificationId,
      type: "custom",
      position: { x: 900, y: 100 },
      data: {
        blockType: BlockType.NOTIFICATION,
        label: "Backup Complete",
        description: "Notify admin of completion",
        nodeType: "ACTION",
        iconName: "check-circle",
        isEnabled: true,
        config: {
          title: "Backup Completed",
          message: "Weekly backup completed successfully. {{data.recordCount}} records backed up.",
          urgency: "low",
        },
        inputs: [{ name: "uploadResult", type: "object" }],
        outputs: [],
      },
    },
  ];

  const edges: FlowEdge[] = [
    {
      id: `${scheduleId}-${queryId}`,
      source: scheduleId,
      target: queryId,
      animated: true,
    },
    {
      id: `${queryId}-${transformId}`,
      source: queryId,
      target: transformId,
      animated: true,
    },
    {
      id: `${transformId}-${fileWriteId}`,
      source: transformId,
      target: fileWriteId,
      animated: true,
    },
    {
      id: `${transformId}-${cloudSyncId}`,
      source: transformId,
      target: cloudSyncId,
      animated: true,
    },
    {
      id: `${fileWriteId}-${notificationId}`,
      source: fileWriteId,
      target: notificationId,
      animated: true,
    },
    {
      id: `${cloudSyncId}-${notificationId}`,
      source: cloudSyncId,
      target: notificationId,
      animated: true,
    },
  ];

  return { nodes, edges };
}

/**
 * Available starter templates registry
 */
export const STARTER_TEMPLATES: TemplateDefinition[] = [
  {
    id: 'price-alert-system',
    name: 'Crypto Price Alert System',
    description: 'Monitor cryptocurrency prices and get instant alerts when they hit your target thresholds.',
    category: 'finance',
    difficulty: 'beginner',
    tags: ['crypto', 'alerts', 'price-monitoring', 'notifications'],
    estimatedSetupTime: 10,
    requiredIntegrations: ['Coinbase API', 'Email Service'],
    createTemplate: createPriceAlertTemplate,
  },
  {
    id: 'daily-report-generator',
    name: 'Automated Daily Reports',
    description: 'Generate and distribute daily business reports with key metrics and insights.',
    category: 'business',
    difficulty: 'intermediate',
    tags: ['reporting', 'analytics', 'automation', 'email'],
    estimatedSetupTime: 30,
    requiredIntegrations: ['Analytics API', 'Email Service', 'Database'],
    createTemplate: createDailyReportTemplate,
  },
  {
    id: 'expense-approval-workflow',
    name: 'Simple Expense Approval',
    description: 'Automate expense report processing with smart approval routing and notifications.',
    category: 'business',
    difficulty: 'intermediate',
    tags: ['expenses', 'approval', 'workflow', 'slack'],
    estimatedSetupTime: 25,
    requiredIntegrations: ['Slack', 'Database', 'Email Service'],
    createTemplate: createExpenseApprovalTemplate,
  },
  {
    id: 'data-backup-sync',
    name: 'Automated Data Backup',
    description: 'Scheduled data backup with local storage and cloud synchronization.',
    category: 'data',
    difficulty: 'intermediate',
    tags: ['backup', 'data', 'storage', 'sync'],
    estimatedSetupTime: 20,
    requiredIntegrations: ['Database', 'Cloud Storage'],
    createTemplate: createDataBackupTemplate,
  },
];

/**
 * Get template by ID
 */
export function getStarterTemplateById(templateId: string): TemplateDefinition | undefined {
  return STARTER_TEMPLATES.find(template => template.id === templateId);
}

/**
 * Get templates by category
 */
export function getStarterTemplatesByCategory(category: string): TemplateDefinition[] {
  return STARTER_TEMPLATES.filter(template => template.category === category);
} 