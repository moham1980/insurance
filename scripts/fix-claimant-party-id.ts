import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const e2eDir = 'tests/e2e';
const files = readdirSync(e2eDir).filter(f => f.endsWith('.test.ts'));

for (const file of files) {
  const path = join(e2eDir, file);
  let content = readFileSync(path, 'utf-8');
  let changed = false;

  // Pattern: ...claimFixtures.basic,\n      policyId,\n      tenantId,
  // Replace with: ...claimFixtures.basic,\n      policyId,\n      claimantPartyId: partyId,\n      tenantId,
  const regex = /(\.\.\.claimFixtures\.basic,\s+\n\s+policyId,\s*\n)(\s+tenantId,)/g;
  if (regex.test(content)) {
    content = content.replace(regex, "$1      claimantPartyId: partyId,\n$2");
    changed = true;
  }

  // Also handle pattern without newline before tenantId
  const regex2 = /(\.\.\.claimFixtures\.basic,\s+policyId,)(\s+tenantId,)/g;
  if (regex2.test(content)) {
    content = content.replace(regex2, "$1\n      claimantPartyId: partyId,$2");
    changed = true;
  }

  if (changed) {
    writeFileSync(path, content, 'utf-8');
    console.log(`Fixed claimantPartyId in ${file}`);
  } else {
    console.log(`No claim changes needed in ${file}`);
  }
}
