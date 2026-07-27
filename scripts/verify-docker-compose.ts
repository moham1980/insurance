import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

interface ServiceCheck {
  name: string;
  dockerfile: string;
  port: number;
  hasHealthEndpoint: boolean;
}

const EXPECTED_SERVICES: ServiceCheck[] = [
  { name: 'api-gateway', dockerfile: 'services/api-gateway/Dockerfile', port: 18000, hasHealthEndpoint: true },
  { name: 'auth-service', dockerfile: 'services/auth-service/Dockerfile', port: 18001, hasHealthEndpoint: true },
  { name: 'claims-service', dockerfile: 'services/claims-service/Dockerfile', port: 18002, hasHealthEndpoint: true },
  { name: 'payments-service', dockerfile: 'services/payments-service/Dockerfile', port: 18004, hasHealthEndpoint: true },
  { name: 'party-kyc-service', dockerfile: 'services/party-kyc-service/Dockerfile', port: 18006, hasHealthEndpoint: true },
  { name: 'policy-service', dockerfile: 'services/policy-service/Dockerfile', port: 18007, hasHealthEndpoint: true },
  { name: 'document-service', dockerfile: 'services/document-service/Dockerfile', port: 18008, hasHealthEndpoint: true },
  { name: 'fraud-service', dockerfile: 'services/fraud-service/Dockerfile', port: 18009, hasHealthEndpoint: true },
  { name: 'orchestrator-service', dockerfile: 'services/orchestrator-service/Dockerfile', port: 18010, hasHealthEndpoint: true },
  { name: 'feature-flags-service', dockerfile: 'services/feature-flags-service/Dockerfile', port: 18011, hasHealthEndpoint: true },
  { name: 'complaints-service', dockerfile: 'services/complaints-service/Dockerfile', port: 18013, hasHealthEndpoint: true },
  { name: 'reporting-service', dockerfile: 'services/reporting-service/Dockerfile', port: 18014, hasHealthEndpoint: true },
  { name: 'aml-service', dockerfile: 'services/aml-service/Dockerfile', port: 18016, hasHealthEndpoint: true },
  { name: 'reinsurance-service', dockerfile: 'services/reinsurance-service/Dockerfile', port: 18017, hasHealthEndpoint: true },
  { name: 'product-service', dockerfile: 'services/product-service/Dockerfile', port: 18018, hasHealthEndpoint: true },
  { name: 'claims-readmodel-service', dockerfile: 'services/claims-readmodel-service/Dockerfile', port: 18012, hasHealthEndpoint: true },
  { name: 'monitoring-service', dockerfile: 'services/monitoring-service/Dockerfile', port: 18020, hasHealthEndpoint: true },
  { name: 'document-ai-service', dockerfile: 'services/document-ai-service/Dockerfile', port: 18021, hasHealthEndpoint: true },
  { name: 'sales-network-service', dockerfile: 'services/sales-network-service/Dockerfile', port: 18022, hasHealthEndpoint: true },
  { name: 'underwriting-service', dockerfile: 'services/underwriting-service/Dockerfile', port: 18032, hasHealthEndpoint: true },
  { name: 'regulatory-gateway-service', dockerfile: 'services/regulatory-gateway-service/Dockerfile', port: 18024, hasHealthEndpoint: true },
  { name: 'notification-service', dockerfile: 'services/notification-service/Dockerfile', port: 18037, hasHealthEndpoint: true },
  { name: 'ai-governance-service', dockerfile: 'services/ai-governance-service/Dockerfile', port: 18036, hasHealthEndpoint: true },
  { name: 'customer-portal-service', dockerfile: 'services/customer-portal-service/Dockerfile', port: 18027, hasHealthEndpoint: true },
  { name: 'agent-portal-service', dockerfile: 'services/agent-portal-service/Dockerfile', port: 18031, hasHealthEndpoint: true },
  { name: 'workflow-service', dockerfile: 'services/workflow-service/Dockerfile', port: 18028, hasHealthEndpoint: true },
  { name: 'rule-engine-service', dockerfile: 'services/rule-engine-service/Dockerfile', port: 18038, hasHealthEndpoint: true },
  { name: 'knowledge-service', dockerfile: 'services/knowledge-service/Dockerfile', port: 18033, hasHealthEndpoint: true },
  { name: 'model-switchboard-service', dockerfile: 'services/model-switchboard-service/Dockerfile', port: 18035, hasHealthEndpoint: true },
  { name: 'billing-service', dockerfile: 'services/billing-service/Dockerfile', port: 18039, hasHealthEndpoint: true },
  { name: 'collections-service', dockerfile: 'services/collections-service/Dockerfile', port: 18025, hasHealthEndpoint: true },
  { name: 'copilot-service', dockerfile: 'services/copilot-service/Dockerfile', port: 18030, hasHealthEndpoint: true },
  { name: 'customer-360-service', dockerfile: 'services/customer-360-service/Dockerfile', port: 18026, hasHealthEndpoint: true },
  { name: 'outbox-relay', dockerfile: 'services/outbox-relay/Dockerfile', port: 18041, hasHealthEndpoint: false },
  { name: 'web-ui', dockerfile: 'services/web-ui/Dockerfile', port: 18042, hasHealthEndpoint: false },
  { name: 'customer-portal-ui', dockerfile: 'services/customer-portal-ui/Dockerfile', port: 18043, hasHealthEndpoint: false },
  { name: 'agent-portal-ui', dockerfile: 'services/agent-portal-ui/Dockerfile', port: 18044, hasHealthEndpoint: false },
];

