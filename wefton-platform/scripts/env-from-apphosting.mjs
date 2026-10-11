// Prints the `env:` entries of apphosting.yaml as KEY=value lines, so CI can
// build with the same public config App Hosting uses:
//   node scripts/env-from-apphosting.mjs > .env.local
// Only handles the simple `- variable: X` / `value: Y` shape used there.
import { readFileSync } from 'node:fs';

const yaml = readFileSync(new URL('../apphosting.yaml', import.meta.url), 'utf8');
const unquote = (v) => v.trim().replace(/^(["'])(.*)\1$/, '$2');
const lines = [];
for (const m of yaml.matchAll(/-\s*variable:\s*(\S+)\s*\n\s*value:\s*(.+)/g)) {
  lines.push(`${m[1]}=${unquote(m[2])}`);
}
if (lines.length === 0) {
  console.error('No env entries found in apphosting.yaml');
  process.exit(1);
}
console.log(lines.join('\n'));
