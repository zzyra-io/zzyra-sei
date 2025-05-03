Below is a **practical, engineering‑level playbook** for closing (or at least sharply narrowing) the security gaps we just catalogued. Everything is framed so you can fold it straight into Zyra’s MVP backlog, CI pipeline, and production runbooks.

| Risk Area (from previous list)     | Concrete Counter‑Measures & Tooling                                                                                                                                                                                                                                                                                                                                            | Where to Wire It In           |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------- |
| **1. SIWE & Sessions**             | *Backend* — store a `nonce` table with unique, **single‑use** values; expire after 15 min (cron purge). <br> *Middleware* — rotate session ID on login; set cookies **`HttpOnly; Secure; SameSite=Lax`**. <br> *Library* — `@spruceid/siwe` v3+ already enforces the EIP‑4361 spec—wrap it in a Koa/Express middleware so every request hits a stateless `JWT/nonce` verifier. | Auth service & API gateway    |
| **2. Tenant Isolation**            | Enable **PostgreSQL Row‑Level‑Security** (`ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;` + a policy binding `tenant_id = current_setting('app.tenant')`). <br>Push the tenant ID into the DB session at request start. <br>Write integration tests in `supertest` that attempt cross‑tenant fetches and expect 403.                                                        | Data‑access layer, test suite |
| **3. Key & Secret Vaulting**       | _Don’t store private keys if you can help it._ For server‑side signers that are unavoidable, use **AWS KMS or HashiCorp Vault Transit**. The worker pulls the key on‑demand, signs in‑memory, wipes the buffer immediately. <br>For user RPC / API keys: AES‑GCM column‑level encryption (`pgcrypto`) + role‑based access to decryption function.                              | Worker container & DB schema  |
| **4. Smart‑Contract Interactions** | **Pre‑flight simulation** – before broadcasting, run `eth_call` or Tenderly/Forta sim to catch reverts. <br>ABI verification: pull from Etherscan + match bytecode hash; refuse to run if no match. <br>Allowance guard: default to **exact‑amount approvals**; flag unlimited approvals with an orange “Are you sure?” banner.                                                | Block‑execution service + UI  |
| **5. Engine Abuse (loops, DoS)**   | _At save‑time_: Graph‑traverse the workflow JSON; reject cycles > X nodes. <br>_At run‑time_: `BULL_MAX_RUNS_PER_MINUTE=100` per user; kill job > 60 s or > 3 retries. <br>Gas ceiling: auto‑inject `gasLimit = min(userInput, 500_000)`.                                                                                                                                      | Builder API + worker queue    |
| **6. AI Copilot Safety**           | Pipe every LLM JSON reply through a **strict `ajv` schema validator**; discard/alert on mismatch. <br>Keep prompts & system messages server‑side; strip user input of `}` / unusual unicode to dampen prompt injection. <br>Use retrieval to back‑link contract addresses to Etherscan so the UI can display a “Verified” badge.                                               | AI micro‑service & frontend   |
| **7. Supply‑Chain / NPM**          | Pin commit‑SHA in **`package-lock.json`**; run `npm audit --omit=dev` in CI. <br>Enable **GitHub Dependabot + Renovate**; break build on critical CVE. <br>Generate **SBOM** with `cyclonedx-node-module`.                                                                                                                                                                     | CI pipeline                   |
| **8. Webhooks & SSRF**             | Outbound egress proxy that allows only `https://` and blocks `169.254.169.254`. <br>Validate URLs server‑side with `new URL()`; DNS‑resolve and reject private IP ranges.                                                                                                                                                                                                      | Notification service          |
| **9. Free‑Tier Abuse & Billing**   | ReCAPTCHA on signup + email verification. <br>Rate‑limit `/auth/login` per‑IP (e.g., `express-rate-limit`). <br>Store authoritative usage in DB triggers (e.g., each row insert into `execution_logs` increments a counter table).                                                                                                                                             | API gateway & billing daemon  |
| **10. Logging & Privacy**          | Central filter that redacts regexes for `0x[a‑fA‑F0-9]{40}`, private keys, JWT. <br>Log at INFO in prod; never log transaction raw data at DEBUG without opt‑in.                                                                                                                                                                                                               | Logger middleware             |
| **11. Monitoring & IR**            | **Sentry** for code exceptions, **Prometheus + Grafana** for worker metrics. <br>Define a PagerDuty service tied to alert: `workflow_errors_total{status="error"} > 10 for 5m`. <br>Write a kill‑switch: `UPDATE workflows SET is_enabled=false WHERE user_id=…` wrapped in a runbook.                                                                                         | DevOps stack                  |

---

### Development‑Process Hardening (won’t slow the MVP)

| Practice                                                                                                                             | Why It Matters |
| ------------------------------------------------------------------------------------------------------------------------------------ | -------------- |
| **Pre‑commit hooks** (`husky + lint‑staged`) to ban `console.log(privKey)`‑style leaks.                                              |
| **Threat‑model reviews** at the end of each sprint—55 min meeting, STRIDE template.                                                  |
| **Fuzzing**: run Echidna or Foundry’s `forge fuzz` against any in‑house helper contracts (if you publish one to batch transactions). |
| **Table‑driven security tests** in Jest: enumerate vectors like “reused nonce”, “oversized gas”.                                     |

---

### Quick Wins You Can Implement This Week

1. **Enable RLS + tenant tests**
2. **Add nonce table & expiry job**
3. **Wire `ajv` schema checks on LLM output**
4. **Add loop‑detection to builder save endpoint**
5. **Pin dependencies & generate SBOM in CI**

Do those five items and you eradicate the most obvious foot‑guns before alpha users arrive. Everything else can be layered on incrementally, but you’ll already be on solid ground from a security‑by‑default perspective.
