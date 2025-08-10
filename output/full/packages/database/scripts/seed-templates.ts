#!/usr/bin/env ts-node

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasourceUrl: "postgresql://zzyra:zzyra@localhost:5433/zzyra?schema=public",
});

interface SeedTemplate {
  name: string;
  description: string;
  category: string;
  nodes: any[];
  edges: any[];
}

// Generate unique IDs for nodes
function generateId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Template 1: Crypto Price Alert System
 * Real-world use case: Monitor Bitcoin price and send email alerts when it crosses thresholds
 */
function createCryptoPriceAlertTemplate(): { nodes: any[]; edges: any[] } {
  const priceMonitorId = generateId("price-monitor");
  const conditionId = generateId("condition");
  const emailId = generateId("email");

  const nodes = [
    {
      id: priceMonitorId,
      type: "CUSTOM",
      position: { x: 100, y: 100 },
      data: {
        blockType: "PRICE_MONITOR",
        label: "Bitcoin Price Monitor",
        description: "Monitor BTC price every 5 minutes",
        nodeType: "TRIGGER",
        iconName: "trending-up",
        isEnabled: true,
        config: {
          asset: "BITCOIN",
          condition: "any_change",
          checkInterval: "5",
          source: "coinbase",
          symbol: "BTC-USD",
        },
        inputs: [],
        outputs: [{ name: "price", type: "number" }],
      },
    },
    {
      id: conditionId,
      type: "CUSTOM",
      position: { x: 350, y: 100 },
      data: {
        blockType: "CONDITION",
        label: "Price Threshold Check",
        description: "Check if price crosses $70k or drops below $40k",
        nodeType: "LOGIC",
        iconName: "filter",
        isEnabled: true,
        config: {
          condition: "{{data.price}} > 70000 || {{data.price}} < 40000",
          operator: "OR",
          upperThreshold: 70000,
          lowerThreshold: 40000,
        },
        inputs: [{ name: "price", type: "number" }],
        outputs: [{ name: "triggered", type: "boolean" }],
      },
    },
    {
      id: emailId,
      type: "CUSTOM",
      position: { x: 600, y: 100 },
      data: {
        blockType: "EMAIL",
        label: "Price Alert Email",
        description: "Send email notification when price threshold is crossed",
        nodeType: "ACTION",
        iconName: "mail",
        isEnabled: true,
        config: {
          to: "trader@example.com",
          subject: "🚨 Bitcoin Price Alert - ${{data.price}}",
          body: "Bitcoin price alert triggered!\n\nCurrent Price: ${{data.price}}\nTime: {{data.timestamp}}\n\nPrice has crossed your configured threshold. Consider reviewing your trading strategy.",
        },
        inputs: [{ name: "triggered", type: "boolean" }],
        outputs: [],
      },
    },
  ];

  const edges = [
    {
      id: `${priceMonitorId}-${conditionId}`,
      source: priceMonitorId,
      target: conditionId,
      type: "CUSTOM",
      animated: true,
    },
    {
      id: `${conditionId}-${emailId}`,
      source: conditionId,
      target: emailId,
      type: "CUSTOM",
      animated: true,
    },
  ];

  return { nodes, edges };
}

/**
 * Template 2: Daily Website Health Monitor
 * Real-world use case: Check website availability and performance daily, send report via email
 */
