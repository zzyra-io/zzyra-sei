# User Journeys

## Example: Claim Airdrop and Notify
1. User describes: "Alert me when my wallet is eligible for an airdrop."
2. AI generates workflow: Monitor Wallet → Claim Airdrop → Send Notification.
3. User customizes in the visual builder.
4. Workflow runs and user receives notification.

## Example: DeFi Portfolio Rebalancing
1. User drags Monitor Wallet, Rebalance Portfolio, and Send Report blocks.
2. Sets schedule to every 12 hours.
3. AI suggests optimal rebalancing strategies.
4. User reviews and activates automation.

## Example: Google Drive File Monitoring
1. User clicks "Generate with AI" in the Custom Blocks tab.
2. User enters: "Create a custom block that monitors a specific Google Drive folder for any new files. It should trigger whenever a new file is added and pass the file metadata (name, type, link, timestamp) to the next block in the workflow."
3. AI generates a custom block with appropriate inputs (folderId, checkIntervalSeconds, credentials) and outputs (fileName, fileType, fileLink, createdTime, fileMetadata).
4. User drags the generated block into their workflow and connects it to a notification block.
5. User configures the block with their Google Drive folder ID and credentials.
6. Workflow runs on schedule and sends notifications when new files are detected.
