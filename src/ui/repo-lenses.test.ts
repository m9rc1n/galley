import { expect, it, vi } from 'vitest';
import { MAX_CONFIG_CHARS } from '../core/architecture.ts';
import type { RepoDiscovery } from '../core/discovery.ts';
import { deferred } from '../testing/reader.ts';
import { listing, repoHarness, repository, words } from '../testing/repo.ts';
import { readConfig } from './config-frame.ts';

const drawn = vi.hoisted(() => ({ renderDiagrams: vi.fn(), highlightCode: vi.fn(async () => {}) }));
vi.mock('./diagrams.ts', async (original) => ({ ...(await original<typeof import('./diagrams.ts')>()), renderDiagrams: drawn.renderDiagrams }));
vi.mock('./code.ts', async (original) => ({ ...(await original<typeof import('./code.ts')>()), highlightCode: drawn.highlightCode }));
// The frame's own reading, without a frame: configs.test.ts covers the frame and its replies.
const frame = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock('./configs.ts', () => ({ readConfiguration: frame.read }));
frame.read.mockImplementation(async (_host: unknown, path: string, format: Parameters<typeof readConfig>[1], text: string) => readConfig(path, format, text));

const ui = repoHarness();

const shop: Record<string, string> = {
  'README.md': '# Shop\n\nSee [the architecture](docs/architecture/system.md).',
  'docs/architecture/system.md': '# Architecture\n\nThe web service keeps orders in a database.\n\n## Deploy\n\nThe deploy job ships it.',
  'docker-compose.yml': 'services:\n  web:\n    image: shop/web\n    depends_on:\n      - db\n  db:\n    image: postgres\n',
  '.github/workflows/deploy.yml':
    'name: Deploy\non: push\njobs:\n  build:\n    runs-on: ubuntu-latest\n  deploy:\n    needs: [build, lint]\n    environment: production\n    runs-on: ubuntu-latest\n',
};

const showMap = async () => {
  ui.click('[data-view="map"]');
  await vi.waitFor(() => expect(ui.q('.mr-map-status').textContent).toMatch(/^Built from all/));
};
const lens = (name: string) => ui.click(`[data-act="lens"][data-lens="${name}"]`);
const readConfigs = async () => {
  ui.press('Read configuration');
  await vi.waitFor(() => expect(ui.q('.mr-lens-configs').textContent).toMatch(/^Read /));
};
const entities = () => ui.all('.mr-lens-list li').map(words);
const connections = () => ui.all('.mr-lens-relation').map(words);

