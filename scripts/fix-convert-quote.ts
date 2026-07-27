import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const e2eDir = 'tests/e2e';
const files = readdirSync(e2eDir).filter(f => f.endsWith('.test.ts'));

for (const file of files) {
  const path = join(e2eDir, file);
  let content = readFileSync(path, 'utf-8');
  let changed = false;

  // Pattern 1: convert-quote with quoteId variable (uses partyId from outer scope)
  // Look for: { quoteId, tenantId } -> { quote: { ...quoteFixtures.basic, partyId, tenantId }, tenantId }
  const regex1 = /await apiClient\.post\('\/policies\/policies\/convert-quote', \{\s*quoteId,?\s*tenantId,?\s*\}\);/g;
  if (regex1.test(content)) {
    content = content.replace(regex1, "await apiClient.post('/policies/policies/convert-quote', {\n      quote: { ...quoteFixtures.basic, partyId, tenantId },\n      tenantId,\n    });");
    changed = true;
  }

  // Pattern 2: convert-quote with quoteId: newQuoteId and newPartyId
  const regex2 = /await apiClient\.post\('\/policies\/policies\/convert-quote', \{\s*quoteId: newQuoteId,?\s*tenantId,?\s*\}\);/g;
  if (regex2.test(content)) {
    content = content.replace(regex2, "await apiClient.post('/policies/policies/convert-quote', {\n      quote: { ...quoteFixtures.basic, partyId: newPartyId, tenantId },\n      tenantId,\n    });");
    changed = true;
  }

  // Pattern 3: convert-quote with quoteId: someOtherVar
  const regex3 = /await apiClient\.post\('\/policies\/policies\/convert-quote', \{\s*quoteId: (\w+),?\s*tenantId,?\s*\}\);/g;
  if (regex3.test(content)) {
    content = content.replace(regex3, (match, varName) => {
      return `await apiClient.post('/policies/policies/convert-quote', {\n      quote: { ...quoteFixtures.basic, partyId, tenantId },\n      tenantId,\n    });`;
    });
    changed = true;
  }

  if (changed) {
    writeFileSync(path, content, 'utf-8');
    console.log(`Fixed convert-quote in ${file}`);
  } else {
    console.log(`No changes needed in ${file}`);
  }
}
