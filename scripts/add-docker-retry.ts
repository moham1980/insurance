import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';

const PATTERNS = [
  {
    old: 'RUN NODE_TLS_REJECT_UNAUTHORIZED=0 bun install --network-concurrency=8',
    new: 'RUN for i in 1 2 3; do NODE_TLS_REJECT_UNAUTHORIZED=0 bun install --network-concurrency=8 && break || sleep 10; done',
  },
  {
    old: 'RUN NODE_TLS_REJECT_UNAUTHORIZED=0 bun install --production --network-concurrency=8',
    new: 'RUN for i in 1 2 3; do NODE_TLS_REJECT_UNAUTHORIZED=0 bun install --production --network-concurrency=8 && break || sleep 10; done',
  },
];

function fixDockerfile(path: string): boolean {
  let content = readFileSync(path, 'utf-8');
  let changed = false;
  for (const p of PATTERNS) {
    if (content.includes(p.old)) {
      content = content.split(p.old).join(p.new);
      changed = true;
    }
  }
  if (changed) {
    writeFileSync(path, content, 'utf-8');
  }
  return changed;
}

function findDockerfiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...findDockerfiles(fullPath));
    } else if (entry === 'Dockerfile') {
      results.push(fullPath);
    }
  }
  return results;
}

function main() {
  const servicesDir = resolve(process.cwd(), 'services');
  const dockerfiles = findDockerfiles(servicesDir);

  let updated = 0;
  let skipped = 0;

  for (const df of dockerfiles) {
    const name = df.replace(servicesDir + '\\', '').replace('\\Dockerfile', '');
    if (fixDockerfile(df)) {
      console.log(`Fixed: ${name}`);
      updated++;
    } else {
      console.log(`Skipped: ${name}`);
      skipped++;
    }
  }

  console.log(`\nDone: ${updated} updated, ${skipped} skipped`);
}

main();