it('architecture: configuration is read only when asked, and declared services say where they are declared, never that they run', async () => {
  await ui.open(repository(shop));
  await showMap();
  expect(ui.all('.mr-lens-switch button').map((b) => [b.textContent, b.getAttribute('aria-pressed')])).toStrictEqual([
    ['Documents', 'true'],
    ['Architecture', 'false'],
    ['Infrastructure', 'false'],
    ['Decisions', 'false'],
  ]);
  lens('architecture');
  expect(ui.shadow().activeElement).toBe(ui.q('[data-lens="architecture"]'));
  expect(ui.q('[data-lens="architecture"]').getAttribute('aria-pressed')).toBe('true');
  expect(ui.text('.mr-lens-intro')).toBe('Services and components: what configuration declares, what you propose, and where documents name them.');
  expect(ui.text('.mr-lens-configs')).toBe(
    'Galley found 2 configuration files. It reads them only when you ask, and never runs anything in them. Read configuration',
  );
  expect(ui.text('.mr-lens-caveat')).toBe('Declared means what these files ask for at c0ffee1, not what is running.');
  expect(ui.text('.mr-lens .mr-repo-quiet')).toBe('Nothing to show yet.');
  expect(frame.read).not.toHaveBeenCalled();

  ui.press('Read configuration');
  expect(ui.text('.mr-lens-configs')).toBe('Reading configuration… 0 of 2');
  await vi.waitFor(() => expect(ui.text('.mr-lens-configs')).toBe('Read 2 of 2 configuration files at c0ffee1.'));
  // Galley names, never judges: a document that names a service may describe it, and says it is a guess.
  expect(entities()).toStrictEqual(['Architecture', 'Architecture Documented', 'Service', 'db Declared in configuration', 'web Declared in configuration']);
  expect(ui.text('.mr-map-title')).toBe('db');
  expect(ui.text('.mr-lens-focus .mr-map-facts')).toBe('Service Declared in configuration');
  expect(ui.text('.mr-lens-detail')).toBe('image postgres');
  const where = ui.q<HTMLAnchorElement>('.mr-lens-focus .mr-repo-evidence a');
  expect([where.textContent, where.href, where.target]).toStrictEqual([
    'docker-compose.yml, line 6',
    'https://github.com/acme/handbook/blob/c0ffee1/docker-compose.yml#L6',
    '_blank',
  ]);
  expect(connections()).toStrictEqual([
    'depends on (from) web Declared in configuration Declared in configuration docker-compose.yml, line 5 web depends on db',
  ]);

  ui.press('web', '.mr-lens-list .mr-lens-entity');
  expect(ui.shadow().activeElement).toBe(ui.q('.mr-map-title'));
  expect(ui.q('.mr-lens-list [aria-current="true"]').textContent).toBe('webDeclared in configuration');
  expect(connections()).toStrictEqual([
    'depends on db Declared in configuration Declared in configuration docker-compose.yml, line 5 web depends on db',
    'named in Architecture Documented Unverified suggestion docs/architecture/system.md, line 3 The web service keeps orders in a database.',
  ]);
  // A suggestion's evidence is a document: it opens here, at the line that names the service.
  ui.press('docs/architecture/system.md, line 3', '.mr-lens-relation button');
  await ui.settled();
  expect(ui.text('.mr-lead')).toBe('Architecture');
  expect(ui.q('.mr-repo-read').hidden).toBe(false);
});

it('infrastructure: workflows, jobs and environments in order, and a reference that no file declares is said', async () => {
  await ui.open(repository(shop));
  await showMap();
  lens('infrastructure');
  await readConfigs();
  // A document that names a job may describe it: an unverified suggestion, said as one.
  expect(entities()).toStrictEqual([
    'Architecture',
    'Architecture Documented',
    'Environment',
    'production Declared in configuration',
    'Job',
    'build Declared in configuration',
    'deploy Declared in configuration',
    'lint Declared in configuration',
    'Workflow',
    'Deploy Declared in configuration',
  ]);
  ui.press('lint', '.mr-lens-list .mr-lens-entity');
  expect(ui.text('.mr-lens-focus .mr-repo-limit')).toBe('Referenced in configuration, but declared in no file Galley read.');
  ui.press('deploy', '.mr-lens-list .mr-lens-entity');
  expect(connections().map((c) => c.split(' Declared')[0])).toStrictEqual([
    'runs (from) Deploy',
    'needs build',
    'needs lint',
    'deploys to production',
    'named in Architecture Documented Unverified suggestion docs/architecture/system.md, line 5 Deploy',
  ]);
  // The documents lens is one click away, as it was.
  lens('documents');
  expect(ui.text('.mr-map-title')).toBe('Shop');
});

