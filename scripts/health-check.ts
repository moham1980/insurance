import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { resolve } from 'path';

interface HealthResult {
  service: string;
  port: number;
  status: 'ok' | 'fail' | 'timeout';
  response?: any;
  error?: string;
  durationMs: number;
}

const SERVICES: { name: string; port: number }[] = [
  { name: 'api-gateway', port: 18000 },
  { name: 'auth-service', port: 18001 },
  { name: 'claims-service', port: 18002 },
  { name: 'payments-service', port: 18004 },
  { name: 'party-kyc-service', port: 18006 },
  { name: 'policy-service', port: 18007 },
  { name: 'document-service', port: 18008 },
  { name: 'fraud-service', port: 18009 },
  { name: 'orchestrator-service', port: 18010 },
  { name: 'feature-flags-service', port: 18011 },
  { name: 'complaints-service', port: 18013 },
  { name: 'reporting-service', port: 18014 },
  { name: 'aml-service', port: 18016 },
  { name: 'reinsurance-service', port: 18017 },
  { name: 'product-service', port: 18018 },
  { name: 'claims-readmodel-service', port: 18012 },
  { name: 'monitoring-service', port: 18020 },
  { name: 'document-ai-service', port: 18021 },
  { name: 'sales-network-service', port: 18022 },
  { name: 'underwriting-service', port: 18032 },
  { name: 'regulatory-gateway-service', port: 18024 },
  { name: 'notification-service', port: 18037 },
  { name: 'ai-governance-service', port: 18036 },
  { name: 'customer-portal-service', port: 18027 },
  { name: 'agent-portal-service', port: 18031 },
  { name: 'workflow-service', port: 18028 },
  { name: 'rule-engine-service', port: 18038 },
  { name: 'knowledge-service', port: 18033 },
  { name: 'model-switchboard-service', port: 18035 },
  { name: 'billing-service', port: 18039 },
  { name: 'collections-service', port: 18025 },
  { name: 'copilot-service', port: 18030 },
  { name: 'customer-360-service', port: 18026 },
  { name: 'outbox-relay', port: 18041 },
];

async function checkHealth(service: string, port: number): Promise<HealthResult> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`http://localhost:${port}/health`, { signal: controller.signal });
    clearTimeout(timeout);
    const body = await res.json().catch(() => undefined);
    return {
      service,
      port,
      status: res.ok ? 'ok' : 'fail',
      response: body,
      durationMs: Date.now() - start,
    };
  } catch (err: any) {
    return {
      service,
      port,
      status: err.name === 'AbortError' ? 'timeout' : 'fail',
      error: err.message,
      durationMs: Date.now() - start,
    };
  }
}

async function main() {
  console.log('🔍 Running health checks...\n');
  const results: HealthResult[] = [];

  for (const svc of SERVICES) {
    const result = await checkHealth(svc.name, svc.port);
    results.push(result);
    const icon = result.status === 'ok' ? '✅' : result.status === 'timeout' ? '⏱️' : '❌';
    console.log(`${icon} ${svc.name.padEnd(30)} port ${svc.port} — ${result.status} (${result.durationMs}ms)`);
    if (result.error) console.log(`   └─ ${result.error}`);
  }

  const ok = results.filter(r => r.status === 'ok').length;
  const fail = results.length - ok;

  console.log(`\n📊 Summary: ${ok}/${results.length} healthy`);
  if (fail > 0) {
    console.log(`   Failed services:`);
    results.filter(r => r.status !== 'ok').forEach(r => console.log(`     - ${r.service} (port ${r.port})`));
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
