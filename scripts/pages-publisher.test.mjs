import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, join, resolve } from 'node:path';
import { test } from 'node:test';

const prepare = resolve('scripts/prepare-pages.mjs');
const comments = resolve('scripts/pages-comments.mjs');

// Model GitHub's API/artifact transport; use real git commits and a local bare snapshot repository.
const fakeGh = String.raw`#!/usr/bin/env node
import { cpSync, readFileSync, writeFileSync } from 'node:fs';
const file = process.env.PAGES_TEST_DATA;
const data = JSON.parse(readFileSync(file, 'utf8'));
const args = process.argv.slice(2);
const path = args.find((arg) => arg.startsWith('repos/'));
let result;
let body;
if (args[0] === 'run') {
  cpSync(data.incoming, args[args.indexOf('--dir') + 1], { recursive: true });
  result = '';
} else if (path.includes('/actions/runs/')) result = data.run;
else if (path.endsWith('/pages')) result = { html_url: 'https://m9rc1n.github.io/galley/' };
else if (path.includes('/pulls?')) result = [data.pulls.filter((pull) => pull.state === 'open')];
else if (/\/pulls\/\d+$/.test(path)) result = data.pulls.find((pull) => pull.number === Number(path.split('/').at(-1)));
else if (args.includes('--method')) {
  body = JSON.parse(readFileSync(0, 'utf8'));
  if (args.includes('PATCH')) {
    const item = data.comments.find((item) => item.id === Number(path.split('/').at(-1)));
    item.body = body.body;
    result = item;
  } else {
    result = { id: 1000 + data.comments.length, number: Number(path.split('/').at(-2)), user: { login: 'github-actions[bot]' }, body: body.body };
    data.comments.push(result);
  }
} else if (path.includes('/comments?')) result = [data.comments.filter((item) => item.number === Number(path.split('/').at(-2)))];
else throw new Error('Unexpected gh request: ' + args.join(' '));
data.requests.push({ args, body });
writeFileSync(file, JSON.stringify(data));
if (result !== '') process.stdout.write(JSON.stringify(result));
`;

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'galley-publisher-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const bin = join(directory, 'bin');
  const work = join(directory, 'work');
  const remote = join(directory, 'server/m9rc1n/galley.git');
  const incoming = join(directory, 'incoming');
  await mkdir(bin);
  await mkdir(join(work, 'dist/site'), { recursive: true });
  await mkdir(remote, { recursive: true });
  await mkdir(join(incoming, 'build'), { recursive: true });
  await mkdir(join(incoming, 'samples'), { recursive: true });
  execFileSync('git', ['init', '--quiet', '--bare', remote]);
  await writeFile(join(bin, 'gh'), fakeGh, { mode: 0o755 });
  await writeFile(join(incoming, 'index.html'), '<title>Demo</title><a href="../">Home</a>');
  await writeFile(join(incoming, 'build/demo.js'), 'demo');
  await writeFile(join(work, 'dist/site/index.html'), 'main');
  const dataFile = join(directory, 'api.json');
  const eventFile = join(directory, 'event.json');
  const pull = (number) => ({ number, state: 'open', base: { ref: 'main' }, head: { repo: { full_name: 'm9rc1n/galley' }, sha: `current-${number}` } });
  const data = {
    incoming,
    comments: [{ id: 1, number: 50, user: { login: 'reviewer' }, body: '<!-- galley-mr-demo --> Human comment' }],
    requests: [],
    run: {
      id: 101,
      event: 'pull_request',
      conclusion: 'success',
      path: '.github/workflows/pages.yml',
      head_repository: { full_name: 'm9rc1n/galley' },
      head_sha: 'current-50',
      pull_requests: [{ number: 50 }],
    },
    pulls: [pull(50), pull(51)],
  };
  await writeFile(dataFile, JSON.stringify(data));
  await writeFile(eventFile, JSON.stringify({ workflow_run: { id: 101 } }));
  const env = {
    ...process.env,
    PATH: `${bin}${delimiter}${process.env.PATH}`,
    GITHUB_REPOSITORY: 'm9rc1n/galley',
    GITHUB_SERVER_URL: `file://${directory}/server`,
    GITHUB_EVENT_PATH: eventFile,
    GITHUB_STEP_SUMMARY: join(directory, 'summary'),
    PAGES_TEST_DATA: dataFile,
  };
  return {
    work,
    remote,
    env,
    run: (script = prepare) => execFileSync(process.execPath, [script], { cwd: work, env, stdio: 'pipe' }),
    read: async () => JSON.parse(await readFile(dataFile, 'utf8')),
    save: (data) => writeFile(dataFile, JSON.stringify(data)),
    event: (data) => writeFile(eventFile, JSON.stringify(data)),
  };
}

