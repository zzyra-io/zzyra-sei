# Feature Roadmap

This document outlines the planned features and development phases for Zyra.

## Current State / Recently Completed (Q1/Q2 2025 - Est.)

-   **Core Platform:**
    -   Visual Drag-and-Drop Workflow Builder (React Flow)
    -   User Authentication & Workflow Persistence (Supabase)
    -   Monorepo Structure (`ui` + `zyra-worker`)
    -   Resilient Asynchronous Workflow Execution Engine (NestJS Worker, Supabase Queue, Retry/Locking Logic)
    -   Basic Execution Logging (`workflow_executions`, `node_logs`)
    -   pnpm Workspace Setup
    -   Database Migrations Management (`ui/supabase/migrations`)
-   **AI Integration:**
    -   AI-Powered Workflow Generation (Natural Language -> Workflow JSON)
    -   AI-Powered Custom Block Generation (Prompt -> Block Config + JS Code, incl. detailed input/output schema) via OpenRouter/Ollama
-   **Block Catalog:**
    -   Initial set of core blocks (Logic, Data, Web3 basics, AI)
    -   Custom Block creation and usage within workflows

## Phase 1: Near-Term Focus (Next 1-3 Months - Est.)

-   **Notification System (Phase 1):**
    -   Database Schema: `notification_preferences`, `notification_logs`, `notification_templates` tables (See memory `53b503e2`)
    -   Backend: Basic Notification Service in Worker, Queue integration.
    -   Channel Handler: Implement Email notifications (e.g., using SendGrid/Resend).
    -   Basic Triggers: Notify on Workflow Completion/Failure.
-   **AI Enhancements:**
    -   AI-Driven Error Diagnosis: Initial version analyzing `node_logs` to suggest potential causes of failure.
    -   Improved Prompt Engineering: Refine system prompts for more accurate/robust workflow & block generation.
    -   Stricter AI Response Validation: Enhance Zod schemas for generated content.
-   **UI/UX Refinements:**
    -   Address critical usability feedback on the workflow builder.
    -   Improve dashboard overview and workflow status visibility.
    -   Enhance visual feedback during AI generation.
-   **Block Catalog Expansion:**
    -   Add high-priority blocks based on user needs (e.g., specific DeFi protocol interactions, more data sources).

## Phase 2: Mid-Term Goals (Next 3-6 Months - Est.)

-   **Notification System (Phase 2):**
    -   Additional Channels: Implement Telegram & Discord notification handlers.
    -   Frontend UI: User settings page for notification preferences (channels, triggers).
    -   Frontend UI: View notification logs/history.
-   **AI Enhancements:**
    -   Predictive Analytics: Basic gas fee prediction, potential workflow failure warnings.
    -   AI Block Recommendations: Suggest relevant blocks during workflow building.
-   **Core Platform Features:**
    -   Advanced Scheduling: Implement cron-based workflow scheduling.
    -   Event Triggers: Basic webhook triggers, simple on-chain event triggers.
    -   Collaboration: Basic workflow sharing (read-only or copy).
-   **Billing & Monetization:**
    -   Integrate billing provider (Stripe / LemonSqueezy).
    -   Implement subscription plans and usage quotas.

## Phase 3 / Long-Term Vision (6+ Months - Est.)

-   **Notification System (Phase 3):**
    -   Real-time Notifications: Implement WebSocket integration for instant UI updates/alerts.
    -   Template Management: UI for creating/editing notification message templates.
    -   Advanced Features: Notification batching, throttling, user-defined alert conditions.
-   **Multi-Chain & Integrations:**
    -   Formal support and testing for additional L1s/L2s.
    -   Expanded catalog of pre-built integrations (off-chain services).
-   **Plugin/Block Marketplace:**
    -   Allow users to publish and share/sell custom blocks.
    -   Verification and security review process for marketplace blocks.
-   **Advanced Collaboration & Teams:**
    -   Team accounts with role-based access control.
    -   Workflow versioning and rollback.
    -   Detailed audit logs.
-   **Advanced AI & Agents:**
    -   More sophisticated AI-driven optimization suggestions.
    -   Support for custom agent scripting beyond individual blocks.
    -   Potential for autonomous workflow adaptation based on conditions.
