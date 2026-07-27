import { spawn } from 'child_process';

interface ServiceDef {
  name: string;
  filter: string;
}

const SERVICES: ServiceDef[] = [
  { name: 'packages/shared', filter: '@insurance/shared' },
  { name: 'api-gateway', filter: 'api-gateway' },
  { name: 'auth-service', filter: 'auth-service' },
  { name: 'claims-service', filter: 'claims-service' },
  { name: 'claims-readmodel-service', filter: 'claims-readmodel-service' },
  { name: 'payments-service', filter: 'payments-service' },
  { name: 'orchestrator-service', filter: 'orchestrator-service' },
  { name: 'party-kyc-service', filter: 'party-kyc-service' },
  { name: 'policy-service', filter: 'policy-service' },
  { name: 'document-service', filter: 'document-service' },
  { name: 'fraud-service', filter: 'fraud-service' },
  { name: 'feature-flags-service', filter: 'feature-flags-service' },
  { name: 'complaints-service', filter: 'complaints-service' },
  { name: 'regulatory-gateway-service', filter: 'regulatory-gateway-service' },
  { name: 'aml-service', filter: 'aml-service' },
  { name: 'reinsurance-service', filter: 'reinsurance-service' },
  { name: 'product-service', filter: 'product-service' },
  { name: 'reporting-service', filter: 'reporting-service' },
  { name: 'sales-network-service', filter: 'sales-network-service' },
  { name: 'underwriting-service', filter: 'underwriting-service' },
  { name: 'notification-service', filter: 'notification-service' },
  { name: 'customer-portal-service', filter: 'customer-portal-service' },
  { name: 'agent-portal-service', filter: 'agent-portal-service' },
  { name: 'workflow-service', filter: 'workflow-service' },
  { name: 'rule-engine-service', filter: 'rule-engine-service' },
  { name: 'knowledge-service', filter: 'knowledge-service' },
  { name: 'model-switchboard-service', filter: 'model-switchboard-service' },
  { name: 'billing-service', filter: 'billing-service' },
  { name: 'collections-service', filter: 'collections-service' },
  { name: 'copilot-service', filter: 'copilot-service' },
  { name: 'customer-360-service', filter: 'customer-360-service' },
  { name: 'outbox-relay', filter: 'outbox-relay' },
  { name: 'ai-governance-service', filter: 'ai-governance-service' },
  { name: 'web-ui', filter: 'web-ui' },
  { name: 'customer-portal-ui', filter: 'customer-portal-ui' },
  { name: 'agent-portal-ui', filter: 'agent-portal-ui' },
];

async function buildService(filter: string): Promise<boolean> {
  return new Promise((resolve) => {
    console.log(`\n🔨 Building ${filter}...`);
    const proc = spawn('bun', ['run', '--filter', filter, 'build'], {
      stdio: 'inherit',
    });

    proc.on('exit', (code) => {
      resolve(code === 0);
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const toBuild = args.length > 0
    ? SERVICES.filter(s => args.includes(s.name))
    : SERVICES;

  console.log(`Building ${toBuild.length} service(s) sequentially`);

  const results: { name: string; ok: boolean }[] = [];
  for (const svc of toBuild) {
    const ok = await buildService(svc.filter);
    results.push({ name: svc.name, ok });
    if (!ok) {
      console.log(`\n❌ Build failed for ${svc.name}. Stopping.`);
      break;
    }
  }

  console.log('\n📊 Build Summary:');
  for (const { name, ok } of results) {
    console.log(ok ? `✅ ${name}` : `❌ ${name}`);
  }

  const failed = results.filter(r => !r.ok);
  if (failed.length > 0) {
    console.log(`\n${failed.length} build(s) failed.`);
    process.exit(1);
  }

  console.log('\n🎉 All builds successful!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
