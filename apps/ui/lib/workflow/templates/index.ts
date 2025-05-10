import { createDeFiPortfolioTemplate } from './defi-portfolio-management';

/**
 * Template categories for organization in the UI
 */
export enum TemplateCategory {
  GENERAL = 'general',
  DEFI = 'defi',
  NOTIFICATION = 'notification',
  DATA = 'data'
}

/**
 * Template metadata for display in the UI
 */
export interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  tags: string[];
  createTemplate: (userId: string) => { 
    nodes: Array<Record<string, unknown>>; 
    edges: Array<Record<string, unknown>>; 
  };
}

/**
 * Registry of all available workflow templates
 */
export const WORKFLOW_TEMPLATES: TemplateInfo[] = [
  {
    id: 'defi-portfolio-management',
    name: 'DeFi Portfolio Management',
    description: 'Automate portfolio monitoring, rebalancing, and execution on Base Sepolia',
    category: TemplateCategory.DEFI,
    tags: ['defi', 'portfolio', 'base-sepolia', 'rebalance', 'swap'],
    createTemplate: createDeFiPortfolioTemplate
  }
  // Add more templates here as they are created
];

/**
 * Get a template by ID
 * @param templateId The ID of the template to retrieve
 * @returns The template info or undefined if not found
 */
export function getTemplateById(templateId: string): TemplateInfo | undefined {
  return WORKFLOW_TEMPLATES.find(template => template.id === templateId);
}

/**
 * Get templates by category
 * @param category The category to filter by
 * @returns Array of templates in the specified category
 */
export function getTemplatesByCategory(category: TemplateCategory): TemplateInfo[] {
  return WORKFLOW_TEMPLATES.filter(template => template.category === category);
}

/**
 * Get templates by tag
 * @param tag The tag to filter by
 * @returns Array of templates with the specified tag
 */
export function getTemplatesByTag(tag: string): TemplateInfo[] {
  return WORKFLOW_TEMPLATES.filter(template => template.tags.includes(tag));
}
