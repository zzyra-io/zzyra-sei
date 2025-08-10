Below is a pragmatic, two-part roadmap.

---

## A. How the **execution-worker engine** should work (and why the schema looks the way it does)

> _Goal:_ deterministically run every workflow graph, even if any node crashes, the host dies, or you redeploy the system.

| Concern                     | What the engine must do                                                                                                                                                                 | Where it is stored in the schema                                                |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **Job intake & scheduling** | A queue receives a _“Start workflow X with payload P”_ message. Workers pop from that queue.                                                                                            | Not in the schema – you’ll use Redis + BullMQ, RabbitMQ, or PG `LISTEN/NOTIFY`. |
| **Run-scope record**        | Immediately create one row in **`workflow_executions`** (`started_at`, `status='running'`).                                                                                             | `workflow_executions`                                                           |
| **Per-node bookkeeping**    | For each node you touch:<br>1. write `node_inputs`<br>2. set `node_executions.status = 'running'`<br>3. update after completion                                                         | `node_inputs`, `node_executions`, `node_outputs`                                |
| **Streaming logs**          | Append console / custom logs as the node runs.                                                                                                                                          | `execution_logs` (workflow-level) + `node_logs`                                 |
| **Side-effects & retries**  | If a node fires an HTTP call / on-chain tx:<br>• wrap in an idempotency key<br>• on failure, push a retry job<br>• increment `retry_count`, create `transaction_attempts` if blockchain | `transaction_attempts`, `node_executions.retry_count`                           |
| **Pause / resume**          | Long-poll or external approvals store context in `workflow_pauses`. A cron/worker scans for un-paused jobs and re-queues them.                                                          | `workflow_pauses`                                                               |
| **Completion**              | When every node is `completed` (or one is `failed` after max retries), atomically update `workflow_executions.status` + `completed_at` + `duration_ms`.                                 | `workflow_executions`                                                           |
| **Isolation / sandbox**     | Each node’s user-supplied code runs in a jailed runtime (Docker, Firecracker, vm2, etc.) – never in the worker process itself.                                                          | -                                                                               |

**Process model**

```
┌──────────────┐   1. enqueue start
│   API tier   │─────────────────────┐
└──────────────┘                     │
                                     ▼
                            (Redis/Rabbit/PG queue)
                                     │
                          2. pop + create execution row
                                     ▼
┌──────────────┐  3a. sandbox   ┌────────────────┐
│ Worker N      │──────────────▶│Custom block JS │  → logs/errors
└──────────────┘  3b. update    └────────────────┘
```

_Why this matters:_ With **exactly-once** state-writes in the DB, workers can be stateless and horizontal-scalable. If a pod dies mid-node, the record shows `status='running'` without `completed_at`; a sweeper job can safely re-queue that node.

---

## B. Hardening the entire system for **production-readiness**

> Think of it as five concentric rings: **Schema → Data-security → Runtime → DevOps → Org & compliance**.

### 1. Database & schema

1. **Finish duplicate-index cleanup** (we fixed three; re-run `prisma validate`).
2. **Row-Level Security policies** for **every** table; integration tests that run as the `anon` DB role and try forbidden queries.
3. **Partition / TTL heavy logs** – monthly partitions on `execution_logs`, `node_logs`; 90-day retention policy.
4. **Add constraints you’ll need later**
   - `UNIQUE (execution_id, attempt_no)` on `transaction_attempts`.
   - `CHECK (retry_count ≤ 10)` on `node_executions`.
5. **Advisory locks** (`pg_advisory_xact_lock`) around workflow creation to avoid duplicate names per user.

### 2. Secrets & privacy

| Task                                                | Tooling suggestion                                                              |
| --------------------------------------------------- | ------------------------------------------------------------------------------- |
| Encrypt `mfa_factors.secret`, access/refresh tokens | `pgcrypto` columns or envelope-encrypt with KMS (e.g. HashiCorp Vault transit). |
| Tokenise PII (email, phone) before logging          | Winston / Pino redaction or Postgres `SECURITY LABEL`.                          |
| Rotate encryption keys                              | Quarterly via KMS and re-encrypt job.                                           |

