import { cp, lstat, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/** PR identity comes from GitHub's run metadata and API, never from an artifact's contents. */
export function previewFor(run, pull, repository) {
  if (run.event !== 'pull_request' || run.conclusion !== 'success' || run.path !== '.github/workflows/pages.yml') return null;
  if (run.head_repository?.full_name !== repository || pull.head.repo?.full_name !== repository) return null;
  if (pull.state !== 'open' || pull.base.ref !== 'main' || run.head_sha !== pull.head.sha) return null;
  if (!Number.isSafeInteger(pull.number) || pull.number < 1) throw new Error('Invalid MR number');
  return { number: pull.number, sha: pull.head.sha, run: run.id };
}

/** Pages artifacts must be ordinary static files; never copy links or repository metadata. */
export async function validateStaticTree(directory) {
  if (!(await lstat(directory)).isDirectory()) throw new Error('Expected a static directory, not a link');
  for (const name of await readdir(directory)) {
    if (
      ['.git', '.gitignore', '.gitattributes', '.gitmodules'].includes(name) ||
      [...name].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)
    ) {
      throw new Error(`Invalid static path: ${name}`);
    }
    const path = join(directory, name);
    const info = await lstat(path);
    if (info.isDirectory()) await validateStaticTree(path);
    else if (!info.isFile()) throw new Error(`Static files cannot contain links or special files: ${name}`);
  }
}

/** Replace only one MR demo. Relative assets and links continue to work under the nested Pages URL. */
export async function installPreview(state, incoming, preview) {
  await validateStaticTree(incoming);
  // A missing entry point or bundle indicates a broken artifact; preserve the last good preview.
  let html = await readFile(join(incoming, 'index.html'), 'utf8');
  if (!(await lstat(join(incoming, 'build/demo.js'))).isFile()) throw new Error('Expected a demo bundle');
  await readdir(join(incoming, 'samples'));
  const parent = join(state, 'pr-preview');
  await mkdir(parent, { recursive: true });
  await validateStaticTree(parent);
  const target = join(parent, String(preview.number));
  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });
  await cp(incoming, join(target, 'demo'), { recursive: true });
  html = html.replaceAll('href="../"', 'href="../../../"').replaceAll('href="../assets/', 'href="../../../assets/');
  html = html.replace(/<title>.*?<\/title>/, `<title>Galley — MR #${preview.number} demo</title>`);
  await writeFile(join(target, 'demo/index.html'), html);
  await writeFile(join(target, 'preview.json'), `${JSON.stringify(preview)}\n`);
}

/** Reconcile the complete set, so main deployments retain open previews and remove closed ones. */
export async function composePreviews(state, site, openNumbers) {
  const directory = join(state, 'pr-preview');
  await mkdir(directory, { recursive: true });
  if (!(await lstat(directory)).isDirectory()) throw new Error('Invalid preview snapshot directory');
  const removed = [];
  for (const name of await readdir(directory)) {
    if (!/^\d+$/.test(name) || !openNumbers.has(Number(name))) {
      await rm(join(directory, name), { recursive: true, force: true });
      removed.push(name);
    }
  }
  await validateStaticTree(directory);
  await rm(join(site, 'pr-preview'), { recursive: true, force: true });
  await cp(directory, join(site, 'pr-preview'), { recursive: true });
  return removed;
}