it('says what configuration it could not read: too large, missing, refused by the frame, or beyond the listing', async () => {
  const files: Record<string, string> = {
    'README.md': '# Shop',
    'docker-compose.yml': 'services:\n  web:\n    image: x\n',
    'deploy/app.yaml': 'x'.repeat(MAX_CONFIG_CHARS + 1),
    'infra/main.tf': 'resource "aws_s3_bucket" "assets" {\n}\n',
    '.gitlab-ci.yml': 'build:\n  script: make\n',
  };
  const found: RepoDiscovery = {
    ...listing(['README.md']),
    configs: {
      files: [
        { path: 'docker-compose.yml', size: 30 },
        { path: 'k8s/huge.yaml', size: MAX_CONFIG_CHARS + 1 },
        { path: 'deploy/app.yaml' },
        { path: 'compose.yaml' },
        { path: 'infra/main.tf' },
        { path: '.gitlab-ci.yml' },
      ],
      limits: ['Configuration beyond the first 60 files is not read.'],
    },
  };
  frame.read.mockImplementationOnce(async (_h: unknown, path: string, format: Parameters<typeof readConfig>[1], text: string) =>
    readConfig(path, format, text),
  );
  frame.read.mockImplementationOnce(async (_h: unknown, path: string, format: Parameters<typeof readConfig>[1], text: string) =>
    readConfig(path, format, text),
  );
  frame.read.mockResolvedValueOnce(null);
  await ui.open(repository(files, { discover: vi.fn(async () => found) }));
  await showMap();
  lens('infrastructure');
  ui.press('Read configuration');
  await vi.waitFor(() => expect(ui.q('.mr-lens-configs').textContent).toMatch(/^Read /));
  expect(ui.all('.mr-lens-configs p').map((p) => p.textContent)).toStrictEqual([
    'Read 2 of 6 configuration files at c0ffee1.',
    'Configuration beyond the first 60 files is not read.',
    'k8s/huge.yaml is too large to read.',
    'deploy/app.yaml is too large to read.',
    'compose.yaml could not be read.',
    'infra/main.tf: References between Terraform resources are not read.',
    '.gitlab-ci.yml could not be read.',
  ]);
  // Reading again is not offered: the files are read once per commit.
  expect(ui.all('[data-act="read-configs"]')).toHaveLength(0);
  expect(entities()).toContain('aws_s3_bucket.assets Declared in configuration');
});

it('a refresh while configuration is read discards what was read at the old commit and starts over', async () => {
  const next = repository(shop, { commit: 'beef000000000000000000000000000000000000' });
  const source = repository(shop, { refresh: vi.fn(async () => next) });
  const slow = deferred<string>();
  vi.mocked(source.load).mockImplementation(async (path) => (path === 'docker-compose.yml' ? slow.promise : shop[path]));
  const parse = deferred<null>();
  frame.read.mockReturnValueOnce(parse.promise);
  await ui.open(source);
  await showMap();
  lens('architecture');
  ui.press('Read configuration');
  await vi.waitFor(() => expect(frame.read).toHaveBeenCalledTimes(1));
  ui.click('[data-act="refresh"]');
  await vi.waitFor(() => expect(ui.text('.mr-lens-configs')).toMatch(/^Galley found 2 configuration files/));
  // Late answers from the old commit change nothing.
  slow.resolve(shop['docker-compose.yml']);
  parse.resolve(null);
  await vi.waitFor(() => expect(ui.text('.mr-lens-caveat')).toBe('Declared means what these files ask for at beef000, not what is running.'));
  expect(ui.text('.mr-lens-configs')).toMatch(/^Galley found 2/);
  await readConfigs();
  expect(ui.text('.mr-lens-configs')).toBe('Read 2 of 2 configuration files at beef000.');
});

it('a repository without configuration says which files Galley looks for', async () => {
  await ui.open(repository({ 'README.md': '# Notes' }));
  await showMap();
  lens('architecture');
  expect(ui.q('.mr-lens-configs').textContent).toBe(
    'No configuration files were found: Compose files, GitHub Actions workflows, .gitlab-ci.yml, Kubernetes manifests in k8s/ or deploy/, and Terraform.',
  );
});

const records: Record<string, string> = {
  'README.md': '# Records',
  'docs/adr/0001-files.md': '---\nstatus: Superseded\nsuperseded-by: 2\n---\n# ADR 1: Keep files\n',
  'docs/adr/0002-queue.md':
    '---\nstatus: Accepted\nsupersedes: 1\nrfcs: [3]\n---\n# ADR 2: Use a queue\n\n## Status\n\nProposed\n\n## Context\n\nSee [the RFC](../rfcs/0003-orders.md).',
  'docs/rfcs/0003-orders.md': '---\ntype: spec\n---\n# RFC 3: Orders\n',
};