function createWebsiteHealthMonitorTemplate(): { nodes: any[]; edges: any[] } {
  const scheduleId = generateId("schedule");
  const httpCheckId = generateId("http-check");
  const conditionId = generateId("condition");
  const emailSuccessId = generateId("email-success");
  const emailFailureId = generateId("email-failure");

  const nodes = [
    {
      id: scheduleId,
      type: "CUSTOM",
      position: { x: 100, y: 150 },
      data: {
        blockType: "SCHEDULE",
        label: "Daily Health Check",
        description: "Trigger website health check every day at 9 AM",
        nodeType: "TRIGGER",
        iconName: "calendar",
        isEnabled: true,
        config: {
          interval: "daily",
          time: "09:00",
          timezone: "UTC",
          schedule: "0 9 * * *",
        },
        inputs: [],
        outputs: [{ name: "triggered", type: "boolean" }],
      },
    },
    {
      id: httpCheckId,
      type: "CUSTOM",
      position: { x: 350, y: 150 },
      data: {
        blockType: "HTTP_REQUEST",
        label: "Website Availability Check",
        description: "Check if website is responding",
        nodeType: "ACTION",
        iconName: "globe",
        isEnabled: true,
        config: {
          url: "https://your-website.com/health",
          method: "GET",
          headers: {
            "User-Agent": "Zyra-Health-Monitor/1.0",
          },
          timeout: 10000,
          retries: 3,
          expectedStatusCode: 200,
        },
        inputs: [{ name: "triggered", type: "boolean" }],
        outputs: [
          { name: "statusCode", type: "number" },
          { name: "responseTime", type: "number" },
          { name: "success", type: "boolean" },
        ],
      },
    },
    {
      id: conditionId,
      type: "CUSTOM",
      position: { x: 600, y: 150 },
      data: {
        blockType: "CONDITION",
        label: "Health Status Check",
        description: "Determine if website is healthy",
        nodeType: "LOGIC",
        iconName: "filter",
        isEnabled: true,
        config: {
          condition:
            "{{data.statusCode}} === 200 && {{data.responseTime}} < 5000",
          operator: "AND",
        },
        inputs: [
          { name: "statusCode", type: "number" },
          { name: "responseTime", type: "number" },
        ],
        outputs: [{ name: "isHealthy", type: "boolean" }],
      },
    },
    {
      id: emailSuccessId,
      type: "CUSTOM",
      position: { x: 850, y: 100 },
      data: {
        blockType: "EMAIL",
        label: "Success Notification",
        description: "Send success email when website is healthy",
        nodeType: "ACTION",
        iconName: "mail",
        isEnabled: true,
        config: {
          to: "devops@company.com",
          subject: "✅ Daily Health Check - Website OK",
          body: `Daily website health check completed successfully.

Website Status: HEALTHY ✅
Response Time: {{data.responseTime}}ms
Status Code: {{data.statusCode}}
Check Time: {{data.timestamp}}

All systems are operational.`,
        },
        inputs: [{ name: "isHealthy", type: "boolean" }],
        outputs: [],
      },
    },
    {
      id: emailFailureId,
      type: "CUSTOM",
      position: { x: 850, y: 200 },
      data: {
        blockType: "EMAIL",
        label: "Failure Alert",
        description: "Send alert email when website is down",
        nodeType: "ACTION",
        iconName: "mail",
        isEnabled: true,
        config: {
          to: "devops@company.com,oncall@company.com",
          subject: "🚨 URGENT: Website Health Check Failed",
          body: `URGENT: Daily website health check has failed!

Website Status: DOWN ❌
Response Time: {{data.responseTime}}ms
Status Code: {{data.statusCode}}
Check Time: {{data.timestamp}}

Please investigate immediately and restore service.`,
        },
        inputs: [{ name: "isHealthy", type: "boolean" }],
        outputs: [],
      },
    },
  ];

  const edges = [
    {
      id: `${scheduleId}-${httpCheckId}`,
      source: scheduleId,
      target: httpCheckId,
      type: "CUSTOM",
      animated: true,
    },
    {
      id: `${httpCheckId}-${conditionId}`,
      source: httpCheckId,
      target: conditionId,
      type: "CUSTOM",
      animated: true,
    },
    {
      id: `${conditionId}-${emailSuccessId}`,
      source: conditionId,
      target: emailSuccessId,
      type: "CUSTOM",
      animated: true,
      sourceHandle: "true",
    },
    {
      id: `${conditionId}-${emailFailureId}`,
      source: conditionId,
      target: emailFailureId,
      type: "CUSTOM",
      animated: true,
      sourceHandle: "false",
    },
  ];

  return { nodes, edges };
}

