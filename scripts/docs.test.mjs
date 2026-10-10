import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { anchorsOf, checkLinks, linksOf, parseFrontMatter, run } from './docs.mjs';

const ADR_README = '# Decisions\n\n<!-- adr-index:start -->\n<!-- adr-index:end -->\n';
const RFC_README = '# Proposals\n\n<!-- rfc-index:start -->\n<!-- rfc-index:end -->\n';
const adr = (fields, title = 'Render in the browser') => `---\n${fields}\n---\n\n# ADR 0002: ${title}\n\n## Context\n`;
const rfc = (fields) => `---\n${fields}\n---\n\n# RFC 0036: Review chapters\n\n## Problem\n`;

async function repo(t, files) {
  const root = await mkdtemp(join(tmpdir(), 'galley-docs-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  execFileSync('git', ['init', '-q'], { cwd: root });
  for (const [path, text] of Object.entries(files)) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), text);
  }
  return root;
}

test('reads the front matter the records use, and leaves documents without it alone', () => {
  const { data, body } = parseFrontMatter('---\nstatus: Accepted\nrfcs: [36, 37]\ntitle: "A: quoted"\npaths:\n  - "src/**"\n  - docs/**\n---\n# Body\n');
  assert.deepEqual(data, { status: 'Accepted', rfcs: ['36', '37'], title: 'A: quoted', paths: ['src/**', 'docs/**'] });
  assert.equal(body, '# Body\n');
  assert.deepEqual(parseFrontMatter('# No front matter\n'), { data: null, body: '# No front matter\n', lines: 0 });
  assert.throws(() => parseFrontMatter('---\n: nothing\n---\n'), /Cannot read front matter/);
});

test('makes heading anchors the way GitHub does', () => {
  const anchors = anchorsOf(
    '# GitLab (gitlab.com and self-managed)\n## The `reader.css` cascade\n## Notes\n## Notes\n<a id="custom"></a>\n```\n# not a heading\n```\n',
  );
  assert.deepEqual([...anchors], ['gitlab-gitlabcom-and-self-managed', 'the-readercss-cascade', 'notes', 'notes-1', 'custom']);
});

test('finds links in Markdown and raw HTML, but not in code', () => {
  const links = linksOf('---\nx: y\n---\n[a](a.md) ![b](img/b.png)\n\n<p><img src="c.png"></p>\n\n`[no](no.md)`\n\n```\n[no](no.md)\n```\n');
  assert.deepEqual(
    links.map((link) => link.url),
    ['a.md', 'img/b.png', 'c.png'],
  );
  assert.equal(links[0].line, 4);
});

test('reports missing files, unknown anchors and links that leave the repository', async (t) => {
  const root = await repo(t, {
    'docs/a.md': '# A\n\n## Known\n\n[ok](b.md#target) [self](#known) [web](https://example.com/x.md) [mail](mailto:x@y.z)\n',
    'docs/b.md': '# B\n\n## Target\n',
    'docs/c.md': '[gone](missing.md) [anchor](b.md#nowhere) [out](../../outside.md) [bad](%E0%A4%A.md) [dir](./) [root](/docs/b.md)\n',
  });
  assert.deepEqual(checkLinks(root, ['docs/a.md', 'docs/b.md']), []);
  assert.deepEqual(checkLinks(root, ['docs/c.md']), [
    'docs/c.md:1: missing.md does not exist',
    'docs/c.md:1: b.md#nowhere names no heading in docs/b.md',
    'docs/c.md:1: ../../outside.md leaves the repository',
    'docs/c.md:1: cannot decode link %E0%A4%25A.md',
  ]);
});

