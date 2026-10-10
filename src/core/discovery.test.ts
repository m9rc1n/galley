import { expect, it } from 'vitest';
import { collectDocs, configFormat, configRoots, docRoots, MAX_CONFIGS, MAX_DOCS, MAX_DOC_ROOTS } from './discovery.ts';

it('lists Markdown files once, by path, with their size when the listing has it', () => {
  const limits: string[] = [];
  const found = collectDocs(
    [
      { path: 'z.md', type: 'blob' },
      { path: 'README.md', type: 'blob', size: 10 },
      { path: 'docs', type: 'tree' },
      { path: 'docs/guide.markdown', type: 'blob' },
      { path: 'README.md', type: 'blob', size: 10 },
      { path: 'src/app.ts', type: 'blob' },
      { path: 'notes.md', type: 'commit' },
    ],
    limits,
  );
  expect(found).toStrictEqual({
    docs: [{ path: 'README.md', size: 10 }, { path: 'docs/guide.markdown' }, { path: 'z.md' }],
    limits: [],
    configs: { files: [], limits: [] },
  });
});

it('past the budget, top-level and documentation folders are kept before other folders and dependencies', () => {
  const entries = [
    ...Array.from({ length: MAX_DOCS }, (_, i) => ({ path: `node_modules/pkg${i}/README.md`, type: 'blob' })),
    { path: 'vendor/lib/README.md', type: 'blob' },
    { path: 'src/feature/NOTES.md', type: 'blob' },
    { path: 'Docs/adr/0001.md', type: 'blob' },
    { path: 'CHANGELOG.md', type: 'blob' },
  ];
  const limits = ['Listed by folder.'];
  const { docs } = collectDocs(entries, limits);
  expect(docs).toHaveLength(MAX_DOCS);
  expect(docs.slice(0, 3).map((doc) => doc.path)).toStrictEqual(['CHANGELOG.md', 'Docs/adr/0001.md', 'node_modules/pkg0/README.md']);
  expect(docs.at(-1)!.path).toBe('src/feature/NOTES.md');
  expect(docs.some((doc) => doc.path.startsWith('vendor/'))).toBe(false);
  expect(limits).toStrictEqual(['Listed by folder.', 'Listing the first 2,000 of 2,004 Markdown files, documentation folders first.']);
});

it('documentation folders are top-level folders with familiar names, in a fixed order and number', () => {
  const folder = (path: string) => ({ path, type: 'tree' });
  const roots = docRoots([
    folder('src'),
    folder('ADR'),
    folder('docs'),
    { path: 'docs.md', type: 'blob' },
    folder('docs/specs'),
    folder('specs'),
    folder('design'),
    folder('runbooks'),
    folder('guides'),
    folder('rfcs'),
  ]);
  expect(roots.map((entry) => entry.path)).toStrictEqual(['docs', 'specs', 'ADR', 'rfcs', 'design', 'runbooks']);
  expect(roots).toHaveLength(MAX_DOC_ROOTS);
});

it('configuration files are recognised by name and folder, and listed apart from documents', () => {
  expect(configFormat('docker-compose.yml')).toBe('compose');
  expect(configFormat('ops/compose.prod.yaml')).toBe('compose');
  expect(configFormat('.github/workflows/deploy.yml')).toBe('workflow');
  expect(configFormat('.github/workflows/nested/deploy.yml')).toBe(null);
  expect(configFormat('.gitlab-ci.yml')).toBe('gitlab-ci');
  expect(configFormat('infra/main.tf')).toBe('terraform');
  expect(configFormat('k8s/api/deployment.yaml')).toBe('kubernetes');
  expect(configFormat('deploy/service.yml')).toBe('kubernetes');
  expect(configFormat('charts/api/templates/deployment.yaml')).toBe(null);
  expect(configFormat('src/config.yaml')).toBe(null);
  const limits: string[] = [];
  const many = Array.from({ length: MAX_CONFIGS + 2 }, (_, i) => ({ path: `infra/m${String(i).padStart(3, '0')}.tf`, type: 'blob' }));
  const found = collectDocs([...many, { path: 'README.md', type: 'blob' }, { path: 'infra/m000.tf', type: 'blob' }], [], limits);
  expect(found.configs.files).toHaveLength(MAX_CONFIGS);
  expect(found.configs.files[0]).toStrictEqual({ path: 'infra/m000.tf' });
  expect(found.configs.limits).toStrictEqual(['Reading the first 60 of 62 configuration files, by path.']);
  expect(found.docs).toStrictEqual([{ path: 'README.md' }]);
  const folder = (path: string) => ({ path, type: 'tree' });
  expect(
    configRoots([folder('src'), folder('.github'), folder('infra'), folder('deploy'), folder('k8s'), folder('terraform')]).map((entry) => entry.path),
  ).toStrictEqual(['.github', 'k8s', 'deploy', 'infra']);
});
