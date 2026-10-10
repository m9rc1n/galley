import { expect, it } from 'vitest';
import { MAX_CONFIG_CHARS } from '../core/architecture.ts';
import { isConfigRequest, MAX_DECLARED, readConfig, serveConfigs } from './config-frame.ts';

it('an alias bomb is read as written: aliases are never expanded or followed', () => {
  const bomb = [
    'a: &a ["x","x","x","x","x","x","x","x","x"]',
    ...'bcdefghij'.split('').map((c, i) => `${c}: &${c} [${Array(9).fill(`*${'abcdefghij'[i]}`).join(',')}]`),
    'services:',
    '  web:',
    '    image: *j',
  ].join('\n');
  const started = Date.now();
  const reading = readConfig('docker-compose.yml', 'compose', bomb);
  expect(Date.now() - started).toBeLessThan(1_000);
  expect(reading.items).toStrictEqual([{ key: 'service:web', name: 'web', kind: 'service', line: 12, detail: '' }]);
});

it('malformed YAML, and files without what the format declares, say so instead of guessing', () => {
  expect(readConfig('docker-compose.yml', 'compose', 'services: [unclosed')).toStrictEqual({
    items: [],
    links: [],
    notes: ['This file could not be read as YAML.'],
  });
  expect(readConfig('docker-compose.yml', 'compose', 'version: "3"')).toStrictEqual({ items: [], links: [], notes: ['No services are declared.'] });
  expect(readConfig('k8s/a.yaml', 'kubernetes', 'kind: Thing')).toStrictEqual({ items: [], links: [], notes: ['No Kubernetes objects are declared.'] });
  expect(readConfig('.github/workflows/a.yml', 'workflow', 'on: push').notes).toStrictEqual(['No jobs are declared.']);
  expect(readConfig('docker-compose.yml', 'compose', '').notes).toStrictEqual(['This file could not be read as YAML.']);
});

it('declarations are capped, and the reader is told what was left out', () => {
  const many = ['services:', ...Array.from({ length: MAX_DECLARED + 5 }, (_, i) => `  s${i}:\n    image: x`)].join('\n');
  const reading = readConfig('docker-compose.yml', 'compose', many);
  expect(reading.items).toHaveLength(MAX_DECLARED);
  expect(reading.notes).toStrictEqual([`Only the first ${MAX_DECLARED} declarations are read.`]);
  const linked = ['services:', '  a:', '    depends_on:', ...Array.from({ length: MAX_DECLARED }, (_, i) => `      - s${i}`)].join('\n');
  expect(readConfig('docker-compose.yml', 'compose', linked).notes).toStrictEqual([`Only the first ${MAX_DECLARED} declarations are read.`]);
});

it('names that look like markup or code stay plain text, and values that are not names are skipped', () => {
  const reading = readConfig(
    'docker-compose.yml',
    'compose',
    [
      'services:',
      '  "<img src=x onerror=alert(1)>":',
      // biome-ignore lint/suspicious/noTemplateCurlyInString: a Compose variable, written as the file has it.
      '    image: "${IMAGE}"',
      '  ? [not, a, name]',
      '  : image: x',
      '  empty:',
      '  built:',
      '    build: .',
    ].join('\n'),
  );
  expect(reading.items).toStrictEqual([
    // biome-ignore lint/suspicious/noTemplateCurlyInString: Compose interpolation is shown as written, never evaluated.
    { key: 'service:<img src=x onerror=alert(1)>', name: '<img src=x onerror=alert(1)>', kind: 'service', line: 2, detail: 'image ${IMAGE}' },
    { key: 'service:empty', name: 'empty', kind: 'service', line: 6, detail: '' },
    { key: 'service:built', name: 'built', kind: 'service', line: 7, detail: 'built from the repository' },
  ]);
});

