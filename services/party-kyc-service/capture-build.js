const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const cwd = path.dirname(__filename);
const result = spawnSync('npx', ['tsc', '--pretty', 'false'], { cwd, encoding: 'utf8' });

const output = [
  'exitCode: ' + result.status,
  'STDOUT:',
  result.stdout || '(empty)',
  'STDERR:',
  result.stderr || '(empty)'
].join('\n');

fs.writeFileSync(path.join(cwd, 'build-error.log'), output, 'utf8');
console.log('Build captured. See build-error.log');
