import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { composePreviews, installPreview, previewFor, validateStaticTree } from './pages-previews.mjs';

const repository = 'm9rc1n/galley';
const run = {
  id: 101,
  event: 'pull_request',
  conclusion: 'success',
  path: '.github/workflows/pages.yml',
  head_repository: { full_name: repository },
  head_sha: 'current',
};
const pull = { number: 50, state: 'open', base: { ref: 'main' }, head: { repo: { full_name: repository }, sha: 'current' } };
const preview = { number: 50, sha: 'current', run: 101 };
async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'galley-previews-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const incoming = join(directory, 'incoming');
  const state = join(directory, 'state');
  const site = join(directory, 'site');
  await mkdir(join(incoming, 'build'), { recursive: true });
  await mkdir(join(incoming, 'samples/head'), { recursive: true });
  await mkdir(state);
  await mkdir(site);
  await writeFile(
    join(incoming, 'index.html'),
    '<title>Galley demo</title><a href="../">Home</a><link rel="icon" href="../assets/icon.png"><script src="build/demo.js"></script>',
  );
  await writeFile(join(incoming, 'build/demo.js'), 'console.log("demo");');
  await writeFile(join(incoming, 'samples/head/README.md'), '# Sample');
  await writeFile(join(site, 'index.html'), 'Production website');
  return { directory, incoming, state, site };
}

test('only accepts a successful, current, same-repository Website MR build', () => {
  assert.deepEqual(previewFor(run, pull, repository), preview);
  for (const patch of [{ event: 'push' }, { conclusion: 'failure' }, { path: '.github/workflows/other.yml' }, { head_repository: null }, { head_sha: 'old' }]) {
    assert.equal(previewFor({ ...run, ...patch }, pull, repository), null);
  }
  for (const patch of [{ state: 'closed' }, { base: { ref: 'other' } }, { head: { ...pull.head, repo: null } }]) {
    assert.equal(previewFor(run, { ...pull, ...patch }, repository), null);
  }
  assert.throws(() => previewFor(run, { ...pull, number: -1 }, repository), /Invalid MR/);
});

test('updates one MR while preserving production and another open preview; closes remove only their own demo', async (t) => {
  const { incoming, state, site } = await fixture(t);
  await installPreview(state, incoming, preview);
  await installPreview(state, incoming, { ...preview, number: 51 });
  await writeFile(join(incoming, 'samples/head/README.md'), '# Updated sample');
  await installPreview(state, incoming, { ...preview, sha: 'updated' });
  await mkdir(join(state, 'pr-preview/unexpected'));
  assert.deepEqual(await composePreviews(state, site, new Set([50, 51])), ['unexpected']);
  assert.equal(await readFile(join(site, 'index.html'), 'utf8'), 'Production website');
  assert.equal(await readFile(join(site, 'pr-preview/50/demo/samples/head/README.md'), 'utf8'), '# Updated sample');
  assert.equal(await readFile(join(site, 'pr-preview/51/demo/samples/head/README.md'), 'utf8'), '# Sample');
  assert.match(await readFile(join(site, 'pr-preview/50/demo/index.html'), 'utf8'), /MR #50 demo/);
  assert.match(await readFile(join(site, 'pr-preview/50/demo/index.html'), 'utf8'), /href="\.\.\/\.\.\/\.\.\/assets\/icon.png"/);
  assert.match(await readFile(join(site, 'pr-preview/50/demo/index.html'), 'utf8'), /href="\.\.\/\.\.\/\.\.\/"/);
  assert.deepEqual(JSON.parse(await readFile(join(site, 'pr-preview/50/preview.json'), 'utf8')), { ...preview, sha: 'updated' });
  // A fresh production artifact still receives all open previews from the snapshot branch.
  await rm(join(site, 'pr-preview'), { recursive: true });
  assert.deepEqual(await composePreviews(state, site, new Set([51])), ['50']);
  await assert.rejects(readFile(join(site, 'pr-preview/50/demo/index.html')), { code: 'ENOENT' });
  assert.equal(await readFile(join(site, 'pr-preview/51/demo/samples/head/README.md'), 'utf8'), '# Sample');
  assert.equal(await readFile(join(site, 'index.html'), 'utf8'), 'Production website');
});

test('a missing bundle preserves the last good preview', async (t) => {
  const { incoming, state } = await fixture(t);
  await installPreview(state, incoming, preview);
  await rm(join(incoming, 'build/demo.js'));
  await assert.rejects(installPreview(state, incoming, preview), { code: 'ENOENT' });
  assert.equal(await readFile(join(state, 'pr-preview/50/demo/build/demo.js'), 'utf8'), 'console.log("demo");');
});

test('rejects links and repository metadata before replacing a preview', async (t) => {
  const { incoming, state, directory } = await fixture(t);
  await installPreview(state, incoming, preview);
  await symlink(join(directory, 'state'), join(incoming, 'escape'));
  await assert.rejects(installPreview(state, incoming, preview), /links or special/);
  await rm(join(incoming, 'escape'));
  await mkdir(join(incoming, '.git'));
  await assert.rejects(installPreview(state, incoming, preview), /Invalid static path/);
  await rm(join(incoming, '.git'), { recursive: true });
  await symlink(incoming, join(directory, 'linked-root'));
  await assert.rejects(validateStaticTree(join(directory, 'linked-root')), /not a link/);
  assert.equal(await readFile(join(state, 'pr-preview/50/demo/samples/head/README.md'), 'utf8'), '# Sample');
});

test('an empty snapshot composes without removing production files', async (t) => {
  const { state, site } = await fixture(t);
  assert.deepEqual(await composePreviews(state, site, new Set()), []);
  assert.equal(await readFile(join(site, 'index.html'), 'utf8'), 'Production website');
});