it('decisions: status, which supersede which and what they name, as written; two statuses stay visible', async () => {
  await ui.open(repository(records));
  await showMap();
  lens('decisions');
  expect(ui.text('.mr-lens-intro')).toBe('Decision records and what they state: their status, which supersede which, and the documents they link to or name.');
  expect(ui.all('.mr-lens-configs')).toHaveLength(0);
  expect(entities()).toStrictEqual(['Decision', 'ADR 1: Keep files Documented', 'ADR 2: Use a queue Documented', 'Spec', 'RFC 3: Orders Documented']);
  ui.press('ADR 2', '.mr-lens-list .mr-lens-entity');
  expect(ui.text('.mr-lens-detail')).toBe('Accepted');
  expect(ui.text('.mr-lens-focus .mr-repo-limit')).toBe('Its front matter says “Accepted”, and its Status section says “Proposed”.');
  expect(connections().map((c) => c.split(' Documented')[0])).toStrictEqual(['supersedes ADR 1: Keep files', 'links to RFC 3: Orders', 'names RFC 3: Orders']);
  // A decision is a document: it opens in the reader, or on the document map.
  ui.press('On the document map');
  expect(ui.q('[data-lens="documents"]').getAttribute('aria-pressed')).toBe('true');
  expect(ui.text('.mr-map-title')).toBe('ADR 2: Use a queue');
  expect(ui.shadow().activeElement).toBe(ui.q('.mr-map-title'));
  lens('decisions');
  ui.press('Read', '.mr-lens-focus button');
  await ui.settled();
  expect(ui.text('.mr-lead')).toBe('ADR 1: Keep files');
});

it('a repository without decision records says so', async () => {
  await ui.open(repository({ 'README.md': '# Notes' }));
  await showMap();
  lens('decisions');
  expect(ui.text('.mr-lens .mr-repo-quiet')).toBe('No decision records among the documents read so far.');
});

