import { spawn } from 'child_process';

const SERVICES = [
  'api-gateway',
  'auth-service',
  'claims-service',
  'payments-service',
  'policy-service',
  'web-ui',
];

async function buildService(service: string): Promise<boolean> {
  return new Promise((resolve) => {
    console.log(`\n🔨 Building ${service}...`);
    const proc = spawn('docker', [
      'build',
      '--network=host',
      '-f',
      `services/${service}/Dockerfile`,
      '-t',
      `${service}:latest`,
      '.',
    ], {
      stdio: 'inherit',
    });

    proc.on('exit', (code) => {
      resolve(code === 0);
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const toBuild = args.length > 0 ? args : SERVICES;

  console.log(`Building ${toBuild.length} service(s): ${toBuild.join(', ')}`);

  const results: { service: string; ok: boolean }[] = [];
  for (const service of toBuild) {
    const ok = await buildService(service);
    results.push({ service, ok });
  }

  console.log('\n📊 Build Summary:');
  for (const { service, ok } of results) {
    console.log(ok ? `✅ ${service}` : `❌ ${service}`);
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
