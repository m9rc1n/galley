// Prints the test coverage per source folder as a Markdown table, for the CI job summary:
//   node scripts/coverage-summary.mjs >> "$GITHUB_STEP_SUMMARY"
// Reads coverage/coverage-summary.json, which `npm run test:coverage` writes locally and in CI.
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';

const summary = JSON.parse(readFileSync('coverage/coverage-summary.json', 'utf8'));
const metrics = ['lines', 'statements', 'functions', 'branches'];
const folders = new Map();

for (const [file, data] of Object.entries(summary)) {
  if (file === 'total') continue;
  const folder = relative(process.cwd(), file).split('/').slice(0, 2).join('/');
  const totals = folders.get(folder) ?? Object.fromEntries(metrics.map((m) => [m, { covered: 0, total: 0 }]));
  for (const m of metrics) {
    totals[m].covered += data[m].covered;
    totals[m].total += data[m].total;
  }
  folders.set(folder, totals);
}

const pct = ({ covered, total }) => (total ? `${((covered / total) * 100).toFixed(1)}%` : '–');
const rows = [...folders].sort(([a], [b]) => a.localeCompare(b)).map(([folder, t]) => `| \`${folder}\` | ${metrics.map((m) => pct(t[m])).join(' | ')} |`);
const total = summary.total;

console.log('### Test coverage\n');
console.log(`| Folder | ${metrics.join(' | ')} |`);
console.log(`| --- | ${metrics.map(() => '---:').join(' | ')} |`);
console.log(rows.join('\n'));
console.log(`| **All of src** | ${metrics.map((m) => `**${total[m].pct}%**`).join(' | ')} |`);
console.log(
  '\nReader workflows and extension entry points are included. Browser checks (`npm run test:e2e`) separately verify real layout and selection behavior.',
);
