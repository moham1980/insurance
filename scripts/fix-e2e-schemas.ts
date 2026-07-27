import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const e2eDir = join(process.cwd(), 'tests', 'e2e');
const files = readdirSync(e2eDir).filter(f => f.endsWith('.test.ts'));

for (const file of files) {
  const path = join(e2eDir, file);
  let content = readFileSync(path, 'utf-8');
  const original = content;

  // Replace truncateTable('xxx', with truncateTable('public',
  content = content.replace(/truncateTable\('[^']*',/g, "truncateTable('public',");

  if (content !== original) {
    writeFileSync(path, content, 'utf-8');
    console.log(`Updated: ${file}`);
  } else {
    console.log(`Skipped: ${file}`);
  }
}

console.log('Done');
