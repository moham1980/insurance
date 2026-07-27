import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const e2eDir = join(process.cwd(), 'tests', 'e2e');
const files = readdirSync(e2eDir).filter(f => f.endsWith('.test.ts'));

for (const file of files) {
  const path = join(e2eDir, file);
  let content = readFileSync(path, 'utf-8');
  const original = content;
  content = content.replace(/cleanup\('[^']*'\)/g, "cleanup('public')");
  if (content !== original) {
    writeFileSync(path, content, 'utf-8');
    console.log(`Updated: ${file}`);
  }
}
console.log('Done');
