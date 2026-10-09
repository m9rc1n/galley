import { expect, it, vi } from 'vitest';
import type { PageContext } from './detect.ts';

const mocks = vi.hoisted(() => ({ github: vi.fn(), gitlab: vi.fn(), background: vi.fn() }));
vi.mock('./github.ts', () => ({ loadGitHub: mocks.github }));
vi.mock('./gitlab.ts', () => ({ loadGitLab: mocks.gitlab }));
vi.mock('./github-api.ts', () => ({ backgroundApi: mocks.background }));
import { loadSource } from './index.ts';

it('routes GitHub through the privileged worker and GitLab through the page API', async () => {
  const github: PageContext = {
    platform: 'github',
    key: 'gh',
    origin: 'https://github.com',
    apiBase: 'https://api.github.com',
    owner: 'a',
    repo: 'b',
    number: 1,
    title: 'Review',
  };
  const gitlab: PageContext = { platform: 'gitlab', key: 'gl', origin: 'https://gitlab.com', prefix: '', projectPath: 'a/b', projectId: '1', iid: 1 };
  const api = { request: vi.fn() },
    ghSource = { title: 'GitHub' },
    glSource = { title: 'GitLab' };
  mocks.background.mockReturnValue(api);
  mocks.github.mockResolvedValue(ghSource);
  mocks.gitlab.mockResolvedValue(glSource);
  expect(await loadSource(github)).toBe(ghSource);
  expect(mocks.github).toHaveBeenCalledExactlyOnceWith(github, api);
  expect(await loadSource(gitlab)).toBe(glSource);
  expect(mocks.gitlab).toHaveBeenCalledExactlyOnceWith(gitlab);
  expect(mocks.background).toHaveBeenCalledOnce();
});
