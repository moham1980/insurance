import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const e2eDir = 'tests/e2e';
const files = readdirSync(e2eDir).filter(f => f.endsWith('.test.ts'));

for (const file of files) {
  const path = join(e2eDir, file);
  let content = readFileSync(path, 'utf-8');
  let changed = false;

  // Pattern: issue call without paid
  const regex = /await apiClient\.post\(`\/policies\/policies\/\$\{[^}]+\}\/issue`, \{\s*\n\s*underwriterId: ['"][^'"]+['"],\s*\n\s*decision: ['"][^'"]+['"],?\s*\n\s*\}\);/g;

  if (regex.test(content)) {
    content = content.replace(regex, (match) => {
      return match.replace(/\}\);$/, '      paid: true,\n    });');
    });
    changed = true;
  }

  if (changed) {
    writeFileSync(path, content, 'utf-8');
    console.log(`Fixed paid in ${file}`);
  } else {
    console.log(`No issue changes needed in ${file}`);
  }
}
