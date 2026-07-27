import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';

const OLD_PATTERN = 'COPY --from=builder /app/node_modules ./node_modules';
const NEW_PATTERN = `# Install only production dependencies (much faster than copying full node_modules)
COPY --from=builder /app/package.json ./
COPY --from=builder /app/bun.lock ./
RUN NODE_TLS_REJECT_UNAUTHORIZED=0 bun install --production --network-concurrency=8`;

function optimizeDockerfile(path: string): boolean {
  const content = readFileSync(path, 'utf-8');
  if (!content.includes(OLD_PATTERN)) {
    return false;
  }
  const updated = content.replace(OLD_PATTERN, NEW_PATTERN);
  writeFileSync(path, updated, 'utf-8');
  return true;
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
    if (optimizeDockerfile(df)) {
      console.log(`✅ Optimized: ${name}`);
      updated++;
    } else {
      console.log(`⏭️  Skipped: ${name}`);
      skipped++;
    }
  }

  console.log(`\n📊 Summary: ${updated} optimized, ${skipped} skipped, ${dockerfiles.length} total`);
}

main();
