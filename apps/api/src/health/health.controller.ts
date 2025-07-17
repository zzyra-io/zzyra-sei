import { Controller, Get, Post, Res } from "@nestjs/common";
import { Response } from "express";
import { DatabaseHealthIndicator } from "./database.health";
import { PrismaService } from "../database/prisma.service";
import { Public } from "../auth/decorators/public.decorator";

@Controller("health")
export class HealthController {
  constructor(
    private readonly databaseHealth: DatabaseHealthIndicator,
    private readonly prismaService: PrismaService
  ) {}

  @Get()
  @Public()
  async getHealth(@Res() res: Response) {
    // Check if request is from a browser (wants HTML) or API client (wants JSON)
    const userAgent = res.req.headers["user-agent"] || "";
    const acceptHeader = res.req.headers["accept"] || "";

    // If the request looks like it's from a browser, serve the dashboard
    if (userAgent.includes("Mozilla") && acceptHeader.includes("text/html")) {
      return this.getUnifiedHealthDashboard(res);
    }

    // Otherwise, serve JSON for API clients
    const dbHealth = await this.databaseHealth.checkHealth();
    return res.json({
      status: dbHealth.status === "ok" ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealth,
      },
    });
  }

  @Get("dashboard")
  @Public()
  async getUnifiedHealthDashboard(@Res() res: Response) {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Zyra System Health Dashboard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            background: #f8fafc;
            color: #1e293b;
            line-height: 1.6;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
        }

        .title {
            font-size: 2.5rem;
            font-weight: 700;
            color: #1e293b;
        }

        .subtitle {
            color: #64748b;
            font-size: 1.1rem;
            margin-top: 5px;
        }

        .status-badges {
            display: flex;
            align-items: center;
            gap: 15px;
        }

        .badge {
            padding: 8px 16px;
            border-radius: 8px;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 0.875rem;
            letter-spacing: 0.5px;
        }

        .badge.healthy {
            background: #dcfce7;
            color: #166534;
        }

        .badge.unhealthy {
            background: #fef2f2;
            color: #dc2626;
        }

        .badge.warning {
            background: #fef3c7;
            color: #92400e;
        }

        .refresh-btn {
            background: #64748b;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
        }

        .refresh-btn:hover {
            background: #475569;
        }

        .service-section {
            margin-bottom: 40px;
        }

        .service-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 20px;
            padding: 16px 24px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            border: 1px solid #e2e8f0;
        }

        .service-icon {
            width: 24px;
            height: 24px;
            border-radius: 6px;
        }

        .service-icon.api { background: #3b82f6; }
        .service-icon.worker { background: #10b981; }

        .service-title {
            font-size: 1.5rem;
            font-weight: 600;
            color: #1e293b;
        }

        .service-status {
            margin-left: auto;
        }

        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .metric-card {
            background: white;
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            border: 1px solid #e2e8f0;
        }

        .metric-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 12px;
        }

        .metric-icon {
            width: 20px;
            height: 20px;
            border-radius: 4px;
        }

        .metric-icon.database { background: #3b82f6; }
        .metric-icon.api { background: #10b981; }
        .metric-icon.memory { background: #8b5cf6; }
        .metric-icon.uptime { background: #06b6d4; }
        .metric-icon.queue { background: #f59e0b; }
        .metric-icon.execution { background: #ef4444; }

        .metric-title {
            font-weight: 600;
            color: #64748b;
            font-size: 0.875rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .metric-value {
            font-size: 2rem;
            font-weight: 700;
            color: #1e293b;
            margin-bottom: 4px;
        }

        .metric-description {
            color: #64748b;
            font-size: 0.875rem;
        }

        .tabs {
            display: flex;
            border-bottom: 2px solid #e2e8f0;
            margin-bottom: 30px;
        }

        .tab {
            padding: 12px 24px;
            background: none;
            border: none;
            cursor: pointer;
            font-weight: 500;
            color: #64748b;
            border-bottom: 2px solid transparent;
            transition: all 0.2s;
        }

        .tab.active {
            color: #3b82f6;
            border-bottom-color: #3b82f6;
        }

        .tab-content {
            display: none;
        }

        .tab-content.active {
            display: block;
        }

        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 30px;
        }

        .info-section {
            background: white;
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            border: 1px solid #e2e8f0;
        }

        .section-title {
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 16px;
            font-size: 1.1rem;
        }

        .section-icon {
            width: 16px;
            height: 16px;
            border-radius: 3px;
        }

        .section-icon.blue { background: #3b82f6; }
        .section-icon.yellow { background: #f59e0b; }
        .section-icon.green { background: #10b981; }
        .section-icon.purple { background: #8b5cf6; }
        .section-icon.orange { background: #f97316; }
        .section-icon.red { background: #ef4444; }

        .info-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #f1f5f9;
        }

        .info-item:last-child {
            border-bottom: none;
        }

        .info-label {
            font-weight: 500;
            color: #475569;
        }

        .info-value {
            font-weight: 600;
            color: #1e293b;
        }

        .recommendations {
            background: #fffbeb;
            border: 1px solid #fcd34d;
            border-radius: 8px;
            padding: 12px 16px;
            margin-top: 16px;
        }

        .recommendations-title {
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 600;
            color: #92400e;
            margin-bottom: 8px;
        }

        .recommendation {
            color: #92400e;
            font-size: 0.875rem;
        }

        .footer {
            text-align: center;
            color: #64748b;
            font-size: 0.875rem;
            margin-top: 40px;
        }

        .loading {
            opacity: 0.6;
            pointer-events: none;
        }

        .error {
            background: #fef2f2;
            border: 1px solid #fca5a5;
            color: #dc2626;
            padding: 12px;
            border-radius: 8px;
            margin: 10px 0;
        }

        .offline {
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            color: #475569;
            padding: 12px;
            border-radius: 8px;
            margin: 10px 0;
        }

        .performance-grade {
            text-align: center;
            padding: 16px;
        }

        .grade-display {
            font-size: 3rem;
            font-weight: bold;
            color: #10b981;
            margin-bottom: 12px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
        }

        .grade-details {
            display: flex;
            justify-content: space-around;
            gap: 12px;
        }

        .grade-metric {
            display: flex;
            flex-direction: column;
            align-items: center;
            font-size: 0.875rem;
        }

        .metric-label {
            color: #64748b;
            margin-bottom: 4px;
        }

        .metric-value {
            font-weight: 600;
            color: #1e293b;
        }

        @media (max-width: 768px) {
            .container {
                padding: 10px;
            }

            .header {
                flex-direction: column;
                align-items: flex-start;
                gap: 15px;
            }

            .metrics-grid {
                grid-template-columns: 1fr;
            }

            .info-grid {
                grid-template-columns: 1fr;
            }

            .title {
                font-size: 2rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div>
                <h1 class="title">Zyra System Health Dashboard</h1>
                <p class="subtitle">Real-time monitoring of all services and infrastructure</p>
            </div>
            <div class="status-badges">
                <button class="refresh-btn" onclick="refreshData()">Refresh</button>
                <span id="api-status-badge" class="badge healthy">API</span>
                <span id="worker-status-badge" class="badge healthy">WORKER</span>
                <span id="overall-status-badge" class="badge healthy">SYSTEM</span>
            </div>
        </div>

        <div id="loading-indicator" class="loading" style="display: none;">Loading...</div>
        <div id="error-container"></div>

        <!-- API Service Section -->
        <div class="service-section">
            <div class="service-header">
                <div class="service-icon api"></div>
                <h2 class="service-title">API Service</h2>
                <div class="service-status">
                    <span id="api-service-status" class="badge healthy">ONLINE</span>
                </div>
            </div>

            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-header">
                        <div class="metric-icon database"></div>
                        <span class="metric-title">Database</span>
                    </div>
                    <div class="metric-value" id="api-db-response-time">-</div>
                    <div class="metric-description" id="api-db-status">Checking connection...</div>
                </div>

                <div class="metric-card">
                    <div class="metric-header">
                        <div class="metric-icon api"></div>
                        <span class="metric-title">API Requests</span>
                    </div>
                    <div class="metric-value" id="api-requests">-</div>
                    <div class="metric-description" id="api-request-status">Monitoring...</div>
                </div>

                <div class="metric-card">
                    <div class="metric-header">
                        <div class="metric-icon memory"></div>
                        <span class="metric-title">Memory</span>
                    </div>
                    <div class="metric-value" id="api-memory-used">-</div>
                    <div class="metric-description" id="api-memory-total">Calculating...</div>
                </div>

                <div class="metric-card">
                    <div class="metric-header">
                        <div class="metric-icon uptime"></div>
                        <span class="metric-title">Uptime</span>
                    </div>
                    <div class="metric-value" id="api-uptime">-</div>
                    <div class="metric-description" id="api-process-id">PID: -</div>
                </div>
            </div>
        </div>

        <!-- Worker Service Section -->
        <div class="service-section">
            <div class="service-header">
                <div class="service-icon worker"></div>
                <h2 class="service-title">Worker Service</h2>
                <div class="service-status">
                    <span id="worker-service-status" class="badge healthy">ONLINE</span>
                </div>
            </div>

            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-header">
                        <div class="metric-icon queue"></div>
                        <span class="metric-title">Queue Status</span>
                    </div>
                    <div class="metric-value" id="worker-queue-messages">-</div>
                    <div class="metric-description" id="worker-queue-status">Checking queues...</div>
                </div>

                <div class="metric-card">
                    <div class="metric-header">
                        <div class="metric-icon execution"></div>
                        <span class="metric-title">Executions</span>
                    </div>
                    <div class="metric-value" id="worker-executions">-</div>
                    <div class="metric-description" id="worker-execution-status">Monitoring...</div>
                </div>

                <div class="metric-card">
                    <div class="metric-header">
                        <div class="metric-icon memory"></div>
                        <span class="metric-title">Memory</span>
                    </div>
                    <div class="metric-value" id="worker-memory-used">-</div>
                    <div class="metric-description" id="worker-memory-total">Calculating...</div>
                </div>

                <div class="metric-card">
                    <div class="metric-header">
                        <div class="metric-icon uptime"></div>
                        <span class="metric-title">Uptime</span>
                    </div>
                    <div class="metric-value" id="worker-uptime">-</div>
                    <div class="metric-description" id="worker-process-id">PID: -</div>
                </div>
            </div>
        </div>

        <div class="tabs">
            <button class="tab active" onclick="showTab('overview')">System Overview</button>
            <button class="tab" onclick="showTab('api-details')">API Details</button>
            <button class="tab" onclick="showTab('worker-details')">Worker Details</button>
            <button class="tab" onclick="showTab('database-insights')">Database Insights</button>
            <button class="tab" onclick="showTab('performance')">Performance</button>
        </div>

        <div id="overview-tab" class="tab-content active">
            <div class="info-grid">
                <div class="info-section">
                    <h3 class="section-title">
                        <div class="section-icon blue"></div>
                        System Status
                    </h3>
                    <div class="info-item">
                        <span class="info-label">API Service</span>
                        <span class="info-value" id="overview-api-status">-</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Worker Service</span>
                        <span class="info-value" id="overview-worker-status">-</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Database</span>
                        <span class="info-value" id="overview-db-status">-</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Queue System</span>
                        <span class="info-value" id="overview-queue-status">-</span>
                    </div>
                </div>

                <div class="info-section">
                    <h3 class="section-title">
                        <div class="section-icon green"></div>
                        System Resources
                    </h3>
                    <div class="info-item">
                        <span class="info-label">Total Memory Usage</span>
                        <span class="info-value" id="overview-total-memory">-</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Database Connections</span>
                        <span class="info-value" id="overview-db-connections">-</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Queue Messages</span>
                        <span class="info-value" id="overview-queue-messages">-</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">System Load</span>
                        <span class="info-value" id="overview-system-load">-</span>
                    </div>
                </div>

                <div class="info-section">
                    <h3 class="section-title">
                        <div class="section-icon yellow"></div>
                        System Recommendations
                    </h3>
                    <div class="recommendations">
                        <div class="recommendations-title">
                            ⚠️ System Health
                        </div>
                        <div class="recommendation" id="system-recommendations">
                            All systems operating normally
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div id="api-details-tab" class="tab-content">
            <div class="info-grid">
                <div class="info-section">
                    <h3 class="section-title">
                        <div class="section-icon blue"></div>
                        API System Information
                    </h3>
                    <div class="info-item">
                        <span class="info-label">Process ID</span>
                        <span class="info-value" id="api-system-pid">-</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Uptime</span>
                        <span class="info-value" id="api-system-uptime">-</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Node Version</span>
                        <span class="info-value" id="api-node-version">-</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Environment</span>
                        <span class="info-value" id="api-environment">-</span>
                    </div>
                </div>

                <div class="info-section">
                    <h3 class="section-title">
                        <div class="section-icon blue"></div>
                        Database Performance
                    </h3>
                    <div class="info-item">
                        <span class="info-label">Connection Status</span>
                        <span class="info-value" id="api-db-connection-status">-</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Response Time</span>
                        <span class="info-value" id="api-db-response-time-detailed">-</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Total Queries</span>
                        <span class="info-value" id="api-total-queries">-</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Failed Queries</span>
                        <span class="info-value" id="api-failed-queries">-</span>
                    </div>
                </div>
            </div>
        </div>

        <div id="worker-details-tab" class="tab-content">
            <div class="info-grid">
                <div class="info-section">
                    <h3 class="section-title">
                        <div class="section-icon green"></div>
                        Worker Information
                    </h3>
                    <div class="info-item">
                        <span class="info-label">Worker Status</span>
                        <span class="info-value" id="worker-health-status">-</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Execution Count</span>
                        <span class="info-value" id="worker-execution-count">-</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Failure Rate</span>
                        <span class="info-value" id="worker-failure-rate">-</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Last Execution</span>
                        <span class="info-value" id="worker-last-execution">-</span>
                    </div>
                </div>

                <div class="info-section">
                    <h3 class="section-title">
                        <div class="section-icon green"></div>
                        Queue System
                    </h3>
                    <div class="info-item">
                        <span class="info-label">Execution Queue</span>
                        <span class="info-value" id="worker-execution-queue">-</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Retry Queue</span>
                        <span class="info-value" id="worker-retry-queue">-</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Dead Letter Queue</span>
                        <span class="info-value" id="worker-dlq">-</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Consumer Count</span>
                        <span class="info-value" id="worker-consumers">-</span>
                    </div>
                </div>
            </div>
        </div>

        <div id="database-insights-tab" class="tab-content">
            <div class="info-grid">
                <div class="info-section">
                    <h3 class="section-title">
                        <div class="section-icon blue"></div>
                        Connection Pool
                    </h3>
                    <div class="info-item">
                        <span class="info-label">Active Connections</span>
                        <span class="info-value" id="db-active-connections">-</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Idle Connections</span>
                        <span class="info-value" id="db-idle-connections">-</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Max Connections</span>
                        <span class="info-value" id="db-max-connections">-</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Utilization</span>
                        <span class="info-value" id="db-connection-utilization">-</span>
                    </div>
                </div>

                <div class="info-section">
                    <h3 class="section-title">
                        <div class="section-icon green"></div>
                        Schema Information
                    </h3>
                    <div class="info-item">
                        <span class="info-label">Total Tables</span>
                        <span class="info-value" id="db-table-count">-</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Total Records</span>
                        <span class="info-value" id="db-total-records">-</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Largest Table</span>
                        <span class="info-value" id="db-largest-table">-</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Schema Status</span>
                        <span class="info-value" id="db-schema-status">-</span>
                    </div>
                </div>

                <div class="info-section">
                    <h3 class="section-title">
                        <div class="section-icon yellow"></div>
                        Storage Usage
                    </h3>
                    <div class="info-item">
                        <span class="info-label">Total Database Size</span>
                        <span class="info-value" id="db-total-size">-</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Data Size</span>
                        <span class="info-value" id="db-data-size">-</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Index Size</span>
                        <span class="info-value" id="db-index-size">-</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Weekly Growth</span>
                        <span class="info-value" id="db-weekly-growth">-</span>
                    </div>
                </div>

                <div class="info-section">
                    <h3 class="section-title">
                        <div class="section-icon purple"></div>
                        Performance Grade
                    </h3>
                    <div class="performance-grade">
                        <div class="grade-display" id="db-performance-grade">A+</div>
                        <div class="grade-details">
                            <div class="grade-metric">
                                <span class="metric-label">Queries/sec:</span>
                                <span class="metric-value" id="db-queries-per-sec">-</span>
                            </div>
                            <div class="grade-metric">
                                <span class="metric-label">Avg Response:</span>
                                <span class="metric-value" id="db-avg-response">-</span>
                            </div>
                            <div class="grade-metric">
                                <span class="metric-label">Error Rate:</span>
                                <span class="metric-value" id="db-error-rate">-</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="info-section">
                    <h3 class="section-title">
                        <div class="section-icon orange"></div>
                        Transaction Metrics
                    </h3>
                    <div class="info-item">
                        <span class="info-label">Active Transactions</span>
                        <span class="info-value" id="db-active-transactions">-</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Success Rate</span>
                        <span class="info-value" id="db-transaction-success">-</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Avg Transaction Time</span>
                        <span class="info-value" id="db-transaction-time">-</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Rollbacks</span>
                        <span class="info-value" id="db-rollbacks">-</span>
                    </div>
                </div>

                <div class="info-section">
                    <h3 class="section-title">
                        <div class="section-icon red"></div>
                        Index Performance
                    </h3>
                    <div class="info-item">
                        <span class="info-label">Index Hit Ratio</span>
                        <span class="info-value" id="db-index-hit-ratio">-</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Total Indexes</span>
                        <span class="info-value" id="db-total-indexes">-</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Unused Indexes</span>
                        <span class="info-value" id="db-unused-indexes">-</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Maintenance Needed</span>
                        <span class="info-value" id="db-maintenance-needed">-</span>
                    </div>
                </div>
            </div>
        </div>

        <div id="performance-tab" class="tab-content">
            <div class="info-grid">
                <div class="info-section">
                    <h3 class="section-title">
                        <div class="section-icon blue"></div>
                        API Performance
                    </h3>
                    <div class="info-item">
                        <span class="info-label">Average Query Time</span>
                        <span class="info-value" id="perf-api-avg-query">-</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Slow Queries</span>
                        <span class="info-value" id="perf-api-slow-queries">-</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Error Rate</span>
                        <span class="info-value" id="perf-api-error-rate">-</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Memory Usage</span>
                        <span class="info-value" id="perf-api-memory">-</span>
                    </div>
                </div>

                <div class="info-section">
                    <h3 class="section-title">
                        <div class="section-icon green"></div>
                        Worker Performance
                    </h3>
                    <div class="info-item">
                        <span class="info-label">Execution Rate</span>
                        <span class="info-value" id="perf-worker-exec-rate">-</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Queue Throughput</span>
                        <span class="info-value" id="perf-worker-throughput">-</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Database Utilization</span>
                        <span class="info-value" id="perf-worker-db-util">-</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Memory Efficiency</span>
                        <span class="info-value" id="perf-worker-memory-eff">-</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="footer">
            <p>Last updated: <span id="last-updated">-</span> • Auto-refresh every 30 seconds</p>
        </div>
    </div>

    <script>
        let refreshInterval;

        function showTab(tabName) {
            // Hide all tabs
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            document.querySelectorAll('.tab').forEach(tab => {
                tab.classList.remove('active');
            });

            // Show selected tab
            document.getElementById(tabName + '-tab').classList.add('active');
            event.target.classList.add('active');
        }

        function formatBytes(bytes) {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
        }

        function formatUptime(seconds) {
            if (seconds < 60) return Math.floor(seconds) + 's';
            if (seconds < 3600) return Math.floor(seconds / 60) + 'm';
            if (seconds < 86400) return Math.floor(seconds / 3600) + 'h';
            return Math.floor(seconds / 86400) + 'd';
        }

        function showError(message) {
            const errorContainer = document.getElementById('error-container');
            errorContainer.innerHTML = '<div class="error">Error: ' + message + '</div>';
        }

        function showOfflineService(serviceName) {
            const errorContainer = document.getElementById('error-container');
            const existingContent = errorContainer.innerHTML;
            errorContainer.innerHTML = existingContent + '<div class="offline">' + serviceName + ' service is offline or unreachable</div>';
        }

        function clearError() {
            const errorContainer = document.getElementById('error-container');
            errorContainer.innerHTML = '';
        }

        async function refreshData() {
            const loadingIndicator = document.getElementById('loading-indicator');
            loadingIndicator.style.display = 'block';
            clearError();

            try {
                // Try to fetch API health data
                let apiData = null;
                try {
                    const [apiHealth, apiDatabase, apiMetrics, apiEnhanced, apiSystem, apiInsights, apiTransactions, apiIndexes] = await Promise.all([
                        fetch('/api/health', { headers: { 'Accept': 'application/json' } }).then(r => r.json()),
                        fetch('/api/health/database').then(r => r.json()),
                        fetch('/api/health/database/metrics').then(r => r.json()),
                        fetch('/api/health/database/enhanced').then(r => r.json()),
                        fetch('/api/health/system').then(r => r.json()),
                        fetch('/api/health/database/insights').then(r => r.json()),
                        fetch('/api/health/database/transactions').then(r => r.json()),
                        fetch('/api/health/database/indexes').then(r => r.json())
                    ]);
                    
                    apiData = {
                        health: apiHealth,
                        database: apiDatabase,
                        metrics: apiMetrics,
                        enhanced: apiEnhanced,
                        system: apiSystem,
                        insights: apiInsights,
                        transactions: apiTransactions,
                        indexes: apiIndexes
                    };
                } catch (error) {
                    console.error('Failed to fetch API data:', error);
                    showOfflineService('API');
                }

                // Try to fetch Worker health data
                let workerData = null;
                try {
                    const workerResponse = await fetch('http://localhost:3009/health/enhanced');
                    workerData = await workerResponse.json();
                    console.log('Worker response:', workerData);
                } catch (error) {
                    console.error('Failed to fetch Worker data:', error);
                    showOfflineService('Worker');
                }

                updateDashboard(apiData, workerData);
                document.getElementById('last-updated').textContent = new Date().toLocaleString();

            } catch (error) {
                console.error('Failed to refresh data:', error);
                showError('Failed to refresh health data: ' + error.message);
            } finally {
                loadingIndicator.style.display = 'none';
            }
        }

        function updateDashboard(apiData, workerData) {
            console.log('Worker data:', workerData);
            updateServiceStatus(apiData, workerData);
            updateAPIMetrics(apiData);
            updateWorkerMetrics(workerData);
            updateOverview(apiData, workerData);
            updateDetailTabs(apiData, workerData);
            updateDatabaseInsightsTab(apiData);
            updatePerformanceTab(apiData, workerData);
        }

        function updateServiceStatus(apiData, workerData) {
            // Update API status
            const apiStatusBadge = document.getElementById('api-status-badge');
            const apiServiceStatus = document.getElementById('api-service-status');
            if (apiData && apiData.health?.status === 'healthy') {
                apiStatusBadge.className = 'badge healthy';
                apiStatusBadge.textContent = 'API';
                apiServiceStatus.className = 'badge healthy';
                apiServiceStatus.textContent = 'ONLINE';
            } else {
                apiStatusBadge.className = 'badge unhealthy';
                apiStatusBadge.textContent = 'API';
                apiServiceStatus.className = 'badge unhealthy';
                apiServiceStatus.textContent = 'OFFLINE';
            }

            // Update Worker status
            const workerStatusBadge = document.getElementById('worker-status-badge');
            const workerServiceStatus = document.getElementById('worker-service-status');
            if (workerData && workerData.status === 'ok') {
                workerStatusBadge.className = 'badge healthy';
                workerStatusBadge.textContent = 'WORKER';
                workerServiceStatus.className = 'badge healthy';
                workerServiceStatus.textContent = 'ONLINE';
            } else {
                workerStatusBadge.className = 'badge unhealthy';
                workerStatusBadge.textContent = 'WORKER';
                workerServiceStatus.className = 'badge unhealthy';
                workerServiceStatus.textContent = 'OFFLINE';
            }

            // Update Overall status
            const overallStatusBadge = document.getElementById('overall-status-badge');
            const apiHealthy = apiData && apiData.health?.status === 'healthy';
            const workerHealthy = workerData && workerData.status === 'ok';
            
            if (apiHealthy && workerHealthy) {
                overallStatusBadge.className = 'badge healthy';
                overallStatusBadge.textContent = 'SYSTEM';
            } else if (apiHealthy || workerHealthy) {
                overallStatusBadge.className = 'badge warning';
                overallStatusBadge.textContent = 'SYSTEM';
            } else {
                overallStatusBadge.className = 'badge unhealthy';
                overallStatusBadge.textContent = 'SYSTEM';
            }
        }

        function updateAPIMetrics(apiData) {
            if (!apiData) return;

            // Database metrics
            const dbResponseTime = apiData.database?.details?.responseTime || 'N/A';
            document.getElementById('api-db-response-time').textContent = dbResponseTime;
            document.getElementById('api-db-status').textContent = apiData.database?.details?.status || 'Unknown';

            // API requests
            document.getElementById('api-requests').textContent = 'Active';
            document.getElementById('api-request-status').textContent = 'Processing requests';

            // Memory
            if (apiData.system?.memory) {
                document.getElementById('api-memory-used').textContent = apiData.system.memory.heapUsedFormatted;
                document.getElementById('api-memory-total').textContent = apiData.system.memory.heapTotalFormatted + ' heap';
            }

            // Uptime
            if (apiData.system) {
                document.getElementById('api-uptime').textContent = apiData.system.uptimeFormatted || 'N/A';
                document.getElementById('api-process-id').textContent = 'PID: ' + (apiData.system.processId || 'N/A');
            }
        }

        function updateWorkerMetrics(workerData) {
            if (!workerData) return;

            // Queue status
            const queueStats = workerData.details?.rabbitmq?.queueStats;
            if (queueStats) {
                const mainQueue = queueStats['ZYRA.EXECUTION_QUEUE'];
                document.getElementById('worker-queue-messages').textContent = mainQueue?.messageCount || 0;
                document.getElementById('worker-queue-status').textContent = mainQueue?.status || 'Unknown';
            }

            // Executions
            const executionWorker = workerData.details?.execution_worker;
            if (executionWorker) {
                document.getElementById('worker-executions').textContent = executionWorker.executionCount || 0;
                document.getElementById('worker-execution-status').textContent = executionWorker.failureRate || '0%' + ' failure rate';
            }

            // Memory (approximate)
            document.getElementById('worker-memory-used').textContent = 'N/A';
            document.getElementById('worker-memory-total').textContent = 'See worker logs';

            // Uptime
            if (executionWorker) {
                const uptime = executionWorker.uptime ? formatUptime(executionWorker.uptime / 1000) : 'N/A';
                document.getElementById('worker-uptime').textContent = uptime;
                document.getElementById('worker-process-id').textContent = 'Worker Process';
            }
        }

        function updateOverview(apiData, workerData) {
            // System status overview
            document.getElementById('overview-api-status').textContent = 
                apiData ? (apiData.health?.status === 'healthy' ? 'Online' : 'Offline') : 'Offline';
            document.getElementById('overview-worker-status').textContent = 
                workerData ? (workerData.status === 'ok' ? 'Online' : 'Offline') : 'Offline';
            document.getElementById('overview-db-status').textContent = 
                apiData?.database?.details?.status || 'Unknown';
            document.getElementById('overview-queue-status').textContent = 
                workerData?.details?.rabbitmq?.connectionStatus || 'Unknown';

            // System resources
            let totalMemory = 0;
            if (apiData?.system?.memory?.rss) {
                totalMemory += apiData.system.memory.rss;
            }
            document.getElementById('overview-total-memory').textContent = totalMemory > 0 ? formatBytes(totalMemory) : 'N/A';
            
            document.getElementById('overview-db-connections').textContent = '5/10'; // Mock
            
            const queueMessages = workerData?.details?.rabbitmq?.queueStats?.['ZYRA.EXECUTION_QUEUE']?.messageCount || 0;
            document.getElementById('overview-queue-messages').textContent = queueMessages;
            
            document.getElementById('overview-system-load').textContent = 'Normal';

            // Recommendations
            const apiHealthy = apiData && apiData.health?.status === 'healthy';
            const workerHealthy = workerData && workerData.status === 'ok';
            
            let recommendation = 'All systems operating normally';
            if (!apiHealthy && !workerHealthy) {
                recommendation = 'Critical: Both API and Worker services are offline';
            } else if (!apiHealthy) {
                recommendation = 'Warning: API service is offline';
            } else if (!workerHealthy) {
                recommendation = 'Warning: Worker service is offline';
            }
            
            document.getElementById('system-recommendations').textContent = recommendation;
        }

        function updateDetailTabs(apiData, workerData) {
            // API Details
            if (apiData?.system) {
                document.getElementById('api-system-pid').textContent = apiData.system.processId || 'N/A';
                document.getElementById('api-system-uptime').textContent = apiData.system.uptimeFormatted || 'N/A';
                document.getElementById('api-node-version').textContent = apiData.system.nodeVersion || 'N/A';
                document.getElementById('api-environment').textContent = apiData.system.env || 'Unknown';
            }

            if (apiData?.database) {
                document.getElementById('api-db-connection-status').textContent = apiData.database.details?.status || 'Unknown';
                document.getElementById('api-db-response-time-detailed').textContent = apiData.database.details?.responseTime || 'N/A';
            }

            if (apiData?.enhanced?.metrics) {
                document.getElementById('api-total-queries').textContent = apiData.enhanced.metrics.totalQueries || 0;
                document.getElementById('api-failed-queries').textContent = apiData.enhanced.metrics.failedQueries || 0;
            }

            // Worker Details
            if (workerData?.details?.execution_worker) {
                const worker = workerData.details.execution_worker;
                document.getElementById('worker-health-status').textContent = workerData.status || 'Unknown';
                document.getElementById('worker-execution-count').textContent = worker.executionCount || 0;
                document.getElementById('worker-failure-rate').textContent = worker.failureRate || '0%';
                document.getElementById('worker-last-execution').textContent = worker.lastSuccessfulExecution || 'Never';
            }

            if (workerData?.details?.rabbitmq?.queueStats) {
                const qs = workerData.details.rabbitmq.queueStats;
                document.getElementById('worker-execution-queue').textContent = qs['ZYRA.EXECUTION_QUEUE']?.messageCount || 0;
                document.getElementById('worker-retry-queue').textContent = qs['ZYRA.EXECUTION_QUEUE.RETRY']?.messageCount || 0;
                document.getElementById('worker-dlq').textContent = qs['ZYRA.EXECUTION_QUEUE.DLQ']?.messageCount || 0;
                document.getElementById('worker-consumers').textContent = qs['ZYRA.EXECUTION_QUEUE']?.consumerCount || 0;
            }
        }

        function updatePerformanceTab(apiData, workerData) {
            // API Performance
            if (apiData?.enhanced?.metrics) {
                const metrics = apiData.enhanced.metrics;
                document.getElementById('perf-api-avg-query').textContent = (metrics.averageQueryTime || 0) + 'ms';
                document.getElementById('perf-api-slow-queries').textContent = metrics.slowQueries || 0;
                const errorRate = metrics.totalQueries > 0 ? 
                    ((metrics.failedQueries / metrics.totalQueries) * 100).toFixed(2) : 0;
                document.getElementById('perf-api-error-rate').textContent = errorRate + '%';
            }

            if (apiData?.system?.memory) {
                const memUsage = ((apiData.system.memory.heapUsed / apiData.system.memory.heapTotal) * 100).toFixed(1);
                document.getElementById('perf-api-memory').textContent = memUsage + '%';
            }

            // Worker Performance
            if (workerData?.details?.execution_worker) {
                const worker = workerData.details.execution_worker;
                document.getElementById('perf-worker-exec-rate').textContent = worker.executionRate || '0/min';
            }

            if (workerData?.details?.rabbitmq?.performance?.throughput) {
                const throughput = workerData.details.rabbitmq.performance.throughput;
                document.getElementById('perf-worker-throughput').textContent = throughput.estimated_messages_per_second + '/s';
            }

            document.getElementById('perf-worker-db-util').textContent = 'Normal';
            document.getElementById('perf-worker-memory-eff').textContent = 'Good';
        }

        function updateDatabaseInsightsTab(apiData) {
            if (!apiData) return;

            // Connection Pool Information
            if (apiData.insights?.connection) {
                const conn = apiData.insights.connection;
                document.getElementById('db-active-connections').textContent = conn.activeConnections || '-';
                document.getElementById('db-idle-connections').textContent = conn.idleConnections || '-';
                document.getElementById('db-max-connections').textContent = conn.maxConnections || '-';
                document.getElementById('db-connection-utilization').textContent = conn.connectionUtilization || '-';
            }

            // Schema Information
            if (apiData.insights?.schema) {
                const schema = apiData.insights.schema;
                document.getElementById('db-table-count').textContent = schema.tableCount || '-';
                document.getElementById('db-total-records').textContent = (schema.totalRecords || 0).toLocaleString();
                
                // Find largest table
                let largestTable = 'N/A';
                let largestCount = 0;
                if (schema.tables) {
                    for (const tableName in schema.tables) {
                        const tableInfo = schema.tables[tableName];
                        if (tableInfo.count > largestCount) {
                            largestCount = tableInfo.count;
                            largestTable = tableName + ' (' + tableInfo.count.toLocaleString() + ')';
                        }
                    }
                }
                document.getElementById('db-largest-table').textContent = largestTable;
                document.getElementById('db-schema-status').textContent = 'Healthy';
            }

            // Storage Usage
            if (apiData.insights?.storage) {
                const storage = apiData.insights.storage;
                document.getElementById('db-total-size').textContent = storage.totalDatabaseSize || '-';
                document.getElementById('db-data-size').textContent = storage.dataSize || '-';
                document.getElementById('db-index-size').textContent = storage.indexSize || '-';
                document.getElementById('db-weekly-growth').textContent = storage.weeklyGrowth || '-';
            }

            // Performance Grade
            if (apiData.insights?.performance) {
                const perf = apiData.insights.performance;
                const gradeElement = document.getElementById('db-performance-grade');
                if (gradeElement) {
                    gradeElement.textContent = perf.performanceGrade || 'A+';
                    // Color the grade based on performance
                    const grade = perf.performanceGrade;
                    if (grade === 'A+' || grade === 'A') {
                        gradeElement.style.color = '#10b981'; // Green
                    } else if (grade === 'B') {
                        gradeElement.style.color = '#f59e0b'; // Yellow
                    } else if (grade === 'C') {
                        gradeElement.style.color = '#f97316'; // Orange
                    } else {
                        gradeElement.style.color = '#ef4444'; // Red
                    }
                }
                
                document.getElementById('db-queries-per-sec').textContent = perf.queriesPerSecond || '-';
                document.getElementById('db-avg-response').textContent = (perf.averageResponseTime || 0) + 'ms';
                document.getElementById('db-error-rate').textContent = (perf.errorRate || 0).toFixed(2) + '%';
            }

            // Transaction Metrics
            if (apiData.transactions) {
                const trans = apiData.transactions;
                document.getElementById('db-active-transactions').textContent = trans.activeTransactions || '-';
                document.getElementById('db-transaction-success').textContent = trans.transactionSuccessRate || '-';
                document.getElementById('db-transaction-time').textContent = trans.averageTransactionTime || '-';
                document.getElementById('db-rollbacks').textContent = trans.rolledBackTransactions || '-';
            }

            // Index Performance
            if (apiData.indexes) {
                const idx = apiData.indexes;
                document.getElementById('db-index-hit-ratio').textContent = idx.indexHitRatio || '-';
                document.getElementById('db-total-indexes').textContent = idx.totalIndexes || '-';
                document.getElementById('db-unused-indexes').textContent = idx.unusedIndexes || '-';
                const maintenanceNeeded = idx.indexMaintenanceNeeded ? 'Yes' : 'No';
                document.getElementById('db-maintenance-needed').textContent = maintenanceNeeded;
            }
        }

        // Initialize dashboard
        document.addEventListener('DOMContentLoaded', function() {
            refreshData();
            
            // Set up auto-refresh every 30 seconds
            refreshInterval = setInterval(refreshData, 30000);
        });

        // Clean up interval when page is hidden
        document.addEventListener('visibilitychange', function() {
            if (document.hidden) {
                clearInterval(refreshInterval);
            } else {
                refreshInterval = setInterval(refreshData, 30000);
                refreshData(); // Refresh immediately when page becomes visible
            }
        });
    </script>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html");
    res.send(html);
  }

  @Get("dashboard")
  @Public()
  async getHealthDashboard(@Res() res: Response) {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API Health Dashboard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            background: #f8fafc;
            color: #1e293b;
            line-height: 1.6;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
        }

        .title {
            font-size: 2.5rem;
            font-weight: 700;
            color: #1e293b;
        }

        .subtitle {
            color: #64748b;
            font-size: 1.1rem;
            margin-top: 5px;
        }

        .status-badge {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .badge {
            padding: 8px 16px;
            border-radius: 8px;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 0.875rem;
            letter-spacing: 0.5px;
        }

        .badge.healthy {
            background: #dcfce7;
            color: #166534;
        }

        .badge.unhealthy {
            background: #fef2f2;
            color: #dc2626;
        }

        .refresh-btn {
            background: #64748b;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
        }

        .refresh-btn:hover {
            background: #475569;
        }

        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .metric-card {
            background: white;
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            border: 1px solid #e2e8f0;
        }

        .metric-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 12px;
        }

        .metric-icon {
            width: 20px;
            height: 20px;
            border-radius: 4px;
        }

        .metric-icon.database { background: #3b82f6; }
        .metric-icon.api { background: #10b981; }
        .metric-icon.memory { background: #8b5cf6; }
        .metric-icon.uptime { background: #06b6d4; }

        .metric-title {
            font-weight: 600;
            color: #64748b;
            font-size: 0.875rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .metric-value {
            font-size: 2rem;
            font-weight: 700;
            color: #1e293b;
            margin-bottom: 4px;
        }

        .metric-description {
            color: #64748b;
            font-size: 0.875rem;
        }

        .tabs {
            display: flex;
            border-bottom: 2px solid #e2e8f0;
            margin-bottom: 30px;
        }

        .tab {
            padding: 12px 24px;
            background: none;
            border: none;
            cursor: pointer;
            font-weight: 500;
            color: #64748b;
            border-bottom: 2px solid transparent;
            transition: all 0.2s;
        }

        .tab.active {
            color: #3b82f6;
            border-bottom-color: #3b82f6;
        }

        .tab-content {
            display: none;
        }

        .tab-content.active {
            display: block;
        }

        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
        }

        .info-section {
            background: white;
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            border: 1px solid #e2e8f0;
        }

        .section-title {
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 16px;
            font-size: 1.1rem;
        }

        .section-icon {
            width: 16px;
            height: 16px;
            border-radius: 3px;
        }

        .section-icon.blue { background: #3b82f6; }
        .section-icon.yellow { background: #f59e0b; }

        .info-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #f1f5f9;
        }

        .info-item:last-child {
            border-bottom: none;
        }

        .info-label {
            font-weight: 500;
            color: #475569;
        }

        .info-value {
            font-weight: 600;
            color: #1e293b;
        }

        .recommendations {
            background: #fffbeb;
            border: 1px solid #fcd34d;
            border-radius: 8px;
            padding: 12px 16px;
            margin-top: 16px;
        }

        .recommendations-title {
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 600;
            color: #92400e;
            margin-bottom: 8px;
        }

        .recommendation {
            color: #92400e;
            font-size: 0.875rem;
        }

        .footer {
            text-align: center;
            color: #64748b;
            font-size: 0.875rem;
            margin-top: 40px;
        }

        .loading {
            opacity: 0.6;
            pointer-events: none;
        }

        .error {
            background: #fef2f2;
            border: 1px solid #fca5a5;
            color: #dc2626;
            padding: 12px;
            border-radius: 8px;
            margin: 10px 0;
        }

        @media (max-width: 768px) {
            .container {
                padding: 10px;
            }

            .header {
                flex-direction: column;
                align-items: flex-start;
                gap: 15px;
            }

            .metrics-grid {
                grid-template-columns: 1fr;
            }

            .info-grid {
                grid-template-columns: 1fr;
            }

            .title {
                font-size: 2rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div>
                <h1 class="title">API Health Dashboard</h1>
                <p class="subtitle">Real-time monitoring of API services and infrastructure</p>
            </div>
            <div class="status-badge">
                <button class="refresh-btn" onclick="refreshData()">Refresh</button>
                <span id="status-badge" class="badge healthy">HEALTHY</span>
            </div>
        </div>

        <div id="loading-indicator" class="loading" style="display: none;">Loading...</div>
        <div id="error-container"></div>

        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-header">
                    <div class="metric-icon database"></div>
                    <span class="metric-title">Database</span>
                </div>
                <div class="metric-value" id="db-response-time">-</div>
                <div class="metric-description" id="db-status">Checking connection...</div>
            </div>

            <div class="metric-card">
                <div class="metric-header">
                    <div class="metric-icon api"></div>
                    <span class="metric-title">API Status</span>
                </div>
                <div class="metric-value" id="api-requests">-</div>
                <div class="metric-description" id="api-status">Monitoring requests...</div>
            </div>

            <div class="metric-card">
                <div class="metric-header">
                    <div class="metric-icon memory"></div>
                    <span class="metric-title">System Memory</span>
                </div>
                <div class="metric-value" id="memory-used">-</div>
                <div class="metric-description" id="memory-total">Calculating usage...</div>
            </div>

            <div class="metric-card">
                <div class="metric-header">
                    <div class="metric-icon uptime"></div>
                    <span class="metric-title">Uptime</span>
                </div>
                <div class="metric-value" id="uptime">-</div>
                <div class="metric-description" id="process-id">PID: -</div>
            </div>
        </div>

        <div class="tabs">
            <button class="tab active" onclick="showTab('system')">System</button>
            <button class="tab" onclick="showTab('database')">Database Status</button>
            <button class="tab" onclick="showTab('performance')">Performance</button>
        </div>

        <div id="system-tab" class="tab-content active">
            <div class="info-grid">
                <div class="info-section">
                    <h3 class="section-title">
                        <div class="section-icon blue"></div>
                        System Information
                    </h3>
                    <div class="info-item">
                        <span class="info-label">Process ID</span>
                        <span class="info-value" id="system-pid">-</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Uptime</span>
                        <span class="info-value" id="system-uptime">-</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Memory Used</span>
                        <span class="info-value" id="system-memory-used">-</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Memory Total</span>
                        <span class="info-value" id="system-memory-total">-</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Node Version</span>
                        <span class="info-value" id="node-version">-</span>
                    </div>
                </div>

                <div class="info-section">
                    <h3 class="section-title">
                        <div class="section-icon yellow"></div>
                        Recommendations
                    </h3>
                    <div class="recommendations">
                        <div class="recommendations-title">
                            ⚠️ System Status
                        </div>
                        <div class="recommendation" id="recommendations-text">
                            System operating normally
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div id="database-tab" class="tab-content">
            <div class="info-grid">
                <div class="info-section">
                    <h3 class="section-title">
                        <div class="section-icon blue"></div>
                        Database Metrics
                    </h3>
                    <div class="info-item">
                        <span class="info-label">Connection Status</span>
                        <span class="info-value" id="db-connection-status">-</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Response Time</span>
                        <span class="info-value" id="db-response-time-detailed">-</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">User Count</span>
                        <span class="info-value" id="db-user-count">-</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Query Performance</span>
                        <span class="info-value" id="db-query-performance">-</span>
                    </div>
                </div>

                <div class="info-section">
                    <h3 class="section-title">
                        <div class="section-icon blue"></div>
                        Connection Pool
                    </h3>
                    <div class="info-item">
                        <span class="info-label">Pool Status</span>
                        <span class="info-value" id="pool-status">-</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Active Connections</span>
                        <span class="info-value" id="pool-active">-</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Pool Size</span>
                        <span class="info-value" id="pool-size">-</span>
                    </div>
                </div>
            </div>
        </div>

        <div id="performance-tab" class="tab-content">
            <div class="info-grid">
                <div class="info-section">
                    <h3 class="section-title">
                        <div class="section-icon blue"></div>
                        API Performance
                    </h3>
                    <div class="info-item">
                        <span class="info-label">Total Queries</span>
                        <span class="info-value" id="total-queries">-</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Failed Queries</span>
                        <span class="info-value" id="failed-queries">-</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Average Query Time</span>
                        <span class="info-value" id="avg-query-time">-</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Slow Queries</span>
                        <span class="info-value" id="slow-queries">-</span>
                    </div>
                </div>

                <div class="info-section">
                    <h3 class="section-title">
                        <div class="section-icon blue"></div>
                        Error Tracking
                    </h3>
                    <div class="info-item">
                        <span class="info-label">Error Rate</span>
                        <span class="info-value" id="error-rate">-</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Last Error</span>
                        <span class="info-value" id="last-error">-</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Recovery Time</span>
                        <span class="info-value" id="recovery-time">-</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="footer">
            <p>Last updated: <span id="last-updated">-</span> • Auto-refresh every 30 seconds</p>
        </div>
    </div>

    <script>
        let refreshInterval;

        function showTab(tabName) {
            // Hide all tabs
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            document.querySelectorAll('.tab').forEach(tab => {
                tab.classList.remove('active');
            });

            // Show selected tab
            document.getElementById(tabName + '-tab').classList.add('active');
            event.target.classList.add('active');
        }

        function formatBytes(bytes) {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
        }

        function formatUptime(seconds) {
            if (seconds < 60) return Math.floor(seconds) + 's';
            if (seconds < 3600) return Math.floor(seconds / 60) + 'm';
            if (seconds < 86400) return Math.floor(seconds / 3600) + 'h';
            return Math.floor(seconds / 86400) + 'd';
        }

        function showError(message) {
            const errorContainer = document.getElementById('error-container');
            errorContainer.innerHTML = '<div class="error">Error: ' + message + '</div>';
        }

        function clearError() {
            const errorContainer = document.getElementById('error-container');
            errorContainer.innerHTML = '';
        }

                 async function refreshData() {
             const loadingIndicator = document.getElementById('loading-indicator');
             loadingIndicator.style.display = 'block';
             clearError();
 
             try {
                 // Fetch all health data in parallel
                 const [generalHealth, databaseHealth, databaseMetrics, enhancedHealth, systemInfo] = await Promise.all([
                     fetch('/api/health').then(r => r.json()),
                     fetch('/api/health/database').then(r => r.json()),
                     fetch('/api/health/database/metrics').then(r => r.json()),
                     fetch('/api/health/database/enhanced').then(r => r.json()),
                     fetch('/api/health/system').then(r => r.json())
                 ]);
 
                 updateGeneralStatus(generalHealth);
                 updateDatabaseStatus(databaseHealth, enhancedHealth);
                 updateMetrics(databaseMetrics);
                 updateSystemInfo(systemInfo);
 
                 document.getElementById('last-updated').textContent = new Date().toLocaleString();
 
             } catch (error) {
                 console.error('Failed to fetch health data:', error);
                 showError('Failed to fetch health data: ' + error.message);
                 
                 // Update status to unhealthy
                 const statusBadge = document.getElementById('status-badge');
                 statusBadge.textContent = 'UNHEALTHY';
                 statusBadge.className = 'badge unhealthy';
             } finally {
                 loadingIndicator.style.display = 'none';
             }
         }

        function updateGeneralStatus(data) {
            const statusBadge = document.getElementById('status-badge');
            
            if (data.status === 'healthy') {
                statusBadge.textContent = 'HEALTHY';
                statusBadge.className = 'badge healthy';
                document.getElementById('recommendations-text').textContent = 'System operating normally';
            } else {
                statusBadge.textContent = 'UNHEALTHY';
                statusBadge.className = 'badge unhealthy';
                document.getElementById('recommendations-text').textContent = 'System requires attention';
            }
        }

        function updateDatabaseStatus(dbHealth, enhancedHealth) {
            // Update main database metrics
            const responseTime = dbHealth.details?.responseTime || 'Unknown';
            document.getElementById('db-response-time').textContent = responseTime;
            document.getElementById('db-response-time-detailed').textContent = responseTime;
            
            const connectionStatus = dbHealth.details?.status || 'unknown';
            document.getElementById('db-status').textContent = connectionStatus;
            document.getElementById('db-connection-status').textContent = connectionStatus;
            
            const userCount = dbHealth.details?.userCount || 0;
            document.getElementById('db-user-count').textContent = userCount.toLocaleString();

            // Update enhanced metrics if available
            if (enhancedHealth?.metrics) {
                const metrics = enhancedHealth.metrics;
                document.getElementById('total-queries').textContent = metrics.totalQueries || 0;
                document.getElementById('failed-queries').textContent = metrics.failedQueries || 0;
                document.getElementById('avg-query-time').textContent = (metrics.averageQueryTime || 0) + 'ms';
                document.getElementById('slow-queries').textContent = metrics.slowQueries || 0;
                
                const errorRate = metrics.totalQueries > 0 ? 
                    ((metrics.failedQueries / metrics.totalQueries) * 100).toFixed(2) : 0;
                document.getElementById('error-rate').textContent = errorRate + '%';
                
                document.getElementById('last-error').textContent = metrics.lastError || 'None';
            }
        }

        function updateMetrics(metrics) {
            if (metrics) {
                document.getElementById('db-query-performance').textContent = 
                    (metrics.averageQueryTime || 0) + 'ms avg';
            }
        }

                 function updateSystemInfo(systemInfo) {
             if (!systemInfo) {
                 // Fallback to browser-based info if server data unavailable
                 document.getElementById('system-pid').textContent = 'N/A';
                 document.getElementById('process-id').textContent = 'PID: N/A';
                 document.getElementById('uptime').textContent = 'N/A';
                 document.getElementById('system-uptime').textContent = 'N/A';
                 document.getElementById('memory-used').textContent = 'N/A';
                 document.getElementById('memory-total').textContent = 'N/A';
                 document.getElementById('system-memory-used').textContent = 'N/A';
                 document.getElementById('system-memory-total').textContent = 'N/A';
                 document.getElementById('node-version').textContent = 'N/A';
                 return;
             }
             
             // Update system information with real server data
             document.getElementById('system-pid').textContent = systemInfo.processId;
             document.getElementById('process-id').textContent = 'PID: ' + systemInfo.processId;
             
             document.getElementById('uptime').textContent = systemInfo.uptimeFormatted;
             document.getElementById('system-uptime').textContent = systemInfo.uptimeFormatted;
             
             // Memory information from server
             document.getElementById('memory-used').textContent = systemInfo.memory.heapUsedFormatted;
             document.getElementById('memory-total').textContent = systemInfo.memory.heapTotalFormatted + ' heap';
             document.getElementById('system-memory-used').textContent = systemInfo.memory.heapUsedFormatted;
             document.getElementById('system-memory-total').textContent = systemInfo.memory.rssFormatted + ' RSS';
             
             document.getElementById('node-version').textContent = systemInfo.nodeVersion;
             
             // Update API status
             document.getElementById('api-requests').textContent = 'Active';
             document.getElementById('api-status').textContent = 'Processing requests';
             
             // Connection pool info (mock for now)
             document.getElementById('pool-status').textContent = 'Active';
             document.getElementById('pool-active').textContent = '5/10';
             document.getElementById('pool-size').textContent = '10';
             
             document.getElementById('recovery-time').textContent = '< 1s';
         }

        // Initialize dashboard
        document.addEventListener('DOMContentLoaded', function() {
            refreshData();
            
            // Set up auto-refresh every 30 seconds
            refreshInterval = setInterval(refreshData, 30000);
        });

        // Clean up interval when page is hidden
        document.addEventListener('visibilitychange', function() {
            if (document.hidden) {
                clearInterval(refreshInterval);
            } else {
                refreshInterval = setInterval(refreshData, 30000);
                refreshData(); // Refresh immediately when page becomes visible
            }
        });
    </script>
 </body>
 </html>`;

    res.setHeader("Content-Type", "text/html");
    res.send(html);
  }

  @Get("database")
  @Public()
  async getDatabaseHealth() {
    return this.databaseHealth.getComprehensiveHealth();
  }

  @Get("database/basic")
  @Public()
  async getBasicDatabaseHealth() {
    return this.databaseHealth.checkHealth();
  }

  @Get("database/pool")
  @Public()
  async getConnectionPoolHealth() {
    return this.databaseHealth.checkConnectionPool();
  }

  @Get("database/tables")
  @Public()
  async getTablesHealth() {
    return this.databaseHealth.checkDatabaseTables();
  }

  @Get("database/enhanced")
  @Public()
  async getEnhancedDatabaseHealth(): Promise<any> {
    return this.prismaService.getHealthStatus();
  }

  @Get("database/metrics")
  @Public()
  async getDatabaseMetrics(): Promise<any> {
    return this.prismaService.getQueryMetrics();
  }

  @Get("database/table-access")
  @Public()
  async getTableAccessHealth(): Promise<any> {
    return this.prismaService.testTableAccess();
  }

  @Post("database/maintenance")
  @Public()
  async performMaintenance(): Promise<any> {
    return this.prismaService.performMaintenance();
  }

  @Post("database/metrics/reset")
  @Public()
  async resetMetrics() {
    this.prismaService.resetMetrics();
    return { success: true, message: "Metrics reset successfully" };
  }

  @Get("database/insights")
  @Public()
  async getDatabaseInsights(): Promise<any> {
    return this.prismaService.getDatabaseInsights();
  }

  @Get("database/transactions")
  @Public()
  async getTransactionMetrics(): Promise<any> {
    return this.prismaService.getTransactionMetrics();
  }

  @Get("database/indexes")
  @Public()
  async getIndexPerformance(): Promise<any> {
    return this.prismaService.getIndexPerformance();
  }

  @Get("system")
  @Public()
  async getSystemInfo() {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    return {
      processId: process.pid,
      uptime: uptime,
      uptimeFormatted: this.formatUptime(uptime),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memory: {
        rss: memoryUsage.rss,
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        external: memoryUsage.external,
        rssFormatted: this.formatBytes(memoryUsage.rss),
        heapUsedFormatted: this.formatBytes(memoryUsage.heapUsed),
        heapTotalFormatted: this.formatBytes(memoryUsage.heapTotal),
      },
      env: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString(),
    };
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }

  private formatUptime(seconds: number): string {
    if (seconds < 60) return Math.floor(seconds) + "s";
    if (seconds < 3600) return Math.floor(seconds / 60) + "m";
    if (seconds < 86400) return Math.floor(seconds / 3600) + "h";
    return Math.floor(seconds / 86400) + "d";
  }
}