/**
 * Template 3: Lead Processing Webhook
 * Real-world use case: Process incoming leads from forms, validate data, and send notifications
 */
function createLeadProcessingTemplate(): { nodes: any[]; edges: any[] } {
  const webhookId = generateId("webhook");
  const validationId = generateId("validation");
  const emailWelcomeId = generateId("email-welcome");
  const emailNotificationId = generateId("email-notification");

  const nodes = [
    {
      id: webhookId,
      type: "CUSTOM",
      position: { x: 100, y: 150 },
      data: {
        blockType: "WEBHOOK",
        label: "Lead Submission Webhook",
        description: "Receive new lead submissions from website forms",
        nodeType: "TRIGGER",
        iconName: "webhook",
        isEnabled: true,
        config: {
          url: "/webhooks/leads",
          method: "POST",
          authentication: "token",
          expectedFields: ["name", "email", "company", "phone"],
        },
        inputs: [],
        outputs: [
          { name: "leadData", type: "object" },
          { name: "timestamp", type: "string" },
        ],
      },
    },
    {
      id: validationId,
      type: "CUSTOM",
      position: { x: 350, y: 150 },
      data: {
        blockType: "CONDITION",
        label: "Lead Data Validation",
        description: "Validate that lead has required information",
        nodeType: "LOGIC",
        iconName: "filter",
        isEnabled: true,
        config: {
          condition:
            "{{data.leadData.email}} && {{data.leadData.name}} && {{data.leadData.email}}.includes('@')",
          operator: "AND",
          requiredFields: ["name", "email"],
        },
        inputs: [{ name: "leadData", type: "object" }],
        outputs: [{ name: "isValid", type: "boolean" }],
      },
    },
    {
      id: emailWelcomeId,
      type: "CUSTOM",
      position: { x: 600, y: 100 },
      data: {
        blockType: "EMAIL",
        label: "Welcome Email to Lead",
        description: "Send welcome email to new lead",
        nodeType: "ACTION",
        iconName: "mail",
        isEnabled: true,
        config: {
          to: "{{data.leadData.email}}",
          subject: "Welcome {{data.leadData.name}} - Thanks for your interest!",
          body: `Hi {{data.leadData.name}},

Thank you for your interest in our services! We're excited to help {{data.leadData.company}} achieve its goals.

Our team will review your inquiry and get back to you within 24 hours.

Best regards,
The Sales Team

P.S. You can also schedule a call directly: https://company.com/schedule`,
        },
        inputs: [{ name: "isValid", type: "boolean" }],
        outputs: [],
      },
    },
    {
      id: emailNotificationId,
      type: "CUSTOM",
      position: { x: 600, y: 200 },
      data: {
        blockType: "EMAIL",
        label: "Internal Lead Notification",
        description: "Notify sales team of new qualified lead",
        nodeType: "ACTION",
        iconName: "mail",
        isEnabled: true,
        config: {
          to: "sales@company.com",
          subject: "🎯 New Qualified Lead: {{data.leadData.company}}",
          body: `New qualified lead received!

Name: {{data.leadData.name}}
Email: {{data.leadData.email}}
Company: {{data.leadData.company}}
Phone: {{data.leadData.phone}}
Message: {{data.leadData.message}}

Received: {{data.timestamp}}

Action Required: Follow up within 24 hours
CRM Link: https://crm.company.com/leads/new?email={{data.leadData.email}}`,
        },
        inputs: [{ name: "isValid", type: "boolean" }],
        outputs: [],
      },
    },
  ];

  const edges = [
    {
      id: `${webhookId}-${validationId}`,
      source: webhookId,
      target: validationId,
      type: "CUSTOM",
      animated: true,
    },
    {
      id: `${validationId}-${emailWelcomeId}`,
      source: validationId,
      target: emailWelcomeId,
      type: "CUSTOM",
      animated: true,
      sourceHandle: "true",
    },
    {
      id: `${validationId}-${emailNotificationId}`,
      source: validationId,
      target: emailNotificationId,
      type: "CUSTOM",
      animated: true,
      sourceHandle: "true",
    },
  ];

  return { nodes, edges };
}

