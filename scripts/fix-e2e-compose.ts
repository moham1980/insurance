import { readFileSync, writeFileSync } from 'fs';

const path = 'docker-compose.e2e.yml';
let content = readFileSync(path, 'utf-8');

// Add depends_on to each service that has DB_HOST
const serviceBlocks = content.split(/^(\s{2}[a-z-]+):\s*\n(?=\s{4}image:)/gm);

let updated = '';
for (let i = 0; i < serviceBlocks.length; i++) {
  let block = serviceBlocks[i];
  if (block.includes('DB_HOST: insurance-postgres') && !block.includes('depends_on:')) {
    // Insert depends_on after the last environment variable or before any existing depends_on
    block = block.replace(
      /(      JWT_SECRET: test-secret\n)/,
      "$1    depends_on:\n      insurance-postgres:\n        condition: service_healthy\n"
    );
  }
  updated += block;
}

writeFileSync(path, updated, 'utf-8');
console.log('Updated docker-compose.e2e.yml with depends_on');
