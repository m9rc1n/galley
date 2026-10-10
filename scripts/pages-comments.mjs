// Only run after Pages deployment succeeds. Keep one bot-owned preview comment per MR.
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

const repository = process.env.GITHUB_REPOSITORY;
if (!/^[\w.-]+\/[\w.-]+$/.test(repository ?? '')) throw new Error('Expected GITHUB_REPOSITORY');
const report = JSON.parse(await readFile('dist/pages-publication.json', 'utf8'));
const marker = '<!-- galley-mr-demo -->';
const gh = (args, body) => execFileSync('gh', args, { encoding: 'utf8', ...(body ? { input: JSON.stringify(body) } : {}) });
const api = (path) => JSON.parse(gh(['api', `repos/${repository}/${path}`]));
async function comment(number, body) {
  const comments = JSON.parse(gh(['api', '--paginate', '--slurp', `repos/${repository}/issues/${number}/comments?per_page=100`])).flat();
  const previous = comments.find((item) => item.user.login === 'github-actions[bot]' && item.body.includes(marker));
  gh(
    [
      'api',
      '--method',
      previous ? 'PATCH' : 'POST',
      `repos/${repository}/${previous ? `issues/comments/${previous.id}` : `issues/${number}/comments`}`,
      '--input',
      '-',
    ],
    { body: `${marker}\n${body}` },
  );
}
if (report.preview) {
  const { number, sha } = report.preview;
  const pull = api(`pulls/${number}`);
  if (pull.state === 'open' && pull.head.sha === sha) {
    await comment(
      number,
      `Demo is ready: [Open MR #${number} demo](${report.pages}/pr-preview/${number}/demo/).\n\nBuilt revision: \`${sha}\`. The demo updates after successful Website builds and is removed when this MR closes.`,
    );
  }
}
for (const number of report.removed) {
  if (api(`pulls/${number}`).state === 'closed') await comment(number, 'This MR is closed; its temporary demo has been removed.');
}
