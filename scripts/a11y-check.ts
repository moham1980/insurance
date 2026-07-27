// @ts-nocheck
/**
 * Accessibility check script using axe-core
 * Usage: bun run a11y:check
 */

import axe from 'axe-core';
import { JSDOM } from 'jsdom';

const sampleHtml = `
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head><title>Sample Page</title></head>
<body>
  <main>
    <h1>عنوان صفحه</h1>
    <button>کلیک</button>
    <img src="test.jpg" alt="توضیح تصویر">
  </main>
</body>
</html>
`;

async function runA11yCheck() {
  const dom = new JSDOM(sampleHtml);
  const document = dom.window.document;

  const results = await axe.run(document, {
    rules: {
      'color-contrast': { enabled: true },
      'document-title': { enabled: true },
      'html-has-lang': { enabled: true },
      'image-alt': { enabled: true },
      'button-name': { enabled: true },
      'region': { enabled: true },
      'heading-order': { enabled: true },
    },
  });

  console.log('\n=== Accessibility Audit Results ===\n');
  console.log(`Violations: ${results.violations.length}`);
  console.log(`Passes: ${results.passes.length}`);
  console.log(`Incomplete: ${results.incomplete.length}`);

  if (results.violations.length > 0) {
    console.log('\n--- Violations ---');
    results.violations.forEach((v, i) => {
      console.log(`\n${i + 1}. ${v.id}: ${v.description}`);
      console.log(`   Impact: ${v.impact}`);
      console.log(`   Help: ${v.helpUrl}`);
      v.nodes.forEach((node: any) => {
        console.log(`   Node: ${node.target}`);
      });
    });
    process.exit(1);
  } else {
    console.log('\n✅ No accessibility violations found!');
    process.exit(0);
  }
}

runA11yCheck().catch((err) => {
  console.error('A11y check failed:', err);
  process.exit(1);
});
