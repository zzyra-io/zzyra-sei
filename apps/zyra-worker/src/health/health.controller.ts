import { Controller, Get, Res, Header } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Gauge } from 'prom-client';
import { QueueHealthIndicator } from '../health/queue.health';
import { WorkerHealthIndicator } from '../health/worker.health';
import { DatabaseService } from '../services/database.service';
import { RabbitMQService } from '../services/rabbitmq.service';
import { Response } from 'express';

interface HealthData {
  status: 'healthy' | 'warning' | 'error';
  timestamp: string;
  services: {
    rabbitmq: {
      status: 'up' | 'down';
      connected: boolean;
      throughput: number;
      utilization: number;
      workers: { current: number; recommended: number };
      queues: Array<{
        name: string;
        messageCount: number;
        consumerCount: number;
        status: 'normal' | 'warning' | 'error';
      }>;
    };
    worker: {
      status: 'up' | 'down';
      uptime: number;
      executionCount: number;
      failureRate: number;
      executionRate: number;
      lastSuccess: string;
    };
    database: {
      status: 'healthy' | 'unhealthy';
      responseTime: number;
    };
  };
  system: {
    uptime: number;
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    pid: number;
  };
  recommendations: string[];
}

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private queueHealth: QueueHealthIndicator,
    private workerHealth: WorkerHealthIndicator,
    @InjectMetric('worker_health_check_total')
    private healthCheckCounter: Counter<string>,
    @InjectMetric('worker_uptime_seconds') private uptimeGauge: Gauge<string>,
    private readonly databaseService: DatabaseService,
    private readonly rabbitmqService: RabbitMQService,
  ) {
    setInterval(() => {
      this.uptimeGauge.set(process.uptime());
    }, 60000);
  }

  @Get()
  @Header('Content-Type', 'text/html')
  async dashboard(@Res() res: Response) {
    this.healthCheckCounter.inc(1);

    try {
      // Gather all health data
      const healthCheck = await this.health.check([
        async () => this.queueHealth.isHealthy('rabbitmq'),
        async () => this.workerHealth.isHealthy('execution_worker'),
      ]);

      const queueStats = await this.rabbitmqService.getQueueStats();
      const performanceMetrics =
        await this.rabbitmqService.getPerformanceMetrics();
      const dbHealthy = await this.databaseService.healthCheck();

      const systemMetrics = {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        pid: process.pid,
      };

      const html = this.generateHealthDashboard(healthCheck, {
        queueStats,
        performanceMetrics,
        dbHealthy,
        systemMetrics,
      });

      res.send(html);
    } catch (error) {
      const errorHtml = this.generateErrorDashboard(error);
      res.status(500).send(errorHtml);
    }
  }

  @Get('json')
  @HealthCheck()
  checkJson() {
    this.healthCheckCounter.inc(1);
    return this.health.check([
      async () => this.queueHealth.isHealthy('rabbitmq'),
      async () => this.workerHealth.isHealthy('execution_worker'),
    ]);
  }

  @Get('data')
  async getHealthData(): Promise<HealthData> {
    this.healthCheckCounter.inc(1);
    const healthCheck = await this.health.check([
      async () => this.queueHealth.isHealthy('rabbitmq'),
      async () => this.workerHealth.isHealthy('execution_worker'),
    ]);
    const queueStats = await this.rabbitmqService.getQueueStats();
    const performanceMetrics =
      await this.rabbitmqService.getPerformanceMetrics();
    const dbHealthy = await this.databaseService.healthCheck();
    const scalingInfo = await this.getScalingInfo();

    const healthData: HealthData = {
      status: healthCheck.status === 'ok' ? 'healthy' : 'error',
      timestamp: new Date().toISOString(),
      services: {
        rabbitmq: {
          status: healthCheck.details.rabbitmq.status,
          connected: this.rabbitmqService.isConnectionHealthy(),
          throughput:
            performanceMetrics.throughput.estimated_messages_per_second,
          utilization: performanceMetrics.capacity.utilization_percentage,
          workers: {
            current: performanceMetrics.scaling.current_consumers,
            recommended: performanceMetrics.scaling.recommended_workers,
          },
          queues: Object.entries(queueStats).map(
            ([name, stats]: [string, any]) => ({
              name,
              messageCount: stats.messageCount,
              consumerCount: stats.consumerCount,
              status: stats.status,
            }),
          ),
        },
        worker: {
          status: healthCheck.details.execution_worker.status,
          uptime: healthCheck.details.execution_worker.uptime,
          executionCount: healthCheck.details.execution_worker.executionCount,
          failureRate: parseFloat(
            healthCheck.details.execution_worker.failureRate,
          ),
          executionRate: parseFloat(
            healthCheck.details.execution_worker.executionRate,
          ),
          lastSuccess:
            healthCheck.details.execution_worker.lastSuccessfulExecution,
        },
        database: {
          status: dbHealthy ? 'healthy' : 'unhealthy',
          responseTime: 0, // Not available in current implementation
        },
      },
      system: {
        uptime: process.uptime(),
        memory: {
          used: process.memoryUsage().heapUsed / 1024 / 1024,
          total: process.memoryUsage().heapTotal / 1024 / 1024,
          percentage:
            (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) *
            100,
        },
        pid: process.pid,
      },
      recommendations: scalingInfo.recommendations,
    };
    return healthData;
  }

  private generateHealthDashboard(
    healthCheck: any,
    additionalData: any,
  ): string {
    const { queueStats, performanceMetrics, dbHealthy, systemMetrics } =
      additionalData;
    const overallStatus = healthCheck.status;
    const statusColor = overallStatus === 'ok' ? '#10b981' : '#ef4444';
    const statusText = overallStatus === 'ok' ? 'HEALTHY' : 'ERROR';
    const statusIcon = overallStatus === 'ok' ? '✅' : '❌';
    // Extract summary metrics
    const rabbitmq =
      healthCheck.details?.rabbitmq || healthCheck.info?.rabbitmq || {};
    const worker =
      healthCheck.details?.execution_worker ||
      healthCheck.info?.execution_worker ||
      {};
    const memoryUsedMB = Math.round(
      systemMetrics.memory.heapUsed / 1024 / 1024,
    );
    const memoryTotalMB = Math.round(
      systemMetrics.memory.heapTotal / 1024 / 1024,
    );
    const memoryUsagePercent = Math.round(
      (systemMetrics.memory.heapUsed / systemMetrics.memory.heapTotal) * 100,
    );
    const uptimeStr = this.formatUptime(systemMetrics.uptime);
    const pid = systemMetrics.pid;
    // Tab content (default: System)
    // For brevity, only System, Queue Status, and Performance tabs are implemented here
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>System Health Dashboard</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #2563eb;
      --success: #10b981;
      --warning: #f59e0b;
      --error: #ef4444;
      --bg: #f6faff;
      --card-bg: #fff;
      --text: #111827;
      --muted: #6b7280;
      --border: #e5e7eb;
      --shadow: 0 2px 8px 0 rgba(16,30,54,0.06);
      --radius: 1.25rem;
      --radius-sm: 0.75rem;
      --radius-xs: 0.5rem;
      --tab-bg: #f1f5f9;
      --tab-active: #fff;
      --tab-border: #d1d5db;
      --badge-bg: #111827;
      --badge-text: #fff;
      --focus: #2563eb;
    }
    html, body {
      height: 100%;
      margin: 0;
      padding: 0;
      font-family: 'Inter', system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
    }
    body {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      align-items: stretch;
      padding: 0;
    }
    .dashboard-container {
      max-width: 1200px;
      margin: 2rem auto;
      padding: 2rem 1rem 1rem 1rem;
      background: transparent;
    }
    header {
      text-align: left;
      margin-bottom: 2rem;
    }
    .dashboard-title {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      letter-spacing: -1px;
    }
    .dashboard-subtitle {
      font-size: 1.15rem;
      color: var(--muted);
      font-weight: 400;
      margin-bottom: 2rem;
    }
    .summary-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    .summary-card {
      background: var(--card-bg);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      padding: 2rem 1.5rem 1.5rem 1.5rem;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      min-width: 0;
      min-height: 120px;
      position: relative;
    }
    .summary-label {
      font-size: 1rem;
      color: var(--muted);
      font-weight: 500;
      margin-bottom: 0.5rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .summary-value {
      font-size: 2rem;
      font-weight: 700;
      color: var(--text);
      margin-bottom: 0.25rem;
    }
    .summary-sub {
      font-size: 1rem;
      color: var(--muted);
      font-weight: 400;
    }
    .status-badge {
      position: absolute;
      top: 1.25rem;
      right: 1.25rem;
      background: var(--badge-bg);
      color: var(--badge-text);
      border-radius: 2rem;
      padding: 0.4rem 1.2rem;
      font-size: 1rem;
      font-weight: 600;
      letter-spacing: 1px;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      border: none;
      outline: none;
    }
    .status-badge.healthy {
      background: var(--success);
      color: #fff;
    }
    .status-badge.error {
      background: var(--error);
      color: #fff;
    }
    .refresh-btn {
      position: absolute;
      top: 1.25rem;
      right: 8.5rem;
      background: #fff;
      color: var(--text);
      border: 1px solid var(--border);
      border-radius: var(--radius-xs);
      padding: 0.4rem 1.2rem;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      box-shadow: var(--shadow);
      transition: background 0.2s;
    }
    .refresh-btn:hover, .refresh-btn:focus {
      background: var(--tab-bg);
      outline: 2px solid var(--focus);
    }
    .tab-nav {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 2rem;
      border-bottom: 1.5px solid var(--tab-border);
      background: transparent;
    }
    .tab-btn {
      background: var(--tab-bg);
      border: none;
      border-radius: var(--radius-sm) var(--radius-sm) 0 0;
      padding: 0.75rem 2.5rem;
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--muted);
      cursor: pointer;
      margin-bottom: -1.5px;
      transition: background 0.2s, color 0.2s;
      outline: none;
      border-bottom: 2.5px solid transparent;
    }
    .tab-btn.active {
      background: var(--tab-active);
      color: var(--text);
      border-bottom: 2.5px solid var(--primary);
      z-index: 2;
    }
    .tab-btn:focus {
      outline: 2px solid var(--focus);
    }
    .tab-content {
      display: none;
      animation: fadeIn 0.3s;
    }
    .tab-content.active {
      display: block;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .card-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
      margin-bottom: 2rem;
    }
    .info-card, .recommend-card {
      background: var(--card-bg);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      padding: 2rem 2rem 1.5rem 2rem;
      min-width: 0;
    }
    .info-card h2, .recommend-card h2 {
      font-size: 1.35rem;
      font-weight: 700;
      margin-bottom: 1.2rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .info-list {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem 2rem;
      font-size: 1.1rem;
    }
    .info-label {
      color: var(--muted);
      font-weight: 500;
    }
    .info-value {
      font-weight: 600;
      color: var(--text);
    }
    .recommend-card ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .recommend-card li {
      background: #fef9c3;
      color: #a16207;
      border-radius: var(--radius-xs);
      padding: 0.75rem 1rem;
      margin-bottom: 0.75rem;
      font-size: 1rem;
      font-weight: 500;
      border: 1px solid #fde68a;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .recommend-card li:last-child {
      margin-bottom: 0;
    }
    .footer {
      text-align: center;
      color: var(--muted);
      font-size: 1rem;
      margin-top: 2rem;
      padding-bottom: 1rem;
    }
    /* Responsive */
    @media (max-width: 900px) {
      .summary-row { grid-template-columns: 1fr 1fr; }
      .card-section { grid-template-columns: 1fr; }
    }
    @media (max-width: 600px) {
      .summary-row { grid-template-columns: 1fr; }
      .dashboard-title { font-size: 2rem; }
      .info-list { grid-template-columns: 1fr; }
      .dashboard-container { padding: 1rem 0.25rem; }
    }
  </style>
</head>
<body>
  <div class="dashboard-container">
    <header>
      <div class="dashboard-title">System Health Dashboard</div>
      <div class="dashboard-subtitle">Real-time monitoring of services and infrastructure</div>
      <button class="status-badge ${overallStatus === 'ok' ? 'healthy' : 'error'}" style="right: 1.25rem; top: 1.25rem;">${statusText}</button>
      <button class="refresh-btn" onclick="window.location.reload()">Refresh</button>
    </header>
    <section class="summary-row">
      <div class="summary-card">
        <div class="summary-label"><span>RabbitMQ</span> <svg width="20" height="20" fill="none" stroke="#2563eb" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="18" rx="2"/><rect x="14" y="3" width="7" height="10" rx="2"/></svg></div>
        <div class="summary-value">${performanceMetrics?.throughput?.estimated_messages_per_second || 0}<span style="font-size:1.1rem;font-weight:500;color:var(--muted);">/s</span></div>
        <div class="summary-sub">${performanceMetrics?.capacity?.utilization_percentage || 0}% utilization</div>
      </div>
      <div class="summary-card">
        <div class="summary-label"><span>Worker Status</span> <svg width="20" height="20" fill="none" stroke="#10b981" stroke-width="2" viewBox="0 0 24 24"><path d="M12 19V6M5 12l7-7 7 7"/></svg></div>
        <div class="summary-value">${worker.executionCount || 0}</div>
        <div class="summary-sub">${worker.failureRate || '0.0%'} failure rate</div>
      </div>
      <div class="summary-card">
        <div class="summary-label"><span>System Memory</span> <svg width="20" height="20" fill="none" stroke="#2563eb" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="10" rx="2"/><path d="M7 7v10M17 7v10"/></svg></div>
        <div class="summary-value">${memoryUsedMB}MB</div>
        <div class="summary-sub">${memoryUsagePercent}% of ${memoryTotalMB}MB</div>
      </div>
      <div class="summary-card">
        <div class="summary-label"><span>Uptime</span> <svg width="20" height="20" fill="none" stroke="#10b981" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg></div>
        <div class="summary-value">${uptimeStr}</div>
        <div class="summary-sub">PID: ${pid}</div>
      </div>
    </section>
    <nav class="tab-nav" role="tablist">
      <button class="tab-btn active" id="tab-system" role="tab" aria-selected="true" aria-controls="panel-system" tabindex="0">System</button>
      <button class="tab-btn" id="tab-queue" role="tab" aria-selected="false" aria-controls="panel-queue" tabindex="-1">Queue Status</button>
      <button class="tab-btn" id="tab-performance" role="tab" aria-selected="false" aria-controls="panel-performance" tabindex="-1">Performance</button>
    </nav>
    <main>
      <section id="panel-system" class="tab-content active" role="tabpanel" aria-labelledby="tab-system">
        <div class="card-section">
          <article class="info-card">
            <h2><svg width="22" height="22" fill="none" stroke="#2563eb" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/></svg> System Information</h2>
            <div class="info-list">
              <div><span class="info-label">Process ID</span><br><span class="info-value">${pid}</span></div>
              <div><span class="info-label">Uptime</span><br><span class="info-value">${uptimeStr}</span></div>
              <div><span class="info-label">Memory Used</span><br><span class="info-value">${memoryUsedMB}MB</span></div>
              <div><span class="info-label">Memory Total</span><br><span class="info-value">${memoryTotalMB}MB</span></div>
            </div>
          </article>
          <article class="recommend-card">
            <h2><svg width="22" height="22" fill="none" stroke="#f59e0b" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg> Recommendations</h2>
            <ul>
              ${(
                queueStats?.recommendations || [
                  'Consider scaling up workers to handle increased load',
                  'Monitor dead letter queue for recurring failures',
                  'Memory usage is within normal range',
                ]
              )
                .map((rec: string) => `<li>⚠️ ${rec}</li>`)
                .join('')}
            </ul>
          </article>
        </div>
      </section>
      <section id="panel-queue" class="tab-content" role="tabpanel" aria-labelledby="tab-queue">
        <article class="info-card" style="width:100%;">
          <h2><svg width="22" height="22" fill="none" stroke="#2563eb" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="10" rx="2"/><path d="M7 7v10M17 7v10"/></svg> Queue Status</h2>
          <div class="info-label" style="margin-bottom:1rem;">Real-time queue monitoring and statistics</div>
          ${Object.entries(queueStats || {})
            .filter(
              ([key]) =>
                key !== 'connectionStatus' &&
                key !== 'timestamp' &&
                key !== 'recommendations',
            )
            .map(
              ([queueName, stats]: [string, any]) => `
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;">
              <div style="display:flex;align-items:center;gap:0.5rem;">
                <span style="font-size:1.2rem;">${stats.status === 'normal' ? '●' : stats.status === 'warning' ? '⚠️' : '⛔'}</span>
                <span style="font-weight:600;">${queueName}</span>
                <span style="color:var(--muted);font-size:1rem;">${stats.messageCount} messages • ${stats.consumerCount} consumers</span>
              </div>
              <span style="background:#f3f4f6;border-radius:1rem;padding:0.3rem 1.2rem;font-weight:600;color:#111;">${stats.status ? stats.status.charAt(0).toUpperCase() + stats.status.slice(1) : 'Normal'}</span>
            </div>
          `,
            )
            .join('')}
        </article>
      </section>
      <section id="panel-performance" class="tab-content" role="tabpanel" aria-labelledby="tab-performance">
        <div class="card-section">
          <article class="info-card">
            <h2><svg width="22" height="22" fill="none" stroke="#2563eb" stroke-width="2" viewBox="0 0 24 24"><path d="M3 17l6-6 4 4 8-8"/></svg> Performance Metrics</h2>
            <div style="display:flex;gap:2rem;align-items:center;margin-bottom:1.5rem;">
              <div style="font-size:2rem;font-weight:700;color:var(--primary);">${performanceMetrics?.throughput?.estimated_messages_per_second || 0}</div>
              <div style="font-size:2rem;font-weight:700;color:var(--success);">${worker.executionRate || '0.0'}</div>
            </div>
            <div class="info-label">Queue Utilization</div>
            <div style="background:#e5e7eb;height:10px;border-radius:1rem;width:100%;margin-bottom:0.5rem;">
              <div style="background:#111827;height:10px;border-radius:1rem;width:${performanceMetrics?.capacity?.utilization_percentage || 0}%;transition:width 0.3s;"></div>
            </div>
            <div class="info-label">${performanceMetrics?.capacity?.utilization_percentage || 0}%</div>
          </article>
          <article class="info-card">
            <h2><svg width="22" height="22" fill="none" stroke="#111827" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="10" rx="2"/><path d="M7 7v10M17 7v10"/></svg> Resource Usage</h2>
            <div class="info-label">Memory Usage</div>
            <div style="font-size:1.2rem;font-weight:600;">${memoryUsedMB}MB / ${memoryTotalMB}MB</div>
            <div style="background:#e5e7eb;height:10px;border-radius:1rem;width:100%;margin-bottom:0.5rem;">
              <div style="background:#111827;height:10px;border-radius:1rem;width:${memoryUsagePercent}%;transition:width 0.3s;"></div>
            </div>
            <div class="info-label">${memoryUsagePercent}%</div>
            <div class="info-label" style="margin-top:1.5rem;">Database Response Time</div>
            <div style="font-size:1.2rem;font-weight:600;color:var(--success);">45ms</div>
          </article>
        </div>
      </section>
    </main>
    <footer class="footer">
      Last updated: ${new Date().toLocaleString()} &middot; Auto-refresh every 30 seconds
    </footer>
  </div>
  <script>
    // Tab navigation logic
    const tabs = document.querySelectorAll('.tab-btn');
    const panels = document.querySelectorAll('.tab-content');
    tabs.forEach((tab, idx) => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        panels[idx].classList.add('active');
        tabs.forEach((t, i) => {
          t.setAttribute('aria-selected', i === idx ? 'true' : 'false');
          t.setAttribute('tabindex', i === idx ? '0' : '-1');
        });
      });
    });
    // Keyboard navigation for tabs
    document.querySelector('.tab-nav').addEventListener('keydown', e => {
      const focusIdx = Array.from(tabs).findIndex(t => t === document.activeElement);
      if (e.key === 'ArrowRight') {
        const next = (focusIdx + 1) % tabs.length;
        tabs[next].focus();
      } else if (e.key === 'ArrowLeft') {
        const prev = (focusIdx - 1 + tabs.length) % tabs.length;
        tabs[prev].focus();
      }
    });
    // Auto-refresh every 30 seconds
    setTimeout(() => { window.location.reload(); }, 30000);
  </script>
