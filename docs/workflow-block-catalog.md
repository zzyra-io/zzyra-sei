# Workflow Block Catalog

## Core Blocks
- Monitor Wallet
- Claim Airdrop
- Swap Token
- Send Notification
- Rebalance Portfolio
- Fetch Airdrop Proof
- Estimate Gas

## Block Template Example
| Block Name         | Description                          | Inputs                | Outputs          |
|--------------------|--------------------------------------|-----------------------|------------------|
| Monitor Wallet     | Watches wallet for activity/events   | Wallet Address, Chain | Event Data       |
| Claim Airdrop      | Claims available airdrops            | Wallet, Proof         | Tx Receipt       |
| Swap Token         | Swaps tokens via DEX                 | Token In, Token Out   | Tx Receipt       |
| Send Notification  | Sends user a notification            | Message, Channel      | Delivery Status  |
| ...                | ...                                  | ...                   | ...              |

## Custom Block Catalog Component

The `CustomBlockCatalog` React component provides a fully-featured UI for managing user-defined workflow blocks:

- **Category Tabs**: Filter blocks by category or view all.
- **Search**: Live search on block names and descriptions.
- **Drag-and-Drop**: Drag blocks into the workflow builder.
- **CRUD Actions**:
  - **Create**: Define a new block via a dialog.
  - **Edit**: Modify existing block properties.
  - **Duplicate**: Clone a block configuration.
  - **Delete**: Remove blocks with confirmation.
- **AI Generation**: Generate blocks from natural-language prompts.

### Props
| Name                   | Type                                           | Description                                      |
|------------------------|------------------------------------------------|--------------------------------------------------|
| `blocks`               | `CustomBlockDefinition[]`                      | Array of custom block definitions to display.    |
| `onEdit`               | `(block) => void`                              | Callback when a block is saved after editing.    |
| `onDuplicate`          | `(block) => void`                              | Callback when duplicating a block.               |
| `onDelete`             | `(block) => void`                              | Callback when confirming block deletion.         |
| `onDragStart?`         | `(e, block) => void`                           | Optional drag-start handler for workflow insert. |
| `onGenerateCustomBlock`| `(prompt: string) => Promise<void>`            | Generate a new block via AI and append to list.  |

### Usage Example
```tsx
import { CustomBlockCatalog } from '@/components/custom-block-catalog'

<CustomBlockCatalog
  blocks={customBlocks}
  onEdit={handleEditBlock}
  onDuplicate={handleDuplicateBlock}
  onDelete={handleDeleteBlock}
  onDragStart={handleDragBlock}
  onGenerateCustomBlock={async (prompt) => {
    const newBlock = await ai.generateBlock(prompt)
    setCustomBlocks([...customBlocks, newBlock])
  }}
/>
```

For more details, see the component source: `ui/components/custom-block-catalog.tsx`.
