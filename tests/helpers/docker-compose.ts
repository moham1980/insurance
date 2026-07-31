import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class DockerComposeHelper {
  private static composeFile: string = 'docker-compose.e2e.yml';

  static setComposeFile(file: string): void {
    this.composeFile = file;
  }

  static async up(services?: string[]): Promise<void> {
    const serviceArgs = services ? services.join(' ') : '';
    const cmd = `docker compose -f ${this.composeFile} up -d ${serviceArgs}`;
    await execAsync(cmd);
  }

  static async down(): Promise<void> {
    const cmd = `docker compose -f ${this.composeFile} down -v`;
    await execAsync(cmd);
  }

  static async stop(services?: string[]): Promise<void> {
    const serviceArgs = services ? services.join(' ') : '';
    const cmd = `docker compose -f ${this.composeFile} stop ${serviceArgs}`;
    await execAsync(cmd);
  }

  static async start(services?: string[]): Promise<void> {
    const serviceArgs = services ? services.join(' ') : '';
    const cmd = `docker compose -f ${this.composeFile} start ${serviceArgs}`;
    await execAsync(cmd);
  }

  static async logs(service: string, tail: number = 100): Promise<string> {
    const cmd = `docker compose -f ${this.composeFile} logs --tail=${tail} ${service}`;
    const { stdout } = await execAsync(cmd);
    return stdout;
  }

  static async exec(service: string, command: string): Promise<string> {
    const cmd = `docker compose -f ${this.composeFile} exec -T ${service} ${command}`;
    const { stdout } = await execAsync(cmd);
    return stdout;
  }

  static async isHealthy(service: string): Promise<boolean> {
    // Try HTTP health check first (fast, reliable)
    const httpHealthy = await this.httpHealthCheck(service);
    if (httpHealthy) return true;

    // Fallback: check Docker container health status
    try {
      const cmd = `docker compose -f ${this.composeFile} ps -q ${service} 2>nul || echo.`;
      const { stdout } = await execAsync(cmd);
      const containerId = stdout.trim().split(/\r?\n/)[0];
      if (!containerId || containerId.length < 12) return false;

      const healthCmd = `docker inspect --format='{{.State.Health.Status}}' ${containerId} 2>nul || echo.`;
      const { stdout: healthStatus } = await execAsync(healthCmd);
      const status = healthStatus.trim();
      return status === 'healthy';
    } catch {
      return false;
    }
  }

  private static async httpHealthCheck(service: string): Promise<boolean> {
    try {
      const portMap: Record<string, number> = {
        'api-gateway': 18000,
        'auth-service': 18001,
        'claims-service': 18002,
        'payments-service': 18004,
        'party-kyc-service': 18006,
        'policy-service': 18007,
        'document-service': 18008,
        'fraud-service': 18009,
        'orchestrator-service': 18010,
        'feature-flags-service': 18011,
        'claims-readmodel-service': 18012,
        'complaints-service': 18013,
        'reporting-service': 18014,
        'aml-service': 18016,
        'reinsurance-service': 18017,
        'product-service': 18018,
        'monitoring-service': 18020,
        'document-ai-service': 18021,
        'sales-network-service': 18022,
        'regulatory-gateway-service': 18024,
        'collections-service': 18025,
        'customer-portal-service': 18027,
        'agent-portal-service': 18031,
        'notification-service': 18037,
        'billing-service': 18039,
        'copilot-service': 18030,
        'customer-360-service': 18026,
        'workflow-service': 18028,
        'rule-engine-service': 18038,
        'knowledge-service': 18033,
        'model-switchboard-service': 18035,
        'outbox-relay': 18041,
        'ai-governance-service': 18036,
        'broker-portal-bff': 3030,
        'channel-workspace-bff': 3020,
      };
      const port = portMap[service];
      if (!port) return false;
      const res = await fetch(`http://localhost:${port}/health`, { signal: AbortSignal.timeout(3000) });
      return res.ok;
    } catch {
      return false;
    }
  }

  static async waitForHealth(
    service: string,
    options: { timeoutMs?: number; intervalMs?: number } = {}
  ): Promise<void> {
    const { timeoutMs = 60000, intervalMs = 2000 } = options;
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      if (await this.isHealthy(service)) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error(`Service ${service} did not become healthy within ${timeoutMs}ms`);
  }

  static async runMigrations(services: string[]): Promise<void> {
    for (const service of services) {
      const migrateService = `${service}-migrate`;
      try {
        await this.up([migrateService]);
        await this.waitForHealth(migrateService, { timeoutMs: 30000 });
        await this.stop([migrateService]);
      } catch (error) {
        console.error(`Migration failed for ${service}:`, error);
        throw error;
      }
    }
  }
}
