-- CreateTable
CREATE TABLE "ai_agent_executions" (
    "id" TEXT NOT NULL,
    "execution_id" TEXT NOT NULL,
    "node_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "agent_config" JSONB NOT NULL,
    "tools_config" JSONB NOT NULL,
    "execution_config" JSONB NOT NULL DEFAULT '{}',
    "thinking_steps" JSONB NOT NULL DEFAULT '[]',
    "tool_calls" JSONB NOT NULL DEFAULT '[]',
    "security_violations" JSONB NOT NULL DEFAULT '[]',
    "performance_metrics" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "total_tokens" INTEGER,
    "execution_time_ms" INTEGER,
    "result" TEXT,
    "error" TEXT,
    "error_code" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_agent_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mcp_servers" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "command" TEXT NOT NULL,
    "args" JSONB NOT NULL DEFAULT '[]',
    "env" JSONB NOT NULL DEFAULT '{}',
    "timeout" INTEGER NOT NULL DEFAULT 30000,
    "tools" JSONB NOT NULL DEFAULT '[]',
    "resources" JSONB NOT NULL DEFAULT '[]',
    "capabilities" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'connected',
    "last_health_check" TIMESTAMP(3),
    "health_check_interval" INTEGER NOT NULL DEFAULT 300000,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "max_concurrent_calls" INTEGER NOT NULL DEFAULT 5,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mcp_servers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_agent_security_events" (
    "id" TEXT NOT NULL,
    "execution_id" TEXT,
    "ai_agent_execution_id" TEXT,
    "user_id" TEXT NOT NULL,
    "violation_type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "description" TEXT NOT NULL,
    "violation_data" JSONB,
    "blocked_action" TEXT NOT NULL,
    "evidence" JSONB NOT NULL DEFAULT '{}',
    "user_prompt" TEXT,
    "system_prompt" TEXT,
    "tool_name" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "action_taken" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" TIMESTAMP(3),
    "resolved_by" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_agent_security_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goat_wallet_configs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "wallet_type" TEXT NOT NULL,
    "network_id" TEXT NOT NULL,
    "address" TEXT,
    "encrypted_config" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_used" TIMESTAMP(3),
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goat_wallet_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goat_transactions" (
    "id" TEXT NOT NULL,
    "wallet_config_id" TEXT NOT NULL,
    "execution_id" TEXT,
    "transaction_hash" TEXT,
    "network_id" TEXT NOT NULL,
    "to_address" TEXT NOT NULL,
    "value" TEXT,
    "gas_used" TEXT,
    "gas_price" TEXT,
    "tool_name" TEXT,
    "tool_parameters" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "block_number" TEXT,
    "confirmations" INTEGER NOT NULL DEFAULT 0,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" TIMESTAMP(3),
    "error" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB DEFAULT '{}',

    CONSTRAINT "goat_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mcp_tool_calls" (
    "id" TEXT NOT NULL,
    "server_id" TEXT NOT NULL,
    "execution_id" TEXT,
    "tool_name" TEXT NOT NULL,
    "parameters" JSONB NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "success" BOOLEAN,
    "result" JSONB,
    "error" TEXT,
    "execution_time_ms" INTEGER,
    "metadata" JSONB DEFAULT '{}',

    CONSTRAINT "mcp_tool_calls_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_agent_executions_execution_id_idx" ON "ai_agent_executions"("execution_id");

-- CreateIndex
CREATE INDEX "ai_agent_executions_user_id_idx" ON "ai_agent_executions"("user_id");

-- CreateIndex
CREATE INDEX "ai_agent_executions_node_id_idx" ON "ai_agent_executions"("node_id");

-- CreateIndex
CREATE INDEX "ai_agent_executions_status_idx" ON "ai_agent_executions"("status");

-- CreateIndex
CREATE INDEX "ai_agent_executions_provider_idx" ON "ai_agent_executions"("provider");

-- CreateIndex
CREATE INDEX "mcp_servers_user_id_idx" ON "mcp_servers"("user_id");

-- CreateIndex
CREATE INDEX "mcp_servers_status_idx" ON "mcp_servers"("status");

-- CreateIndex
CREATE INDEX "mcp_servers_is_active_idx" ON "mcp_servers"("is_active");

-- CreateIndex
CREATE INDEX "mcp_servers_is_public_idx" ON "mcp_servers"("is_public");

-- CreateIndex
CREATE UNIQUE INDEX "mcp_servers_user_id_name_key" ON "mcp_servers"("user_id", "name");

-- CreateIndex
CREATE INDEX "ai_agent_security_events_execution_id_idx" ON "ai_agent_security_events"("execution_id");

-- CreateIndex
CREATE INDEX "ai_agent_security_events_ai_agent_execution_id_idx" ON "ai_agent_security_events"("ai_agent_execution_id");

-- CreateIndex
CREATE INDEX "ai_agent_security_events_user_id_idx" ON "ai_agent_security_events"("user_id");

-- CreateIndex
CREATE INDEX "ai_agent_security_events_violation_type_idx" ON "ai_agent_security_events"("violation_type");

-- CreateIndex
CREATE INDEX "ai_agent_security_events_severity_idx" ON "ai_agent_security_events"("severity");

-- CreateIndex
CREATE INDEX "ai_agent_security_events_resolved_idx" ON "ai_agent_security_events"("resolved");

-- CreateIndex
CREATE INDEX "goat_wallet_configs_user_id_idx" ON "goat_wallet_configs"("user_id");

-- CreateIndex
CREATE INDEX "goat_wallet_configs_network_id_idx" ON "goat_wallet_configs"("network_id");

-- CreateIndex
CREATE INDEX "goat_wallet_configs_is_active_idx" ON "goat_wallet_configs"("is_active");

-- CreateIndex
CREATE INDEX "goat_wallet_configs_address_idx" ON "goat_wallet_configs"("address");

-- CreateIndex
CREATE UNIQUE INDEX "goat_wallet_configs_user_id_name_key" ON "goat_wallet_configs"("user_id", "name");

-- CreateIndex
CREATE INDEX "goat_transactions_wallet_config_id_idx" ON "goat_transactions"("wallet_config_id");

-- CreateIndex
CREATE INDEX "goat_transactions_execution_id_idx" ON "goat_transactions"("execution_id");

-- CreateIndex
CREATE INDEX "goat_transactions_transaction_hash_idx" ON "goat_transactions"("transaction_hash");

-- CreateIndex
CREATE INDEX "goat_transactions_network_id_idx" ON "goat_transactions"("network_id");

-- CreateIndex
CREATE INDEX "goat_transactions_status_idx" ON "goat_transactions"("status");

-- CreateIndex
CREATE INDEX "goat_transactions_submitted_at_idx" ON "goat_transactions"("submitted_at");

-- CreateIndex
CREATE INDEX "mcp_tool_calls_server_id_idx" ON "mcp_tool_calls"("server_id");

-- CreateIndex
CREATE INDEX "mcp_tool_calls_execution_id_idx" ON "mcp_tool_calls"("execution_id");

-- CreateIndex
CREATE INDEX "mcp_tool_calls_tool_name_idx" ON "mcp_tool_calls"("tool_name");

-- CreateIndex
CREATE INDEX "mcp_tool_calls_started_at_idx" ON "mcp_tool_calls"("started_at");

-- CreateIndex
CREATE INDEX "mcp_tool_calls_success_idx" ON "mcp_tool_calls"("success");

-- AddForeignKey
ALTER TABLE "ai_agent_executions" ADD CONSTRAINT "ai_agent_executions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_agent_executions" ADD CONSTRAINT "ai_agent_executions_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "workflow_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mcp_servers" ADD CONSTRAINT "mcp_servers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_agent_security_events" ADD CONSTRAINT "ai_agent_security_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_agent_security_events" ADD CONSTRAINT "ai_agent_security_events_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "workflow_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_agent_security_events" ADD CONSTRAINT "ai_agent_security_events_ai_agent_execution_id_fkey" FOREIGN KEY ("ai_agent_execution_id") REFERENCES "ai_agent_executions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goat_wallet_configs" ADD CONSTRAINT "goat_wallet_configs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goat_transactions" ADD CONSTRAINT "goat_transactions_wallet_config_id_fkey" FOREIGN KEY ("wallet_config_id") REFERENCES "goat_wallet_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mcp_tool_calls" ADD CONSTRAINT "mcp_tool_calls_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "mcp_servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
