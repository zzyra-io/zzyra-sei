#!/usr/bin/env ts-node

import { PrismaClient } from "@prisma/client";
import { STARTER_TEMPLATES } from "../../apps/ui/lib/workflow/templates/starter-templates";

const prisma = new PrismaClient();

interface SeedTemplate {
  name: string;
  description: string;
  category: string;
  nodes: any[];
  edges: any[];
}

async function seedTemplates(): Promise<void> {
  console.log("🌱 Seeding workflow templates...");

  try {
    // Clear existing templates (optional - comment out if you want to keep existing data)
    await prisma.workflowTemplate.deleteMany({});
    console.log("🗑️  Cleared existing templates");

    // Seed starter templates
    const templatePromises = STARTER_TEMPLATES.map(async (templateDef) => {
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
