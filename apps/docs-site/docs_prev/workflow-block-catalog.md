# Workflow Block Catalog

This document provides a catalog of the standard built-in blocks available in Zzyra, as well as information about custom blocks. Blocks are the fundamental building units of workflows.

## Standard Blocks

Standard blocks provide pre-built functionality for common tasks. They are categorized below based on their primary function.

### Triggers

These blocks initiate workflow executions based on external events or schedules.

| Block Name        | Description                                               | Inputs Example        | Outputs Example       | Handler File                  |
| ----------------- | --------------------------------------------------------- | --------------------- | --------------------- | ----------------------------- |
| **Schedule**      | Triggers the workflow on a defined schedule (e.g., cron). | Cron String, Timezone | Trigger Timestamp     | `ScheduleBlockHandler.ts`     |
| **Webhook**       | Triggers the workflow when an HTTP request is received.   | HTTP Method, Path     | Request Body, Headers | `WebhookBlockHandler.ts`      |
| **Price Monitor** | Triggers when a specific asset price condition is met.    | Asset Pair, Condition | Price Data, Timestamp | `PriceMonitorBlockHandler.ts` |

### AI & LLM

Blocks leveraging Artificial Intelligence and Large Language Models.

| Block Name        | Description                                        | Inputs Example          | Outputs Example     | Handler File               |
| ----------------- | -------------------------------------------------- | ----------------------- | ------------------- | -------------------------- |
| **LLM Prompt**    | Sends a prompt to an LLM and returns the response. | Prompt, Model, API Key  | Generated Text      | `LLMPromptBlockHandler.ts` |
| **AI Blockchain** | Performs AI-driven analysis or actions on-chain.   | Task Description, Chain | Analysis Result, Tx | `AIBlockchain.ts`          |

### Blockchain & Web3

Blocks for interacting with blockchain networks and wallets.

| Block Name        | Description                                          | Inputs Example          | Outputs Example  | Handler File                     |
| ----------------- | ---------------------------------------------------- | ----------------------- | ---------------- | -------------------------------- |
| **Wallet Action** | Performs actions like checking balance, signing tx.  | Wallet Address, Action  | Balance, Tx Hash | `WalletBlockHandler.ts`          |
| **Transaction**   | Sends a specific transaction (e.g., transfer, call). | To Address, Value, Data | Tx Receipt       | `TransactionBlockHandler.ts`     |
| _(Claim Airdrop)_ | _(Likely uses Wallet/Transaction)_                   | Wallet, Contract, Proof | Tx Receipt       | _(Implied, uses other handlers)_ |
| _(Swap Token)_    | _(Likely uses Transaction)_                          | DEX Address, Tokens     | Tx Receipt       | _(Implied, uses other handlers)_ |

### Notifications

Blocks for sending alerts and messages.

| Block Name       | Description                                    | Inputs Example       | Outputs Example | Handler File                  |
| ---------------- | ---------------------------------------------- | -------------------- | --------------- | ----------------------------- |
| **Email**        | Sends an email notification.                   | To, Subject, Body    | Delivery Status | `EmailBlockHandler.ts`        |
| **Discord**      | Sends a message to a Discord channel/user.     | Webhook URL, Message | Delivery Status | `DiscordBlockHandler.ts`      |
| **Notification** | Sends a notification via a configured service. | User ID, Message     | Delivery Status | `NotificationBlockHandler.ts` |

### Data & Integration

Blocks for interacting with data sources and external systems.

| Block Name   | Description                                   | Inputs Example     | Outputs Example      | Handler File              |
| ------------ | --------------------------------------------- | ------------------ | -------------------- | ------------------------- |
| **Database** | Reads from or writes to the database.         | Table, Query/Data  | Query Result, Status | `DatabaseBlockHandler.ts` |
| **Metrics**  | Records metrics or interacts with monitoring. | Metric Name, Value | Status               | `MetricsBlockHandler.ts`  |

### Custom Logic

| Block Name       | Description                                 | Inputs Example       | Outputs Example      | Handler File                 |
| ---------------- | ------------------------------------------- | -------------------- | -------------------- | ---------------------------- |
| **Dynamic Code** | Executes provided JavaScript code securely. | Code Snippet, Inputs | Script Output, Error | `DynamicBlockHandler.ts` (?) |

## Custom Blocks

Beyond the standard blocks, Zzyra allows users to create their own **Custom Blocks**.

- **Definition:** Users can define the name, description, category, inputs, outputs, and execution logic (JavaScript) for a custom block.
- **Creation:** Custom blocks can be created manually through the UI or generated using AI by providing a natural language description of the desired functionality.
- **Execution:** When a custom block is encountered in a workflow, its defined JavaScript code is executed by the `CustomBlockHandler.ts` in the backend worker.
- **Management:** The UI provides tools to create, edit, duplicate, delete, and organize custom blocks (as previously documented in the `CustomBlockCatalog` component section, which should ideally be moved to component-specific documentation).

---

_Note: The specific inputs and outputs listed are examples and may vary based on the exact configuration and implementation within the handlers._