### 3. Execution engine & application runtime

1. **Sandbox custom code** – Docker with a readonly root, seccomp profile, 128 MB RAM, 1 vCPU, 30 s CPU quota.
2. **At-least-once queue with dedupe** – BullMQ job id = `executionId:nodeId:attempt` so duplicates are no-ops.
3. **Heartbeat & auto-requeue** if `node_executions.updated_at < NOW()-INTERVAL '5 min'`.
4. **Circuit-breakers on third-party calls**; exponential back-off on blockchain RPC.
5. **Horizontal scaling** – VPA or KEDA on queue length; limit total concurrent sandboxes per node pool.
6. **Structured logging & tracing** – OpenTelemetry spans keyed by `execution_id`, shipped to Grafana Tempo + Loki.

### 4. DevOps & reliability

| Area                              | What to set up                                                                                |
| --------------------------------- | --------------------------------------------------------------------------------------------- |
| **CI/CD**                         | Lint, TypeGen, `prisma migrate deploy`, migration smoke-test DB, SAST (Semgrep).              |
| **Observability**                 | Grafana dashboards: queue depth, node latency P95, DB CPU, row-IOPS, stripe webhook failures. |
| **Backup & DR**                   | Continuous WAL archiving to S3; PITR tested monthly; off-region replica.                      |
| **Zero-downtime deploys**         | Blue/green or canary; workers read-after-write to pick new node code versions.                |
| **Secrets management**            | Kubernetes secrets synced from Vault; one-click rotation.                                     |
| **Automated billing enforcement** | Stripe webhooks drop `monthly_execution_quota` when subscription downgrades.                  |

### 5. Compliance / governance

1. **Data Processing Agreement** and GDPR tooling (user data export + delete scripts that cascade across all tables).
2. **Audit log immutability** – turn `audit_logs` & `audit_log_entries` into **append-only** with `REPLICA IDENTITY FULL` and a nightly export to object-storage.
3. **Pen-test & threat-model review** every major release.
4. **Responsible disclosure policy** & bug-bounty setup.

---

### Quick “definition-of-done” checklist

- [ ] All tables covered by RLS with automated tests.
- [ ] Secrets encrypted at rest; key rotation playbook exists.
- [ ] Worker pods can crash without losing or duplicating work (idempotency + heartbeat).
- [ ] Logs/metrics in Grafana + alerts in PagerDuty.
- [ ] PITR restore rehearsal succeeded in staging.
- [ ] 100 rps synthetic load test keeps P95 execution latency < 1 s.
- [ ] Third-party security review signed off.

Lock those in and you’re ready to invite real customers.  
Ping me when you want schema snippets, queue configs, or sandbox hardening examples!

Plan

Execution-Worker Engine: Implementation Plan

1. Job Intake & Scheduling
   Queue Choice: Use BullMQ (with Redis) for Node.js/NestJS. It’s robust, battle-tested, and integrates well with horizontal scaling.
   Integration: Place queue initialization and worker logic in zzyra-worker/services/queue.service.ts.
   Idempotency: Use job IDs in the format executionId:nodeId:attempt to prevent duplicate processing.
2. Run-Scope Record
   On Job Start: Insert a row in workflow_executions with started_at, status='running'.
   Location: Implement in a NestJS service (e.g., workflow-execution.service.ts).
3. Per-Node Bookkeeping
   For each node:
   Write to node_inputs.
   Set node_executions.status = 'running'.
   Update node_outputs and node_executions on completion/failure.
   Implementation: Service methods for each table, wrapped in transactions for atomicity.
4. Streaming Logs
   Logs: Use a logger (e.g., Winston, Pino) to stream logs to both execution_logs and node_logs tables.
   Integration: Add log hooks in the node execution service.
