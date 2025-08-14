import { Injectable } from "@nestjs/common";
import { BlockType, DataType } from "@zzyra/types";

interface PromptTemplate {
  id: string;
  name: string;
  template: string;
  variables: string[];
  category: "system" | "user" | "refinement" | "validation";
}

interface PromptContext {
  blockTypes?: BlockType[];
  dataTypes?: DataType[];
  existingWorkflow?: boolean;
  domainHint?: string;
  detailedMode?: boolean;
  userLevel?: "beginner" | "intermediate" | "expert";
}

@Injectable()
export class PromptService {
  private templates = new Map<string, PromptTemplate>();

  constructor() {
    this.initializeTemplates();
  }

  /**
   * Generate a dynamic system prompt based on context
   */
  generateSystemPrompt(context: PromptContext): string {
    const baseTemplate = this.getTemplate("workflow_system_base");

    let prompt = baseTemplate.template;

    // Replace variables
    prompt = prompt.replace(
      "{{BLOCK_TYPES}}",
      JSON.stringify(Object.values(BlockType), null, 2)
    );
    prompt = prompt.replace(
      "{{DATA_TYPES}}",
      JSON.stringify(Object.values(DataType), null, 2)
    );

    // Add domain-specific enhancements
    if (context.domainHint) {
      const domainTemplate = this.getDomainTemplate(context.domainHint);
      if (domainTemplate) {
        prompt += "\n\n" + domainTemplate.template;
      }
    }

    // Add user-level specific instructions
    if (context.userLevel) {
      const userLevelTemplate = this.getUserLevelTemplate(context.userLevel);
      prompt += "\n\n" + userLevelTemplate.template;
    }

    return prompt;
  }

  /**
   * Generate user context prompt
   */
  generateUserPrompt(
    description: string,
    context: PromptContext & {
      existingNodes?: unknown[];
      existingEdges?: unknown[];
    }
  ): string {
    if (context.existingNodes && context.existingNodes.length > 0) {
      const enhancementTemplate = this.getTemplate("workflow_enhancement");
      return enhancementTemplate.template
        .replace("{{DESCRIPTION}}", description)
        .replace(
          "{{EXISTING_NODES}}",
          JSON.stringify(context.existingNodes, null, 2)
        )
        .replace(
          "{{EXISTING_EDGES}}",
          JSON.stringify(context.existingEdges, null, 2)
        );
    } else {
      const creationTemplate = this.getTemplate("workflow_creation");
      return creationTemplate.template.replace("{{DESCRIPTION}}", description);
    }
  }

  /**
   * Generate refinement prompt
   */
  generateRefinementPrompt(
    refinementRequest: string,
    nodes: unknown[],
    edges: unknown[],
    options: Record<string, unknown> = {}
  ): string {
    const refinementTemplate = this.getTemplate("workflow_refinement");

    return refinementTemplate.template
      .replace("{{REFINEMENT_REQUEST}}", refinementRequest)
      .replace("{{CURRENT_NODES}}", JSON.stringify(nodes, null, 2))
      .replace("{{CURRENT_EDGES}}", JSON.stringify(edges, null, 2))
      .replace("{{OPTIONS}}", JSON.stringify(options, null, 2));
  }

  /**
   * Generate block generation prompt
   */
  generateBlockPrompt(description: string): string {
    const blockTemplate = this.getTemplate("block_generation");

    return blockTemplate.template
      .replace(
        "{{DATA_TYPES}}",
        JSON.stringify(Object.values(DataType), null, 2)
      )
      .replace("{{DESCRIPTION}}", description);
  }