test('requires decisions and proposals to link to each other, and writes their indexes', async (t) => {
  const root = await repo(t, {
    'docs/adr/README.md': ADR_README,
    'docs/rfcs/README.md': RFC_README,
    'docs/adr/0002-render-in-the-browser.md': adr('status: Accepted\ndate: 2026-10-04\nrfcs: [36]'),
    'docs/rfcs/0036-review-chapters.md': rfc(
      'status: Implemented\ncreated: 2026-10-10\ntheme: Never lose the thread\ndiscussion: https://github.com/o/r/issues/36\nadrs: []',
    ),
  });
  assert.deepEqual(run(root, { write: true }), ['docs/rfcs/0036-review-chapters.md: list ADR 2 under adrs, since it cites this RFC']);

  await writeFile(
    join(root, 'docs/rfcs/0036-review-chapters.md'),
    rfc('status: Implemented\ncreated: 2026-10-10\ntheme: Never lose the thread\ndiscussion: https://github.com/o/r/issues/36\nadrs: [2]'),
  );
  assert.deepEqual(run(root, { write: true }), []);
  assert.match(
    await readFile(join(root, 'docs/adr/README.md'), 'utf8'),
    /\| \[0002\]\(0002-render-in-the-browser\.md\) \| Render in the browser \| Accepted \| 2026-10-04 \| \[0036\]\(\.\.\/rfcs\/0036-review-chapters\.md\) \|/,
  );
  assert.match(
    await readFile(join(root, 'docs/rfcs/README.md'), 'utf8'),
    /\| Implemented \| Never lose the thread \| \[#36\]\(https:\/\/github\.com\/o\/r\/issues\/36\) \|/,
  );

  await writeFile(join(root, 'docs/adr/0002-render-in-the-browser.md'), adr('status: Accepted\ndate: 2026-10-04\nrfcs: [36]', 'Render locally'));
  assert.deepEqual(run(root), ['docs/adr/README.md: the index is out of date; run npm run docs:index']);
});

test('checks statuses, dates, names, headings and supersession', async (t) => {
  const root = await repo(t, {
    'docs/adr/README.md': ADR_README,
    'docs/adr/0002-render-in-the-browser.md': adr('status: Superseded\ndate: 4 Oct'),
    'docs/adr/0003-later.md': '---\nstatus: Accepted\ndate: 2026-10-05\nsupersedes: [2, 9]\n---\n\n# ADR 0003: Later\n',
    'docs/adr/0004-wrong-heading.md': '---\nstatus: Accepted\ndate: 2026-10-05\n---\n\n# Wrong heading\n',
    'docs/adr/0005-no-front-matter.md': '# ADR 0005: No front matter\n',
    'docs/adr/0006-bad-yaml.md': '---\n- stray\n---\n\n# ADR 0006: Bad\n',
    'docs/adr/Notes.md': '# Notes\n',
    'docs/rfcs/0040-proposal.md': '---\nstatus: Pending\ncreated: soon\ndiscussion: http://example.com\nadrs: [3, 8]\n---\n\n# RFC 0040: Proposal\n',
  });
  assert.deepEqual(run(root), [
    'docs/adr/0004-wrong-heading.md: the first heading must be "# ADR 0004: Title"',
    'docs/adr/0005-no-front-matter.md: front matter is missing',
    'docs/adr/0006-bad-yaml.md: Cannot read front matter line: - stray',
    'docs/adr/Notes.md: name records NNNN-short-title.md, in lower case',
    'docs/adr/0002-render-in-the-browser.md: date must be YYYY-MM-DD',
    'docs/adr/0002-render-in-the-browser.md: a superseded decision names its successor in superseded-by',
    'docs/adr/0002-render-in-the-browser.md: set superseded-by: 3, since ADR 3 supersedes it',
    'docs/adr/0003-later.md: superseded ADR 9 does not exist',
    'docs/rfcs/0040-proposal.md: status must be one of Draft, Proposed, Accepted, Implemented, Postponed, Declined, Withdrawn, Superseded',
    'docs/rfcs/0040-proposal.md: created must be YYYY-MM-DD',
    'docs/rfcs/0040-proposal.md: discussion must be an https link',
    "docs/adr/0003-later.md: list RFC 40 under rfcs, since it records this RFC's decision",
    'docs/rfcs/0040-proposal.md: ADR 8 does not exist',
    'docs/adr/README.md: the index is out of date; run npm run docs:index',
  ]);
});

test('checks that every agent skill is named after its folder and says when to use it', async (t) => {
  const root = await repo(t, {
    '.claude/skills/good/SKILL.md': '---\nname: good\ndescription: Use when testing.\n---\n# Good\n',
    '.claude/skills/Wrong/SKILL.md': '---\nname: other\ndescription: Use when testing.\n---\n',
    '.claude/skills/quiet/SKILL.md': '---\nname: quiet\n---\n',
    '.claude/skills/bare/SKILL.md': '# Bare\n',
    '.claude/skills/empty/notes.md': '# Notes\n',
  });
  assert.deepEqual(run(root), [
    '.claude/skills/Wrong/SKILL.md: name must be "Wrong", in kebab case',
    '.claude/skills/bare/SKILL.md: front matter is missing',
    '.claude/skills/empty/SKILL.md is missing',
    '.claude/skills/quiet/SKILL.md: description must say what the skill does and when to use it, in at most 1,024 characters',
  ]);
});
