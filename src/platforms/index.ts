import type { PageContext, RepoContext } from './detect.ts';
import { backgroundApi } from './github-api.ts';
import { loadGitHubRepository } from './github-repo.ts';
import { loadGitHub } from './github.ts';
import { loadGitLabRepository } from './gitlab-repo.ts';
import { loadGitLab } from './gitlab.ts';
import type { RepositorySource, ReviewSource } from './types.ts';

export async function loadSource(ctx: PageContext): Promise<ReviewSource> {
  if (ctx.platform === 'github') return loadGitHub(ctx, backgroundApi());
  return loadGitLab(ctx);
}

export async function loadRepository(ctx: RepoContext): Promise<RepositorySource> {
  if (ctx.platform === 'github') return loadGitHubRepository(ctx, backgroundApi());
  return loadGitLabRepository(ctx);
}