it('Compose: services, their images and what they depend on, as a list or a map', () => {
  const source = [
    'services:',
    '  web:',
    '    image: acme/web:1.2',
    '    depends_on: [api, cache]',
    '  api:',
    '    build: ./api',
    '    depends_on:',
    '      db:',
    '        condition: service_healthy',
    '  db:',
    '    image: postgres:16',
    '  cache:',
    '    image: redis',
    '    depends_on: db',
    '  odd:',
    '    depends_on:',
    '      ? [not, a, name]',
    '      : {}',
  ].join('\n');
  const reading = readConfig('docker-compose.yml', 'compose', source);
  expect(reading.items.map(({ name, detail, line }) => [name, detail, line])).toStrictEqual([
    ['web', 'image acme/web:1.2', 2],
    ['api', 'built from the repository', 5],
    ['db', 'image postgres:16', 10],
    ['cache', 'image redis', 12],
    ['odd', '', 15],
  ]);
  expect(reading.links).toStrictEqual([
    { from: 'service:web', to: 'service:api', label: 'depends on', line: 4 },
    { from: 'service:web', to: 'service:cache', label: 'depends on', line: 4 },
    { from: 'service:api', to: 'service:db', label: 'depends on', line: 8 },
    { from: 'service:cache', to: 'service:db', label: 'depends on', line: 14 },
  ]);
  expect(reading.notes).toStrictEqual([]);
});

it('GitHub Actions: a workflow, its jobs, what they need and the environments they deploy to', () => {
  const source = [
    'name: Deploy',
    'on: push',
    'jobs:',
    '  build:',
    '    runs-on: ubuntu-latest',
    '  test:',
    '    name: Unit tests',
    '    needs: build',
    '  release:',
    '    needs: [build, test]',
    '    environment:',
    '      name: production',
    '      url: https://example.com',
    '  preview:',
    '    environment: staging',
    '  odd:',
    '    environment: {url: x}',
  ].join('\n');
  const reading = readConfig('.github/workflows/deploy.yml', 'workflow', source);
  const path = '.github/workflows/deploy.yml';
  expect(reading.items.map(({ key, name, kind, detail }) => [key, name, kind, detail])).toStrictEqual([
    [`workflow:${path}`, 'Deploy', 'workflow', 'deploy.yml'],
    [`job:${path}:build`, 'build', 'job', ''],
    [`job:${path}:test`, 'test', 'job', 'Unit tests'],
    [`job:${path}:release`, 'release', 'job', ''],
    ['environment:production', 'production', 'environment', ''],
    [`job:${path}:preview`, 'preview', 'job', ''],
    ['environment:staging', 'staging', 'environment', ''],
    [`job:${path}:odd`, 'odd', 'job', ''],
  ]);
  expect(reading.links.filter((link) => link.label !== 'runs')).toStrictEqual([
    { from: `job:${path}:test`, to: `job:${path}:build`, label: 'needs', line: 8 },
    { from: `job:${path}:release`, to: `job:${path}:build`, label: 'needs', line: 10 },
    { from: `job:${path}:release`, to: `job:${path}:test`, label: 'needs', line: 10 },
    { from: `job:${path}:release`, to: 'environment:production', label: 'deploys to', line: 9 },
    { from: `job:${path}:preview`, to: 'environment:staging', label: 'deploys to', line: 14 },
  ]);
  expect(reading.links.filter((link) => link.label === 'runs')).toHaveLength(5);
  // A workflow without a name is named by its file.
  expect(readConfig('.github/workflows/ci.yml', 'workflow', 'jobs:\n  a: {}\n  ? [x]\n  : {}').items[0]).toMatchObject({ name: 'ci.yml' });
});