5. Side-Effects & Retries
   HTTP/Blockchain: Wrap calls with idempotency keys, retry logic, and exponential backoff.
   Retries: On failure, push a retry job and increment retry_count.
   Blockchain: Log attempts in transaction_attempts.
6. Pause/Resume
   Pauses: Store context in workflow_pauses. Use a periodic job to scan and re-queue un-paused jobs.
7. Completion
   Atomic Update: When all nodes are done (or max retries hit), update workflow_executions with status, completed_at, and duration_ms.
8. Isolation/Sandbox
   Sandboxing: Use Docker with resource limits (readonly root, seccomp, 128MB RAM, 1 vCPU, 30s CPU) to run user code. Never run in-process.
   B. Production Hardening: Best Practices
9. Database & Schema
   RLS: Enforce Row-Level Security on all tables. Write integration tests (Jest + Supabase client) simulating the anon role.
   Partitioning: Partition execution_logs and node_logs monthly. Use a 90-day retention policy (scheduled job to prune old partitions).
   Constraints:
   Add UNIQUE (execution_id, attempt_no) to transaction_attempts.
   Add CHECK (retry_count <= 10) to node_executions.
   Advisory Locks: Use pg_advisory_xact_lock on workflow creation to avoid duplicate names per user.
10. Secrets & Privacy
    Encryption: Use pgcrypto for secrets in Postgres, or envelope-encrypt with a KMS (e.g., HashiCorp Vault).
    Redaction: Redact PII in logs using Winston/Pino redaction or Postgres SECURITY LABEL.
    Key Rotation: Automate quarterly key rotation and re-encryption.
11. Execution Engine & Runtime
    Heartbeat: Update node_executions.updated_at regularly; auto-requeue if stale.
    Circuit Breakers: Use libraries like opossum for Node.js.
    Tracing: Integrate OpenTelemetry spans keyed by execution_id, export to Grafana Tempo/Loki.
12. DevOps & Reliability
    CI/CD: Lint, TypeGen, migration smoke tests, SAST (Semgrep), deploy via Netlify (UI) and standard pipelines (worker).
    Observability: Grafana dashboards for queue depth, node latency, DB metrics, Stripe failures.
    Backups: Continuous WAL archiving to S3, PITR, off-region replica.
    Deploys: Blue/green or canary deploys; workers should support hot code reload.
    Secrets Management: Sync K8s secrets from Vault, support one-click rotation.
    Billing: Stripe webhook integration to enforce quotas.
13. Compliance & Governance
    GDPR: Scripts for user data export/delete; cascade deletes across all tables.
    Audit Logs: Make audit_logs append-only, enable REPLICA IDENTITY FULL, nightly exports.
    Security: Pen-test and threat-model review each major release; responsible disclosure policy.
    C. UI/UX Best Practices
    Theme: Ensure all components in ui/components use your Tailwind theme and branding.
    Accessibility: Use semantic HTML, ARIA roles, and keyboard navigation.
    Feedback: Real-time feedback for workflow execution status, logs, errors (React Flow, toasts, modals).
    Monitoring: Integrate PostHog for analytics and error tracking.
    Security: Never expose secrets in the frontend. Use environment variables and server-side API routes for sensitive logic.
    D. Integration Checklist
    [ ] All tables covered by RLS, with integration tests.
    [ ] Secrets encrypted at rest, with key rotation.
    [ ] Worker pods crash-safe, idempotent, and heartbeat-enabled.
    [ ] Logs/metrics visible in Grafana, alerts in PagerDuty.
    [ ] PITR restore rehearsal in staging.
    [ ] Load test: 100 rps, P95 latency < 1s.
    [ ] Security review and compliance scripts.
    Next Steps
    Let me know if you want:
    Schema snippets for any table or constraint.
    Queue config (BullMQ, Redis).
    Sandbox hardening (Dockerfile, seccomp).
    RLS policy examples or integration test templates.
    CI/CD pipeline config or monitoring dashboard examples.
