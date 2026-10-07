import type { PageContext } from './detect.ts';
import { backgroundApi } from './github-api.ts';
import { loadGitHub } from './github.ts';
import { loadGitLab } from './gitlab.ts';
import type { ReviewSource } from './types.ts';

export async function loadSource(ctx: PageContext): Promise<ReviewSource> {
  if (ctx.platform === 'github') return loadGitHub(ctx, backgroundApi());
  return loadGitLab(ctx);
}
