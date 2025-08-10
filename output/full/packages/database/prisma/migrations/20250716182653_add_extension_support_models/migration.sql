-- CreateTable
CREATE TABLE "rate_limit_buckets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "identifier" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "window_start" TIMESTAMP(3) NOT NULL,
    "window_end" TIMESTAMP(3) NOT NULL,
    "current_count" INTEGER NOT NULL DEFAULT 0,
    "limit" INTEGER NOT NULL,
    "reset_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limit_buckets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limit_violations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "identifier" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "limit" INTEGER NOT NULL,
    "attempted_count" INTEGER NOT NULL,
    "window_start" TIMESTAMP(3) NOT NULL,
    "window_end" TIMESTAMP(3) NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rate_limit_violations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cache_entries" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "namespace" TEXT,
    "value" JSONB NOT NULL,
    "ttl" INTEGER,
    "expires_at" TIMESTAMP(3),
    "hit_count" INTEGER NOT NULL DEFAULT 0,
    "last_accessed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "compressed" BOOLEAN NOT NULL DEFAULT false,
    "size" INTEGER,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cache_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cache_stats" (
    "id" TEXT NOT NULL,
    "namespace" TEXT,
    "operation" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "total_size" BIGINT,
    "avg_response_time" DOUBLE PRECISION,
    "hour" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cache_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "query_performance" (
    "id" TEXT NOT NULL,
    "query_hash" TEXT NOT NULL,
    "query_type" TEXT NOT NULL,
    "table_name" TEXT,
    "execution_time" DOUBLE PRECISION NOT NULL,
    "rows_affected" INTEGER,
    "query_plan" JSONB,
    "stack_trace" TEXT,
    "user_id" TEXT,
    "session_id" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "query_performance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_analytics" (
    "id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "execution_id" TEXT,
    "user_id" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "dimensions" JSONB,
    "aggregation_period" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_metrics" (
    "id" TEXT NOT NULL,
    "component" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "hostname" TEXT,
    "instance_id" TEXT,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "session_id" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resource_id" TEXT,
    "compliance_framework" TEXT NOT NULL,
    "risk_level" TEXT NOT NULL,
    "data_classification" TEXT,
    "before_value" JSONB,
    "after_value" JSONB,
    "reason" TEXT,
    "approved_by" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "location" JSONB,
    "metadata" JSONB,
    "retention_policy" TEXT,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_change_logs" (
    "id" TEXT NOT NULL,
    "table_name" TEXT NOT NULL,
    "record_id" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "field_changes" JSONB NOT NULL,
    "user_id" TEXT,
    "session_id" TEXT,
    "transaction_id" TEXT,
    "change_reason" TEXT,
    "application_version" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "data_change_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_state_snapshots" (
    "id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "execution_id" TEXT NOT NULL,
    "snapshot_type" TEXT NOT NULL,
    "state" JSONB NOT NULL,
    "node_states" JSONB NOT NULL,
    "context" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "parent_snapshot_id" TEXT,
    "created_by" TEXT,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_state_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rate_limit_buckets_user_id_idx" ON "rate_limit_buckets"("user_id");

-- CreateIndex
CREATE INDEX "rate_limit_buckets_identifier_idx" ON "rate_limit_buckets"("identifier");

-- CreateIndex
CREATE INDEX "rate_limit_buckets_operation_idx" ON "rate_limit_buckets"("operation");

-- CreateIndex
CREATE INDEX "rate_limit_buckets_reset_at_idx" ON "rate_limit_buckets"("reset_at");

-- CreateIndex
CREATE UNIQUE INDEX "rate_limit_buckets_identifier_operation_window_start_key" ON "rate_limit_buckets"("identifier", "operation", "window_start");

-- CreateIndex
CREATE INDEX "rate_limit_violations_user_id_idx" ON "rate_limit_violations"("user_id");

-- CreateIndex
CREATE INDEX "rate_limit_violations_identifier_idx" ON "rate_limit_violations"("identifier");

-- CreateIndex
CREATE INDEX "rate_limit_violations_operation_idx" ON "rate_limit_violations"("operation");

-- CreateIndex
CREATE INDEX "rate_limit_violations_created_at_idx" ON "rate_limit_violations"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "cache_entries_key_key" ON "cache_entries"("key");

-- CreateIndex
CREATE INDEX "cache_entries_namespace_idx" ON "cache_entries"("namespace");

-- CreateIndex
CREATE INDEX "cache_entries_expires_at_idx" ON "cache_entries"("expires_at");

-- CreateIndex
CREATE INDEX "cache_entries_tags_idx" ON "cache_entries"("tags");

-- CreateIndex
CREATE INDEX "cache_entries_last_accessed_idx" ON "cache_entries"("last_accessed");

-- CreateIndex
CREATE INDEX "cache_stats_namespace_idx" ON "cache_stats"("namespace");

-- CreateIndex
CREATE INDEX "cache_stats_operation_idx" ON "cache_stats"("operation");

-- CreateIndex
CREATE INDEX "cache_stats_hour_idx" ON "cache_stats"("hour");

-- CreateIndex
CREATE UNIQUE INDEX "cache_stats_namespace_operation_hour_key" ON "cache_stats"("namespace", "operation", "hour");

-- CreateIndex
CREATE INDEX "query_performance_query_hash_idx" ON "query_performance"("query_hash");

-- CreateIndex
CREATE INDEX "query_performance_query_type_idx" ON "query_performance"("query_type");

-- CreateIndex
CREATE INDEX "query_performance_table_name_idx" ON "query_performance"("table_name");

-- CreateIndex
CREATE INDEX "query_performance_execution_time_idx" ON "query_performance"("execution_time");

-- CreateIndex
CREATE INDEX "query_performance_timestamp_idx" ON "query_performance"("timestamp");

-- CreateIndex
CREATE INDEX "query_performance_user_id_idx" ON "query_performance"("user_id");

-- CreateIndex
CREATE INDEX "workflow_analytics_workflow_id_idx" ON "workflow_analytics"("workflow_id");

-- CreateIndex
CREATE INDEX "workflow_analytics_user_id_idx" ON "workflow_analytics"("user_id");

-- CreateIndex
CREATE INDEX "workflow_analytics_metric_idx" ON "workflow_analytics"("metric");

-- CreateIndex
CREATE INDEX "workflow_analytics_aggregation_period_idx" ON "workflow_analytics"("aggregation_period");

-- CreateIndex
CREATE INDEX "workflow_analytics_period_start_idx" ON "workflow_analytics"("period_start");

-- CreateIndex
CREATE INDEX "system_metrics_component_idx" ON "system_metrics"("component");

-- CreateIndex
CREATE INDEX "system_metrics_metric_idx" ON "system_metrics"("metric");

-- CreateIndex
CREATE INDEX "system_metrics_hostname_idx" ON "system_metrics"("hostname");

-- CreateIndex
CREATE INDEX "system_metrics_timestamp_idx" ON "system_metrics"("timestamp");

-- CreateIndex
CREATE INDEX "compliance_audit_logs_user_id_idx" ON "compliance_audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "compliance_audit_logs_action_idx" ON "compliance_audit_logs"("action");

-- CreateIndex
CREATE INDEX "compliance_audit_logs_resource_idx" ON "compliance_audit_logs"("resource");

-- CreateIndex
CREATE INDEX "compliance_audit_logs_compliance_framework_idx" ON "compliance_audit_logs"("compliance_framework");

-- CreateIndex
CREATE INDEX "compliance_audit_logs_risk_level_idx" ON "compliance_audit_logs"("risk_level");

-- CreateIndex
CREATE INDEX "compliance_audit_logs_created_at_idx" ON "compliance_audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "data_change_logs_table_name_idx" ON "data_change_logs"("table_name");

-- CreateIndex
CREATE INDEX "data_change_logs_record_id_idx" ON "data_change_logs"("record_id");

-- CreateIndex
CREATE INDEX "data_change_logs_operation_idx" ON "data_change_logs"("operation");

-- CreateIndex
CREATE INDEX "data_change_logs_user_id_idx" ON "data_change_logs"("user_id");

-- CreateIndex
CREATE INDEX "data_change_logs_timestamp_idx" ON "data_change_logs"("timestamp");

-- CreateIndex
CREATE INDEX "workflow_state_snapshots_workflow_id_idx" ON "workflow_state_snapshots"("workflow_id");

-- CreateIndex
CREATE INDEX "workflow_state_snapshots_execution_id_idx" ON "workflow_state_snapshots"("execution_id");

-- CreateIndex
CREATE INDEX "workflow_state_snapshots_snapshot_type_idx" ON "workflow_state_snapshots"("snapshot_type");

-- CreateIndex
CREATE INDEX "workflow_state_snapshots_created_at_idx" ON "workflow_state_snapshots"("created_at");

-- CreateIndex
CREATE INDEX "workflow_state_snapshots_expires_at_idx" ON "workflow_state_snapshots"("expires_at");

-- AddForeignKey
ALTER TABLE "workflow_state_snapshots" ADD CONSTRAINT "workflow_state_snapshots_parent_snapshot_id_fkey" FOREIGN KEY ("parent_snapshot_id") REFERENCES "workflow_state_snapshots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
