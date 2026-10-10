// Executed only by the trusted, default-branch publisher. PR artifacts are copied as static data.
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { composePreviews, installPreview, previewFor } from './pages-previews.mjs';

const repository = process.env.GITHUB_REPOSITORY;
if (!/^[\w.-]+\/[\w.-]+$/.test(repository ?? '')) throw new Error('Expected GITHUB_REPOSITORY');
const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, 'utf8'));
const gh = (...args) => execFileSync('gh', args, { encoding: 'utf8' });
const api = (path) => JSON.parse(gh('api', `repos/${repository}/${path}`));
const runId = event.workflow_run?.id ?? event.inputs?.run_id;
let preview = null;
if (runId) {
  if (!/^\d+$/.test(String(runId))) throw new Error('Invalid workflow run ID');
  const run = api(`actions/runs/${runId}`);
  const number = run.pull_requests[0]?.number;
  if (number) preview = previewFor(run, api(`pulls/${number}`), repository);
}
const open = JSON.parse(gh('api', '--paginate', '--slurp', `repos/${repository}/pulls?state=open&base=main&per_page=100`)).flat();
const openNumbers = new Set(open.filter((pull) => pull.head.repo?.full_name === repository).map((pull) => pull.number));
// A close during the metadata reads wins over a just-completed build.
if (preview && !openNumbers.has(preview.number)) preview = null;

const temporary = await mkdtemp(join(tmpdir(), 'galley-pages-'));
const state = join(temporary, 'state');
await mkdir(state);
const git = (...args) => execFileSync('git', ['-C', state, ...args], { encoding: 'utf8' });
try {
  git('init', '--quiet');
  git('config', 'core.hooksPath', '/dev/null');
  git('config', 'user.name', 'github-actions[bot]');
  git('config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com');
  git('remote', 'add', 'origin', `${process.env.GITHUB_SERVER_URL}/${repository}.git`);
  if (git('ls-remote', '--heads', 'origin', 'refs/heads/pages-previews').trim()) {
    git('fetch', '--quiet', '--depth=1', 'origin', 'pages-previews');
    git('checkout', '--quiet', '-B', 'pages-previews', 'FETCH_HEAD');
  } else {
    git('checkout', '--quiet', '--orphan', 'pages-previews');
    await writeFile(join(state, 'README.md'), 'Generated MR demo snapshots. Managed by the default-branch Pages publisher.\n');
  }
  if (preview) {
    const incoming = join(temporary, 'incoming');
    gh('run', 'download', String(runId), '--repo', repository, '--name', 'website-demo', '--dir', incoming);
    await installPreview(state, incoming, preview);
  }
  const removed = await composePreviews(state, 'dist/site', openNumbers);
  git('add', '--all');
  if (git('status', '--porcelain').trim()) {
    git('commit', '--quiet', '-m', 'chore: update active MR demo snapshots');
    git('push', '--quiet', 'origin', 'HEAD:refs/heads/pages-previews');
  }
  const pages = api('pages').html_url.replace(/\/$/, '');
  await writeFile('dist/pages-publication.json', JSON.stringify({ pages, preview, removed: removed.filter((number) => /^\d+$/.test(number)) }));
  const summary = [`Production website: ${pages}/`, ...removed.map((number) => `Removed closed MR preview: #${number}`)];
  if (preview) summary.push(`MR #${preview.number} demo: ${pages}/pr-preview/${preview.number}/demo/`, `Built revision: ${preview.sha}`);
  await writeFile(process.env.GITHUB_STEP_SUMMARY, `${summary.join('\n\n')}\n`);
} finally {
  await rm(temporary, { recursive: true, force: true });
}
