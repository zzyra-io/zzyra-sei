-- AlterTable
ALTER TABLE "session_keys" ADD COLUMN     "entry_point" TEXT,
ADD COLUMN     "provider_type" TEXT NOT NULL DEFAULT 'dynamic_zerodev',
ADD COLUMN     "smart_account_factory" TEXT,
ADD COLUMN     "smart_account_metadata" JSONB NOT NULL DEFAULT '{}';

-- CreateIndex
CREATE INDEX "session_keys_provider_type_idx" ON "session_keys"("provider_type");

-- CreateIndex
CREATE INDEX "session_keys_chain_id_provider_type_idx" ON "session_keys"("chain_id", "provider_type");