it('the reader proposes components and connections, marked as theirs; a type they set leaves the declared one visible', async () => {
  await ui.open(repository(shop, { start: { path: 'docs/architecture/system.md', folder: false } }));
  await showMap();
  lens('architecture');
  await readConfigs();
  const propose = ui.q<HTMLFormElement>('form[data-act="propose-entity"]');
  // Proposing is writing: the comment editor's card, with its fields in settings rows.
  expect(propose.classList).toContain('mr-composer');
  expect(words(propose.querySelector('.mr-comment-target')!)).toBe('Propose something the files do not show');
  expect(words(propose.querySelector('[data-act="propose-about"]')!.closest('.mr-set-row')!)).toBe(
    'About Architecture Ties the proposal to the document you are reading',
  );
  (propose.elements.namedItem('name') as HTMLInputElement).value = '   ';
  propose.requestSubmit();
  expect(entities()).not.toContain('Proposed by you');
  (propose.elements.namedItem('name') as HTMLInputElement).value = 'Renderer';
  (propose.elements.namedItem('kind') as HTMLSelectElement).value = 'Component';
  propose.requestSubmit();
  expect(ui.text('.mr-toast')).toBe('Renderer added as your proposal. Save your notes to keep it.');
  expect(ui.text('.mr-map-title')).toBe('Renderer');
  expect(ui.text('.mr-lens-focus .mr-map-facts')).toBe('Component Proposed by you');
  expect(connections()).toStrictEqual(['described in Architecture Documented Proposed by you docs/architecture/system.md, line 1 Architecture']);
  expect((ui.q<HTMLFormElement>('form[data-act="propose-entity"]').elements.namedItem('name') as HTMLInputElement).value).toBe('');

  // Connections between the reader's components and declared ones are theirs too; the same one twice is one.
  const connect = () => {
    const form = ui.q<HTMLFormElement>('form[data-act="propose-relation"]');
    (form.elements.namedItem('to') as HTMLSelectElement).value = 'service:web';
    (form.elements.namedItem('label') as HTMLInputElement).value = ' calls ';
    form.requestSubmit();
  };
  connect();
  connect();
  expect(connections()).toStrictEqual([
    'described in Architecture Documented Proposed by you docs/architecture/system.md, line 1 Architecture',
    'calls web Declared in configuration Proposed by you Remove',
  ]);
  const blank = ui.q<HTMLFormElement>('form[data-act="propose-relation"]');
  (blank.elements.namedItem('label') as HTMLInputElement).value = ' ';
  blank.requestSubmit();
  expect(connections()).toHaveLength(2);

  // Their own proposal's type simply changes.
  const kind = () => ui.q<HTMLSelectElement>('[data-act="entity-kind"]');
  kind().value = 'Interface';
  kind().dispatchEvent(new Event('change', { bubbles: true }));
  expect(ui.text('.mr-lens-focus .mr-map-facts')).toBe('Interface Proposed by you');
  expect(ui.shadow().activeElement).toBe(kind());

  // A declared service's type can be corrected; what the file says stays in view, and setting it back clears it.
  ui.press('web', '.mr-lens-list .mr-lens-entity');
  kind().value = 'Data store';
  kind().dispatchEvent(new Event('change', { bubbles: true }));
  expect(ui.text('.mr-lens-focus .mr-map-facts')).toBe('Data store Declared in configuration');
  expect(ui.text('.mr-lens-focus .mr-repo-limit')).toBe('The source says Service; you set Data store.');
  expect(ui.all('.mr-lens-focus [data-act="remove-entity"]')).toHaveLength(0);
  kind().value = 'Service';
  kind().dispatchEvent(new Event('change', { bubbles: true }));
  expect(ui.all('.mr-lens-focus .mr-repo-limit')).toHaveLength(0);

  // Removing a connection, then the proposal, leaves the files' view as it was.
  expect(connections()[1]).toBe('calls (from) Renderer Proposed by you Proposed by you Remove');
  ui.press('Renderer', '.mr-lens-list .mr-lens-entity');
  ui.press('Remove', '.mr-lens-relation button');
  expect(connections()).toHaveLength(1);
  connect();
  // A connection to it from a declared service goes with it too.
  ui.press('web', '.mr-lens-list .mr-lens-entity');
  const back = ui.q<HTMLFormElement>('form[data-act="propose-relation"]');
  const to = back.elements.namedItem('to') as HTMLSelectElement;
  to.value = [...to.options].find((o) => o.textContent === 'Renderer (Interface)')!.value;
  back.requestSubmit();
  ui.press('Renderer', '.mr-lens-list .mr-lens-entity');
  ui.press('Remove this proposal');
  expect(entities().join(' ')).not.toContain('Renderer');
  expect(ui.text('.mr-map-title')).toBe('db');
  ui.press('web', '.mr-lens-list .mr-lens-entity');
  expect(connections().join(' ')).not.toContain('calls');
});

