-- CreateEnum
CREATE TYPE "session_key_status" AS ENUM ('active', 'expired', 'revoked', 'paused');

-- CreateEnum
CREATE TYPE "security_level" AS ENUM ('basic', 'enhanced', 'maximum');

-- CreateTable
CREATE TABLE "session_keys" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "chain_id" TEXT NOT NULL,
    "session_public_key" TEXT NOT NULL,
    "encrypted_private_key" TEXT NOT NULL,
    "nonce" BIGSERIAL NOT NULL,
    "security_level" "security_level" NOT NULL DEFAULT 'basic',
    "status" "session_key_status" NOT NULL DEFAULT 'active',
    "valid_until" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "total_used_amount" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "daily_used_amount" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "last_used_at" TIMESTAMP(3),
    "daily_reset_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_permissions" (
    "id" TEXT NOT NULL,
    "session_key_id" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "max_amount_per_tx" DECIMAL(20,8) NOT NULL,
    "max_daily_amount" DECIMAL(20,8) NOT NULL,
    "allowed_contracts" TEXT[],
    "require_confirmation" BOOLEAN NOT NULL DEFAULT false,
    "emergency_stop" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_transactions" (
    "id" TEXT NOT NULL,
    "session_key_id" TEXT NOT NULL,
    "workflow_execution_id" TEXT,
    "transaction_hash" TEXT,
    "chain_id" TEXT NOT NULL,
    "from_address" TEXT NOT NULL,
    "to_address" TEXT NOT NULL,
    "amount" DECIMAL(20,8) NOT NULL,
    "operation" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "gas_used" BIGINT,
    "gas_price" BIGINT,
    "block_number" BIGINT,
    "metadata" JSONB,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),

    CONSTRAINT "session_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_events" (
    "id" TEXT NOT NULL,
    "session_key_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "event_data" JSONB NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "ip_address" TEXT,
    "user_agent" TEXT,
    "location" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "session_keys_user_id_idx" ON "session_keys"("user_id");

-- CreateIndex
CREATE INDEX "session_keys_wallet_address_idx" ON "session_keys"("wallet_address");

-- CreateIndex
CREATE INDEX "session_keys_chain_id_idx" ON "session_keys"("chain_id");

-- CreateIndex
CREATE INDEX "session_keys_status_idx" ON "session_keys"("status");

-- CreateIndex
CREATE INDEX "session_keys_valid_until_idx" ON "session_keys"("valid_until");

-- CreateIndex
CREATE INDEX "session_keys_created_at_idx" ON "session_keys"("created_at");

-- CreateIndex
CREATE INDEX "session_permissions_session_key_id_idx" ON "session_permissions"("session_key_id");

-- CreateIndex
CREATE INDEX "session_permissions_operation_idx" ON "session_permissions"("operation");

-- CreateIndex
CREATE UNIQUE INDEX "session_permissions_session_key_id_operation_key" ON "session_permissions"("session_key_id", "operation");

-- CreateIndex
CREATE INDEX "session_transactions_session_key_id_idx" ON "session_transactions"("session_key_id");

-- CreateIndex
CREATE INDEX "session_transactions_workflow_execution_id_idx" ON "session_transactions"("workflow_execution_id");

-- CreateIndex
CREATE INDEX "session_transactions_transaction_hash_idx" ON "session_transactions"("transaction_hash");

-- CreateIndex
CREATE INDEX "session_transactions_chain_id_idx" ON "session_transactions"("chain_id");

-- CreateIndex
CREATE INDEX "session_transactions_status_idx" ON "session_transactions"("status");

-- CreateIndex
CREATE INDEX "session_transactions_created_at_idx" ON "session_transactions"("created_at");

-- CreateIndex
CREATE INDEX "session_events_session_key_id_idx" ON "session_events"("session_key_id");

-- CreateIndex
CREATE INDEX "session_events_event_type_idx" ON "session_events"("event_type");

-- CreateIndex
CREATE INDEX "session_events_severity_idx" ON "session_events"("severity");

-- CreateIndex
CREATE INDEX "session_events_created_at_idx" ON "session_events"("created_at");

-- AddForeignKey
ALTER TABLE "session_keys" ADD CONSTRAINT "session_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_permissions" ADD CONSTRAINT "session_permissions_session_key_id_fkey" FOREIGN KEY ("session_key_id") REFERENCES "session_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_transactions" ADD CONSTRAINT "session_transactions_session_key_id_fkey" FOREIGN KEY ("session_key_id") REFERENCES "session_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_transactions" ADD CONSTRAINT "session_transactions_workflow_execution_id_fkey" FOREIGN KEY ("workflow_execution_id") REFERENCES "workflow_executions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_events" ADD CONSTRAINT "session_events_session_key_id_fkey" FOREIGN KEY ("session_key_id") REFERENCES "session_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE;