  /**
   * Add or update a custom template
   */
  addTemplate(template: PromptTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * Get a template by ID
   */
  getTemplate(id: string): PromptTemplate {
    const template = this.templates.get(id);
    if (!template) {
      throw new Error(`Template '${id}' not found`);
    }
    return template;
  }

  /**
   * Get all templates by category
   */
  getTemplatesByCategory(
    category: PromptTemplate["category"]
  ): PromptTemplate[] {
    return Array.from(this.templates.values()).filter(
      (t) => t.category === category
    );
  }

  /**
   * Initialize default templates
   */
  private initializeTemplates(): void {
    // Base system template
    this.templates.set("workflow_system_base", {
      id: "workflow_system_base",
      name: "Base Workflow System Prompt",
      template: `You are an EXPERT WORKFLOW AI for Zzyra automation platform with deep understanding of blockchain, crypto, and automation workflows.

🎯 **CORE MISSION**: Transform ANY natural language into sophisticated, executable workflows using our comprehensive block system.

🔥 **AVAILABLE BLOCK TYPES**:
{{BLOCK_TYPES}}

📊 **AVAILABLE DATA TYPES**: 
{{DATA_TYPES}}

🎯 **OUTPUT SPECIFICATION**:

**Node Structure** (STRICT FORMAT):
{
  "id": "node-{{uuid}}",
  "type": "CUSTOM",
  "position": {"x": intelligent_x, "y": intelligent_y},
  "data": {
    "blockType": "EXACT_UPPERCASE_ENUM_VALUE",
    "label": "User-friendly descriptive name",
    "description": "Clear description of functionality",
    "nodeType": "TRIGGER|ACTION|LOGIC",
    "iconName": "appropriate-icon-name",
    "isEnabled": true,
    "config": {},
    "inputs": [],
    "outputs": []
  }
}

**Edge Structure**:
{
  "id": "edge-{{uuid}}",
  "source": "source-node-id",
  "target": "target-node-id",
  "type": "CUSTOM",
  "animated": false
}

**CRITICAL REQUIREMENTS**:
- Return ONLY valid JSON: {"nodes": [...], "edges": [...]}
- Use exact BlockType enum values (UPPERCASE format)
- Generate unique UUIDs for all IDs
- Create intelligent positioning based on flow order
- Ensure logical execution flow (TRIGGER → LOGIC → ACTION)`,
      variables: ["BLOCK_TYPES", "DATA_TYPES"],
      category: "system",
    });

    // Workflow creation template
    this.templates.set("workflow_creation", {
      id: "workflow_creation",
      name: "New Workflow Creation",
      template: `NEW WORKFLOW CREATION REQUEST:

**USER REQUEST**: "{{DESCRIPTION}}"

**TASK**: Create a complete workflow from scratch that accomplishes the user's automation goal.`,
      variables: ["DESCRIPTION"],
      category: "user",
    });

    // Workflow enhancement template
    this.templates.set("workflow_enhancement", {
      id: "workflow_enhancement",
      name: "Workflow Enhancement",
      template: `WORKFLOW ENHANCEMENT REQUEST:

**CURRENT WORKFLOW**:
Nodes: {{EXISTING_NODES}}
Edges: {{EXISTING_EDGES}}

**USER ENHANCEMENT REQUEST**: "{{DESCRIPTION}}"

**TASK**: Enhance the existing workflow by adding new functionality while maintaining existing capabilities.`,
      variables: ["DESCRIPTION", "EXISTING_NODES", "EXISTING_EDGES"],
      category: "user",
    });

    // Workflow refinement template
    this.templates.set("workflow_refinement", {
      id: "workflow_refinement",
      name: "Workflow Refinement",
      template: `WORKFLOW REFINEMENT REQUEST:

**CURRENT WORKFLOW**:
Nodes: {{CURRENT_NODES}}
Edges: {{CURRENT_EDGES}}

**REFINEMENT REQUEST**: "{{REFINEMENT_REQUEST}}"
**OPTIONS**: {{OPTIONS}}

**TASK**: Refine the existing workflow based on the user's request while maintaining the core functionality.`,
      variables: [
        "REFINEMENT_REQUEST",
        "CURRENT_NODES",
        "CURRENT_EDGES",
        "OPTIONS",
      ],
      category: "refinement",
    });

    // Block generation template
    this.templates.set("block_generation", {
      id: "block_generation",
      name: "Custom Block Generation",
      template: `You are an EXPERT CUSTOM BLOCK GENERATOR for Zzyra automation platform.

🎯 **MISSION**: Generate custom blocks based on user requirements.

📊 **AVAILABLE DATA TYPES**: 
{{DATA_TYPES}}

**USER REQUEST**: "{{DESCRIPTION}}"

🎯 **OUTPUT FORMAT** (STRICT JSON):
{
  "name": "Descriptive block name",
  "description": "Clear description of functionality",
  "category": "utility|integration|ai|data|analytics|communication",
  "code": "async function execute(inputs) { /* implementation */ }",
  "inputs": [
    {
      "name": "inputName",
      "dataType": "string|number|boolean|object|array",
      "required": true,
      "description": "Input description",
      "defaultValue": "default value"
    }
  ],
  "outputs": [
    {
      "name": "outputName", 
      "dataType": "string|number|boolean|object|array",
      "required": true,
      "description": "Output description"
    }
  ],
  "configFields": [
    {
      "name": "configName",
      "label": "Display Label",
      "type": "string|number|boolean|select",
      "required": false,
      "description": "Configuration description",
      "defaultValue": "default value"
    }
  ]
}

Return ONLY the JSON object with no additional text, explanations, or formatting.`,
      variables: ["DATA_TYPES", "DESCRIPTION"],
      category: "system",
    });

    // Domain-specific templates
    this.initializeDomainTemplates();
    this.initializeUserLevelTemplates();
  }

  /**
   * Initialize domain-specific templates
   */
  private initializeDomainTemplates(): void {
    // DeFi domain template
    this.templates.set("domain_defi", {
      id: "domain_defi",
      name: "DeFi Domain Enhancement",
      template: `**DEFI DOMAIN SPECIALIZATION**:
- Focus on blockchain protocols, DEXes, lending, yield farming
- Prioritize security and gas optimization
- Include proper slippage and deadline handling
- Consider MEV protection and frontrunning prevention
- Use appropriate DeFi block types: SWAP, LEND, STAKE, FARM, etc.`,
      variables: [],
      category: "system",
    });

    // Healthcare domain template
    this.templates.set("domain_healthcare", {
      id: "domain_healthcare",
      name: "Healthcare Domain Enhancement",
      template: `**HEALTHCARE DOMAIN SPECIALIZATION**:
- Ensure HIPAA compliance and patient data privacy
- Focus on clinical workflows and patient care
- Include proper error handling for critical systems
- Prioritize reliability and audit trails
- Use healthcare-specific block types when available`,
      variables: [],
      category: "system",
    });

    // Enterprise domain template
    this.templates.set("domain_enterprise", {
      id: "domain_enterprise",
      name: "Enterprise Domain Enhancement",
      template: `**ENTERPRISE DOMAIN SPECIALIZATION**:
- Focus on scalability, reliability, and monitoring
- Include proper error handling and rollback mechanisms
- Consider integration with enterprise systems (CRM, ERP)
- Prioritize security and compliance requirements
- Use enterprise-grade authentication and authorization`,
      variables: [],
      category: "system",
    });
  }

  /**
   * Initialize user level templates
   */
  private initializeUserLevelTemplates(): void {
    this.templates.set("user_beginner", {
      id: "user_beginner",
      name: "Beginner User Level",
      template: `**BEGINNER USER ADAPTATIONS**:
- Use simple, clear block labels and descriptions
- Avoid complex logic blocks initially
- Provide helpful configuration defaults
- Focus on common use cases and templates
- Include explanatory comments in generated workflows`,
      variables: [],
      category: "system",
    });

    this.templates.set("user_expert", {
      id: "user_expert",
      name: "Expert User Level",
      template: `**EXPERT USER ADAPTATIONS**:
- Use advanced block types and complex logic
- Provide detailed configuration options
- Include optimization opportunities
- Allow for custom code blocks and complex integrations
- Focus on performance and scalability considerations`,
      variables: [],
      category: "system",
    });
  }

  /**
   * Get domain-specific template
   */
  private getDomainTemplate(domain: string): PromptTemplate | null {
    const domainId = `domain_${domain.toLowerCase()}`;
    return this.templates.get(domainId) || null;
  }

  /**
   * Get user level template
   */
  private getUserLevelTemplate(level: string): PromptTemplate {
    const levelId = `user_${level.toLowerCase()}`;
    return (
      this.templates.get(levelId) || this.templates.get("user_intermediate")!
    );
  }

  /**
   * Validate template variables
   */
  validateTemplate(
    template: PromptTemplate,
    variables: Record<string, unknown>
  ): string[] {
    const missingVars: string[] = [];

    for (const variable of template.variables) {
      if (!(variable in variables)) {
        missingVars.push(variable);
      }
    }

    return missingVars;
  }

  /**
   * Render template with variables
   */
  renderTemplate(
    templateId: string,
    variables: Record<string, unknown>
  ): string {
    const template = this.getTemplate(templateId);
    const missingVars = this.validateTemplate(template, variables);

    if (missingVars.length > 0) {
      throw new Error(`Missing template variables: ${missingVars.join(", ")}`);
    }

    let rendered = template.template;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      const replacement =
        typeof value === "string" ? value : JSON.stringify(value);
      rendered = rendered.replace(new RegExp(placeholder, "g"), replacement);
    }

    return rendered;
  }

  /**
   * A/B test different prompt variations
   */
  async abTestPrompts(
    baseTemplateId: string,
    variations: Array<{ id: string; changes: Record<string, string> }>,
    variables: Record<string, unknown>
  ): Promise<Array<{ id: string; prompt: string }>> {
    const results: Array<{ id: string; prompt: string }> = [];

    // Base version
    results.push({
      id: "base",
      prompt: this.renderTemplate(baseTemplateId, variables),
    });

    // Variations
    for (const variation of variations) {
      const template = { ...this.getTemplate(baseTemplateId) };

      // Apply changes
      for (const [key, change] of Object.entries(variation.changes)) {
        template.template = template.template.replace(key, change);
      }

      // Render with variables
      let rendered = template.template;
      for (const [key, value] of Object.entries(variables)) {
        const placeholder = `{{${key}}}`;
        const replacement =
          typeof value === "string" ? value : JSON.stringify(value);
        rendered = rendered.replace(new RegExp(placeholder, "g"), replacement);
      }

      results.push({
        id: variation.id,
        prompt: rendered,
      });
    }

    return results;
  }
}