it('a proposal is about the document being read only when the reader keeps it so, and what they type survives a redraw', async () => {
  // Opened from a review, no document is open yet: the form offers none.
  await ui.open(repository(shop), { review: { title: 'Change', revision: 'head', ref: 'topic', chapters: [] } });
  await vi.waitFor(() => expect(ui.q('.mr-review-status .mr-map-status').textContent).toMatch(/^Built from all/));
  ui.click('[data-view="map"]');
  lens('architecture');
  expect(ui.all('form[data-act="propose-entity"] [data-act="propose-about"]')).toHaveLength(0);
  const name = () => ui.q<HTMLFormElement>('form[data-act="propose-entity"]').elements.namedItem('name') as HTMLInputElement;
  name().value = 'Queue';
  name().focus();
  ui.press('Read configuration');
  await vi.waitFor(() => expect(ui.q('.mr-lens-configs').textContent).toMatch(/^Read /));
  expect(name().value).toBe('Queue');
  expect(ui.shadow().activeElement).toBe(name());

  ui.click('[data-view="read"]');
  await ui.settled();
  ui.click('[data-view="map"]');
  // Now a document is open: the form offers it, and keeps the name typed before.
  const form = ui.q<HTMLFormElement>('form[data-act="propose-entity"]');
  expect(name().value).toBe('Queue');
  const about = () => form.querySelector('[data-act="propose-about"]')!;
  expect(about().getAttribute('aria-checked')).toBe('true');
  ui.click('[data-act="propose-about"]');
  expect(about().getAttribute('aria-checked')).toBe('false');
  // A switch the reader turned off stays off when the view is drawn again.
  ui.press('web', '.mr-lens-list .mr-lens-entity');
  expect(ui.q('[data-act="propose-about"]').getAttribute('aria-checked')).toBe('false');
  ui.q<HTMLFormElement>('form[data-act="propose-entity"]').requestSubmit();
  expect(ui.text('.mr-map-title')).toBe('Queue');
  expect(connections()).toStrictEqual([]);
  expect(ui.text('.mr-lens-relations + .mr-repo-quiet, .mr-map-col .mr-repo-quiet')).toBe('No connections found.');
});

it('after a refresh, the map says which links changed among the documents read at both commits', async () => {
  const before: Record<string, string> = {
    'README.md': '# Handbook\n\n[Guide](guide.md) and [Old](old.md).',
    'guide.md': '# Guide',
    'old.md': '# Old',
    'new.md': '# New',
  };
  const after = { ...before, 'README.md': '# Handbook\n\n[Guide](guide.md) and [New](new.md).' };
  const next = repository(after, { commit: 'beef000000000000000000000000000000000000' });
  await ui.open(repository(before, { refresh: vi.fn(async () => next) }));
  await showMap();
  ui.click('[data-act="refresh"]');
  await vi.waitFor(() => expect(ui.q('.mr-map-since')).toBeTruthy());
  await vi.waitFor(() => expect(ui.q('.mr-map-status').textContent).toMatch(/^Built from all/));
  expect(words(ui.q('.mr-map-since'))).toBe(
    'Since c0ffee1 Among the 4 documents read at both commits, 1 link is new and 1 link is gone. New: Handbook → New Gone: Handbook → Old Dismiss',
  );
  ui.press('Old', '.mr-map-since button');
  expect(ui.text('.mr-map-title')).toBe('Old');
  ui.press('Dismiss', '.mr-map-since button');
  expect(ui.all('.mr-map-since')).toHaveLength(0);
});

it('a refresh with nothing changed between the documents read says so', async () => {
  const next = repository(shop, { commit: 'beef000000000000000000000000000000000000' });
  await ui.open(repository(shop, { refresh: vi.fn(async () => next) }));
  await showMap();
  ui.click('[data-act="refresh"]');
  await vi.waitFor(() => expect(ui.q('.mr-map-status').textContent).toMatch(/^Built from all .* at beef000/));
  expect(ui.text('.mr-map-since p')).toBe('No links changed among the 2 documents read at both commits.');
});

it('closing while configuration is read stops reading it', async () => {
  const source = repository(shop);
  const slow = deferred<string>();
  vi.mocked(source.load).mockImplementation(async (path) => (path === 'docker-compose.yml' ? slow.promise : shop[path]));
  await ui.open(source);
  await showMap();
  lens('architecture');
  frame.read.mockClear();
  ui.press('Read configuration');
  await vi.waitFor(() => expect(frame.read).toHaveBeenCalledTimes(1));
  ui.close();
  slow.resolve(shop['docker-compose.yml']);
  await vi.waitFor(() => expect(source.load).toHaveBeenCalledWith('docker-compose.yml'));
  expect(frame.read).toHaveBeenCalledTimes(1);
});
