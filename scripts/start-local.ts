import { spawn } from 'child_process';
import { resolve } from 'path';

interface ServiceDef {
  name: string;
  cwd: string;
  port: number;
  color: string;
}

const COLORS: Record<string, string> = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

const SERVICES: ServiceDef[] = [
  { name: 'postgres', cwd: 'scripts', port: 5432, color: 'cyan' },
  { name: 'api-gateway', cwd: 'services/api-gateway', port: 18000, color: 'green' },
  { name: 'auth-service', cwd: 'services/auth-service', port: 18001, color: 'blue' },
  { name: 'policy-service', cwd: 'services/policy-service', port: 18007, color: 'yellow' },
  { name: 'claims-service', cwd: 'services/claims-service', port: 18002, color: 'magenta' },
  { name: 'web-ui', cwd: 'services/web-ui', port: 18042, color: 'cyan' },
];

function log(name: string, color: string, data: string) {
  const prefix = `${COLORS[color]}[${name}]${COLORS.reset}`;
  const lines = data.toString().trim().split('\n');
  for (const line of lines) {
    console.log(`${prefix} ${line}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const serviceNames = args.length > 0 ? args : SERVICES.map(s => s.name);
  const toStart = SERVICES.filter(s => serviceNames.includes(s.name));

  if (toStart.length === 0) {
    console.log('Usage: bun run scripts/start-local.ts [service1] [service2] ...');
    console.log('Available services:', SERVICES.map(s => s.name).join(', '));
    process.exit(1);
  }

  console.log(`Starting ${toStart.length} service(s): ${toStart.map(s => s.name).join(', ')}\n`);

  const processes: { name: string; proc: ReturnType<typeof spawn> }[] = [];

  for (const svc of toStart) {
    const cwd = resolve(process.cwd(), svc.cwd);
    const proc = spawn('bun', ['run', 'dev'], {
      cwd,
      env: { ...process.env, FORCE_COLOR: '1' },
      stdio: 'pipe',
    });

    proc.stdout?.on('data', (data) => log(svc.name, svc.color, data));
    proc.stderr?.on('data', (data) => log(svc.name, svc.color, data));

    proc.on('exit', (code) => {
      console.log(`${COLORS[svc.color]}[${svc.name}] exited with code ${code}${COLORS.reset}`);
    });

    processes.push({ name: svc.name, proc });
  }

  // Graceful shutdown
  const shutdown = () => {
    console.log('\nShutting down services...');
    for (const { name, proc } of processes) {
      console.log(`Killing ${name}...`);
      proc.kill('SIGTERM');
    }
    setTimeout(() => {
      for (const { proc } of processes) {
        if (!proc.killed) proc.kill('SIGKILL');
      }
      process.exit(0);
    }, 5000);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