it('GitLab CI: jobs, their stages, what they need and where they deploy; pipeline keywords and hidden jobs are not jobs', () => {
  const source = [
    'stages: [build, deploy]',
    'include: shared.yml',
    'variables: {A: 1}',
    '.template:',
    '  script: echo',
    'compile:',
    '  stage: build',
    '  script: make',
    'ship:',
    '  stage: deploy',
    '  needs:',
    '    - compile',
    '    - job: lint',
    '    - pipeline: other',
    '  environment: production',
    'lint:',
    '  script: lint',
    'notes: just text',
    '? [x]',
    ': {}',
  ].join('\n');
  const reading = readConfig('.gitlab-ci.yml', 'gitlab-ci', source);
  expect(reading.items.map(({ key, detail }) => [key, detail])).toStrictEqual([
    ['job:.gitlab-ci.yml:compile', 'stage build'],
    ['stage:build', ''],
    ['job:.gitlab-ci.yml:ship', 'stage deploy'],
    ['stage:deploy', ''],
    ['environment:production', ''],
    ['job:.gitlab-ci.yml:lint', ''],
  ]);
  expect(reading.links).toStrictEqual([
    { from: 'job:.gitlab-ci.yml:compile', to: 'stage:build', label: 'in stage', line: 6 },
    { from: 'job:.gitlab-ci.yml:ship', to: 'stage:deploy', label: 'in stage', line: 9 },
    { from: 'job:.gitlab-ci.yml:ship', to: 'job:.gitlab-ci.yml:compile', label: 'needs', line: 12 },
    { from: 'job:.gitlab-ci.yml:ship', to: 'job:.gitlab-ci.yml:lint', label: 'needs', line: 13 },
    { from: 'job:.gitlab-ci.yml:ship', to: 'environment:production', label: 'deploys to', line: 9 },
  ]);
  expect(reading.notes).toStrictEqual(['Included files are not read.']);
  expect(readConfig('.gitlab-ci.yml', 'gitlab-ci', 'test:\n  script: x').notes).toStrictEqual([]);
});

it('Kubernetes: every object with a kind and a name, in its namespace, across documents', () => {
  const source = [
    'apiVersion: apps/v1',
    'kind: Deployment',
    'metadata:',
    '  name: reviews',
    '  namespace: prod',
    '---',
    'apiVersion: v1',
    'kind: Service',
    'metadata: {name: reviews}',
    '---',
    'kind: NotAnObject',
  ].join('\n');
  expect(readConfig('k8s/reviews.yaml', 'kubernetes', source).items).toStrictEqual([
    { key: 'workload:prod/Deployment/reviews', name: 'reviews', kind: 'workload', line: 1, detail: 'Deployment in prod' },
    { key: 'workload:default/Service/reviews', name: 'reviews', kind: 'workload', line: 7, detail: 'Service' },
  ]);
});

it('Terraform: resources and modules by their header line; references between them are not read', () => {
  const source = [
    'resource "aws_s3_bucket" "docs" {',
    '  bucket = var.name',
    '}',
    '  module "network" {',
    'data "aws_ami" "x" {}',
    'resource "aws_s3_bucket" "docs" {}',
  ].join('\n');
  expect(readConfig('infra/main.tf', 'terraform', source)).toStrictEqual({
    items: [
      { key: 'resource:infra/aws_s3_bucket.docs', name: 'aws_s3_bucket.docs', kind: 'resource', line: 1, detail: 'aws_s3_bucket' },
      { key: 'module:infra/network', name: 'network', kind: 'module', line: 4, detail: '' },
    ],
    links: [],
    notes: ['References between Terraform resources are not read.'],
  });
  expect(readConfig('main.tf', 'terraform', 'module "m" {}').items[0].key).toBe('module:./m');
});

it('accepts only well-formed requests within the size limit, and answers on its port', async () => {
  const ok = { id: 1, path: 'docker-compose.yml', format: 'compose', text: 'services: {a: {}}' };
  expect(isConfigRequest(ok)).toBe(true);
  for (const bad of [
    null,
    { ...ok, id: '1' },
    { ...ok, path: 1 },
    { ...ok, path: 'x'.repeat(1_001) },
    { ...ok, format: 'helm' },
    { ...ok, text: 1 },
    { ...ok, text: 'x'.repeat(MAX_CONFIG_CHARS + 1) },
  ])
    expect(isConfigRequest(bad)).toBe(false);
  const channel = new MessageChannel();
  serveConfigs(channel.port1);
  const reply = new Promise<unknown>((resolve) => {
    channel.port2.onmessage = ({ data }) => resolve(data);
  });
  channel.port2.postMessage(ok);
  expect(await reply).toStrictEqual({
    id: 1,
    reading: { items: [{ key: 'service:a', name: 'a', kind: 'service', line: 1, detail: '' }], links: [], notes: [] },
  });
  channel.port1.close();
  channel.port2.close();
});