test('publisher persists previews, retains another MR, updates one bot comment, and cleans up after close', async (t) => {
  const f = await fixture(t);
  f.run();
  assert.equal(await readFile(join(f.work, 'dist/site/pr-preview/50/demo/build/demo.js'), 'utf8'), 'demo');
  assert.match(execFileSync('git', ['--git-dir', f.remote, 'show', 'pages-previews:pr-preview/50/preview.json'], { encoding: 'utf8' }), /current-50/);
  f.run(comments);
  f.run(comments);
  let data = await f.read();
  assert.equal(data.comments.length, 2);
  assert.equal(data.comments[0].body, '<!-- galley-mr-demo --> Human comment');
  assert.match(data.comments[1].body, /pr-preview\/50\/demo/);
  assert.equal(data.requests.filter((request) => request.args.includes('POST')).length, 1);
  assert.equal(data.requests.filter((request) => request.args.includes('PATCH')).length, 1);
  data.run.head_sha = 'current-51';
  data.run.pull_requests[0].number = 51;
  await f.save(data);
  f.run();
  f.run(comments);
  assert.equal(await readFile(join(f.work, 'dist/site/pr-preview/50/demo/build/demo.js'), 'utf8'), 'demo');
  assert.equal(await readFile(join(f.work, 'dist/site/pr-preview/51/demo/build/demo.js'), 'utf8'), 'demo');
  data = await f.read();
  data.pulls[0].state = 'closed';
  await f.save(data);
  await f.event({ inputs: { run_id: '' } });
  f.run();
  f.run(comments);
  await assert.rejects(readFile(join(f.work, 'dist/site/pr-preview/50/demo/index.html')), { code: 'ENOENT' });
  assert.equal(await readFile(join(f.work, 'dist/site/pr-preview/51/demo/build/demo.js'), 'utf8'), 'demo');
  assert.equal(await readFile(join(f.work, 'dist/site/index.html'), 'utf8'), 'main');
  data = await f.read();
  assert.match(data.comments.find((item) => item.number === 50 && item.user.login === 'github-actions[bot]').body, /has been removed/);
  assert.match(data.comments.find((item) => item.number === 51).body, /Demo is ready/);
  data.pulls[0].state = 'open';
  data.run.head_sha = 'current-50';
  data.run.pull_requests[0].number = 50;
  await f.save(data);
  await f.event({ workflow_run: { id: 101 } });
  f.run();
  f.run(comments);
  assert.equal(await readFile(join(f.work, 'dist/site/pr-preview/50/demo/build/demo.js'), 'utf8'), 'demo');
  data = await f.read();
  assert.equal(data.comments.length, 3);
  assert.match(data.comments.find((item) => item.number === 50 && item.user.login === 'github-actions[bot]').body, /Demo is ready/);
});

test('stale or foreign artifacts are never downloaded, and stale publication comments are skipped', async (t) => {
  const f = await fixture(t);
  let data = await f.read();
  data.run.head_sha = 'old';
  await f.save(data);
  f.run();
  assert.equal(
    (await f.read()).requests.some((request) => request.args[0] === 'run'),
    false,
  );
  data = await f.read();
  data.run.head_sha = 'current-50';
  await f.save(data);
  f.run();
  data = await f.read();
  data.pulls[0].head.sha = 'newer';
  await f.save(data);
  f.run(comments);
  assert.equal((await f.read()).comments.length, 1);
  data = await f.read();
  data.run.head_repository.full_name = 'someone/fork';
  data.requests = [];
  await f.save(data);
  f.run();
  assert.equal(
    (await f.read()).requests.some((request) => request.args[0] === 'run'),
    false,
  );
});