function extractServicesFromCompose(content: string): string[] {
  const services: string[] = [];
  const lines = content.split('\n');
  let inServices = false;
  
  for (const line of lines) {
    if (line.trim() === 'services:') {
      inServices = true;
      continue;
    }
    if (inServices && line.match(/^\S/)) {
      break;
    }
    if (inServices) {
      // Match service names at any indent level under services:
      // Typically docker-compose uses 2 spaces for first level under services
      const match = line.match(/^(\s+)([a-zA-Z0-9_-]+):\s*$/);
      if (match) {
        const indent = match[1].length;
        // First level under services is typically 2 spaces
        if (indent === 2) {
          services.push(match[2]);
        }
      }
    }
  }
  
  return services;
}

function main() {
  const composePath = resolve(process.cwd(), 'docker-compose.yml');
  
  if (!existsSync(composePath)) {
    console.error('❌ docker-compose.yml not found');
    process.exit(1);
  }
  
  const composeContent = readFileSync(composePath, 'utf-8');
  const servicesInCompose = extractServicesFromCompose(composeContent);
  
  console.log(`📋 Found ${servicesInCompose.length} services in docker-compose.yml\n`);
  
  let issues = 0;
  const ports = new Map<number, string>();
  
  for (const expected of EXPECTED_SERVICES) {
    const exists = servicesInCompose.includes(expected.name);
    const dockerfilePath = resolve(expected.dockerfile);
    const dockerfileExists = existsSync(dockerfilePath);
    const healthPath = resolve(`services/${expected.name}/src/health.controller.ts`);
    const healthExists = existsSync(healthPath);
    
    if (!exists) {
      console.log(`❌ ${expected.name} — NOT in docker-compose.yml`);
      issues++;
    } else if (!dockerfileExists) {
      console.log(`❌ ${expected.name} — Dockerfile missing: ${expected.dockerfile}`);
      issues++;
    } else if (expected.hasHealthEndpoint && !healthExists) {
      console.log(`⚠️  ${expected.name} — health.controller.ts missing`);
      issues++;
    } else {
      console.log(`✅ ${expected.name}`);
    }
    
    if (ports.has(expected.port)) {
      console.log(`   ❌ Port conflict: ${expected.port} used by ${ports.get(expected.port)} and ${expected.name}`);
      issues++;
    } else {
      ports.set(expected.port, expected.name);
    }
  }
  
  const extraServices = servicesInCompose.filter(s => !EXPECTED_SERVICES.some(e => e.name === s));
  if (extraServices.length > 0) {
    console.log(`\n⚠️  Extra services in compose (not in checklist): ${extraServices.join(', ')}`);
  }
  
  console.log(`\n📊 Summary: ${EXPECTED_SERVICES.length - issues}/${EXPECTED_SERVICES.length} services verified`);
  
  if (issues > 0) {
    process.exit(1);
  }
}

main();