// Define the three templates
const TEMPLATE_DEFINITIONS = [
  {
    id: "crypto-price-alert",
    name: "Crypto Price Alert System",
    description:
      "Monitor Bitcoin price and receive email alerts when it crosses $70k or drops below $40k. Perfect for traders and investors who want to stay informed about significant price movements.",
    category: "finance",
    tags: ["crypto", "bitcoin", "price-monitoring", "alerts", "trading"],
    createTemplate: createCryptoPriceAlertTemplate,
  },
  {
    id: "website-health-monitor",
    name: "Daily Website Health Monitor",
    description:
      "Automatically check your website's availability and performance every day at 9 AM. Get detailed reports on response times and immediate alerts if your site goes down.",
    category: "monitoring",
    tags: ["website", "health-check", "monitoring", "uptime", "devops"],
    createTemplate: createWebsiteHealthMonitorTemplate,
  },
  {
    id: "lead-processing-webhook",
    name: "Lead Processing Automation",
    description:
      "Automatically process incoming leads from website forms. Validates lead data, sends welcome emails to prospects, and notifies your sales team instantly.",
    category: "business",
    tags: ["leads", "sales", "automation", "webhook", "crm"],
    createTemplate: createLeadProcessingTemplate,
  },
];

async function seedTemplates(): Promise<void> {
  console.log("🌱 Seeding workflow templates (3 real-world use cases)...");

  try {
    // Clear existing templates (optional - comment out if you want to keep existing data)
    await prisma.workflowTemplate.deleteMany({});
    console.log("🗑️  Cleared existing templates");

    // Seed the three templates
    const templatePromises = TEMPLATE_DEFINITIONS.map(async (templateDef) => {
      const { nodes, edges } = templateDef.createTemplate();

      const templateData: SeedTemplate = {
        name: templateDef.name,
        description: templateDef.description,
        category: templateDef.category,
        nodes: nodes,
        edges: edges,
      };

      return prisma.workflowTemplate.create({
        data: templateData,
      });
    });

    const createdTemplates = await Promise.all(templatePromises);

    console.log(`✅ Successfully seeded ${createdTemplates.length} templates:`);
    createdTemplates.forEach((template, index) => {
      console.log(`   ${index + 1}. ${template.name} (${template.category})`);
    });

    // Print summary statistics
    const categoryStats = await prisma.workflowTemplate.groupBy({
      by: ["category"],
      _count: {
        category: true,
      },
    });

    console.log("\n📊 Template Statistics:");
    categoryStats.forEach((stat) => {
      console.log(`   ${stat.category}: ${stat._count.category} templates`);
    });

    console.log("\n🎯 Template Details:");
    TEMPLATE_DEFINITIONS.forEach((template, index) => {
      console.log(`\n${index + 1}. ${template.name}`);
      console.log(`   Description: ${template.description}`);
      console.log(`   Category: ${template.category}`);
      console.log(`   Tags: ${template.tags.join(", ")}`);
      const { nodes, edges } = template.createTemplate();
      console.log(
        `   Blocks: ${nodes.length} nodes, ${edges.length} connections`
      );
    });
  } catch (error) {
    console.error("❌ Error seeding templates:", error);
    throw error;
  }
}

async function main(): Promise<void> {
  try {
    await seedTemplates();
    console.log("\n🎉 Template seeding completed successfully!");
  } catch (error) {
    console.error("💥 Seeding failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding if this file is executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error("💥 Unexpected error:", error);
    process.exit(1);
  });
}

export { seedTemplates, main as seedMain };