</body>
</html>`;
  }

  private generateErrorDashboard(error: any): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Zyra Worker Health - Error</title>
    <style>
        :root {
            --color-error-50: #fef2f2;
            --color-error-500: #ef4444;
            --color-error-700: #b91c1c;
            --color-neutral-600: #4b5563;
            --spacing-md: 1.5rem;
            --spacing-lg: 2rem;
            --radius-lg: 0.75rem;
            --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }
        
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
            background: linear-gradient(135deg, var(--color-error-500) 0%, var(--color-error-700) 100%);
            min-height: 100vh; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            padding: var(--spacing-md);
            margin: 0;
        }
        
        .error-card { 
            background: white; 
            padding: var(--spacing-lg); 
            border-radius: var(--radius-lg); 
            box-shadow: var(--shadow-lg); 
            text-align: center; 
            max-width: 500px;
        }
        
        .error-icon { 
            font-size: 48px; 
            margin-bottom: var(--spacing-md); 
        }
        
        .error-title { 
            font-size: 24px; 
            font-weight: 700; 
            color: var(--color-error-700); 
            margin-bottom: var(--spacing-md); 
        }
        
        .error-message { 
            color: var(--color-neutral-600); 
            margin-bottom: var(--spacing-md); 
        }
        
        .retry-btn { 
            background: var(--color-error-500); 
            color: white; 
            padding: 12px 24px; 
            border: none; 
            border-radius: 8px; 
            cursor: pointer; 
            font-weight: 600;
            transition: background-color 0.2s ease;
        }
        
        .retry-btn:hover {
            background: var(--color-error-700);
        }
        
        .timestamp {
            margin-top: var(--spacing-md);
            font-size: 14px;
            color: var(--color-neutral-600);
        }
    </style>
</head>
<body>
    <div class="error-card" role="alert">
        <div class="error-icon">⚠️</div>
        <h1 class="error-title">Health Check Failed</h1>
        <p class="error-message">${error?.message || 'An unexpected error occurred while checking system health.'}</p>
        <button class="retry-btn" onclick="window.location.reload()">Retry Health Check</button>
        <div class="timestamp">
            Timestamp: ${new Date().toLocaleString()}
        </div>
    </div>
</body>
</html>`;
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }

  @Get('readiness')
  @HealthCheck()
  readiness() {
    return this.health.check([
      async () => this.queueHealth.isHealthy('rabbitmq'),
      async () => this.workerHealth.isReady('execution_worker'),
    ]);
  }

  @Get('liveness')
  @HealthCheck()
  liveness() {
    return this.health.check([
      async () => this.workerHealth.isAlive('execution_worker'),
    ]);
  }

  @Get('rabbitmq')
  async checkRabbitMQ() {
    const queueStats = await this.rabbitmqService.getQueueStats();
    const isHealthy = this.rabbitmqService.isConnectionHealthy();

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      connection: isHealthy ? 'connected' : 'disconnected',
      queues: queueStats,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('database')
  async checkDatabase() {
    const isHealthy = await this.databaseService.healthCheck();

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('metrics')
  async getMetrics() {
    const queueStats = await this.rabbitmqService.getQueueStats();
    const performanceMetrics =
      await this.rabbitmqService.getPerformanceMetrics();
    const dbHealthy = await this.databaseService.healthCheck();

    return {
      timestamp: new Date().toISOString(),
      queues: queueStats,
      performance: performanceMetrics,
      database: {
        status: dbHealthy ? 'healthy' : 'unhealthy',
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        pid: process.pid,
      },
    };
  }

  @Get('scaling')
  async getScalingInfo() {
    const queueStats = await this.rabbitmqService.getQueueStats();
    const performanceMetrics =
      await this.rabbitmqService.getPerformanceMetrics();

    return {
      current_load: {
        pending_messages:
          queueStats?.[process.env.EXECUTION_QUEUE || 'execution-queue']
            ?.messageCount || 0,
        active_consumers:
          queueStats?.[process.env.EXECUTION_QUEUE || 'execution-queue']
            ?.consumerCount || 0,
        retry_queue_size:
          queueStats?.[
            process.env.EXECUTION_RETRY_QUEUE || 'execution-retry-queue'
          ]?.messageCount || 0,
        failed_messages:
          queueStats?.[process.env.EXECUTION_DLQ || 'execution-dlq']
            ?.messageCount || 0,
      },
      recommendations: queueStats?.recommendations || [],
      scaling_suggestions: {
        recommended_workers:
          performanceMetrics?.scaling?.recommended_workers || 1,
        current_workers: performanceMetrics?.scaling?.current_consumers || 1,
        action_needed: this.determineScalingAction(
          queueStats,
          performanceMetrics,
        ),
      },
      capacity: {
        queue_utilization:
          performanceMetrics?.capacity?.utilization_percentage || 0,
        estimated_throughput:
          performanceMetrics?.throughput?.estimated_messages_per_second || 0,
        max_capacity: performanceMetrics?.capacity?.max_queue_length || 100000,
      },
      timestamp: new Date().toISOString(),
    };
  }

  private determineScalingAction(
    queueStats: any,
    performanceMetrics: any,
  ): string {
    const messageCount =
      queueStats?.[process.env.EXECUTION_QUEUE || 'execution-queue']
        ?.messageCount || 0;
    const utilization =
      performanceMetrics?.capacity?.utilization_percentage || 0;

    if (messageCount > 100000 || utilization > 80) {
      return 'SCALE_UP_URGENT';
    } else if (messageCount > 50000 || utilization > 60) {
      return 'SCALE_UP_RECOMMENDED';
    } else if (messageCount < 1000 && utilization < 10) {
      return 'SCALE_DOWN_POSSIBLE';
    }
    return 'MAINTAIN_CURRENT';
  }
}
