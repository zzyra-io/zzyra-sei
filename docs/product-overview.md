# Product Overview: Zyra - AI Workflow Automation

## Vision

Zyra aims to be the leading AI-driven, blockchain-focused workflow automation platform. We empower individuals and teams, regardless of technical expertise, to design, execute, and monitor complex on-chain and off-chain workflows through an intuitive visual interface, augmented by powerful AI capabilities.

## Target Users

-   **DeFi Traders & Yield Farmers:** Automating strategies, monitoring positions, managing assets across protocols.
-   **NFT Collectors & Creators:** Automating minting alerts, floor price tracking, collection management, batch operations.
-   **Protocol Teams & DAOs:** Automating governance actions, treasury management, community notifications, on-chain monitoring.
-   **Web3 Developers & Power Users:** Building complex integrations, automating repetitive tasks, prototyping interactions.
-   **Non-Technical Users:** Providing accessible tools to interact with Web3 services without writing code.

## Core Features & Differentiators

-   **AI-Powered Workflow & Block Generation:**
    -   Generate entire workflow structures from natural language prompts.
    -   Generate custom block logic (JavaScript code) and configuration (inputs, outputs, config fields with detailed schemas including descriptions, data types, required status) using AI (OpenRouter/Ollama).
    -   AI assists in suggesting connections and potential next steps.
-   **Visual Drag-and-Drop Builder:**
    -   Intuitive interface built with React Flow for designing and modifying workflows.
    -   Catalog of pre-built and custom blocks for various Web3 and general tasks (Logic, Data, Integrations, AI, Web3, Finance).
-   **Resilient Workflow Execution Engine:**
    -   Decoupled NestJS worker service processes workflows asynchronously via a Supabase/PostgreSQL queue.
    -   Robust error handling, retry logic (`retry_count`), and locking (`locked_by`) mechanism for reliable execution (See memory `a1b5e606`).
    -   Detailed execution and node-level logging stored in the database.
-   **Custom Block Ecosystem:**
    -   Users can create and share reusable custom blocks, extending the platform's capabilities.
    -   AI assistance simplifies the creation of these blocks.
-   **Multi-Chain & Integration Focus:**
    -   Designed to support interactions with various blockchain networks (via Ethers.js/Viem).
    -   Easily integrate with external APIs and services through custom blocks.
-   **Analytics & Monitoring (Planned):**
    -   Provide insights into workflow performance, costs, and success rates.
    -   Predict potential failures or optimization opportunities using AI.
-   **Comprehensive Notification System (Planned):**
    -   Multi-channel alerts (Email, Telegram, Discord) for critical events.

## Value Proposition

Zyra saves users significant time and effort by automating complex or repetitive Web3 tasks. It reduces the risk of manual errors, provides powerful capabilities without requiring deep technical knowledge, and serves as a flexible platform for innovation in the Web3 space.

## Future Roadmap (Highlights)

-   **Notification System Implementation (Phase 1-3):**
    -   Database schema (`notification_preferences`, `logs`, `templates`).
    -   Backend Notification Service & Queue integration.
    -   Channel Handlers (Email first, then Telegram/Discord).
    -   Frontend UI for preferences and viewing notifications.
    -   Real-time alerts (WebSockets).
    -   Notification Types: Workflow Started/Completed/Failed, Node Errors, Quota Alerts, System Updates. (See memory `53b503e2`)
-   **Enhanced AI Capabilities:**
    -   AI-driven error diagnosis and suggested fixes.
    -   Predictive analytics for workflow performance.
    -   More sophisticated workflow generation and modification prompts.
-   **Expanded Block Catalog:**
    -   More pre-built blocks for popular DeFi protocols, NFT marketplaces, and L2s.
    -   Integrations with more off-chain services.
-   **Collaboration Features:**
    -   Sharing workflows and custom blocks within teams or publicly.
-   **Advanced Scheduling & Triggering:**
    -   More flexible scheduling options (cron expressions).
    -   Event-based triggers (e.g., contract events, webhook triggers).
-   **Refined UI/UX:**
    -   Continuous improvements based on user feedback.
    -   Enhanced dashboard visualizations.
