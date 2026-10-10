import { detectContext, detectRepository, type PageContext, type RepoContext } from '../platforms/detect.ts';
import { loadRepository, loadSource } from '../platforms/index.ts';
import { TOKENS_CHANGED, type TokensChanged } from '../platforms/token-signal.ts';
import type { ReviewSource } from '../platforms/types.ts';
import { Launcher } from '../ui/launcher.ts';
import { openReader } from '../ui/reader.ts';
import { openRepository } from '../ui/repo-reader.ts';

const LOADED = '__galleyLoaded';

function start(): void {
  const launcher = new Launcher();
  const sources = new Map<string, Promise<ReviewSource>>();
  let current: PageContext | RepoContext | null = null;
  let href = '';

  const sourceFor = (ctx: PageContext, fresh = false): Promise<ReviewSource> => {
    let source = sources.get(ctx.key);
    if (!source || fresh) {
      source = loadSource(ctx);
      sources.set(ctx.key, source);
    }
    return source;
  };

  const present = (ctx: PageContext) => {
    sourceFor(ctx).then(
      (source) => {
        if (current?.key !== ctx.key) return;
        if (source.docs.length || source.codeDocs?.length) launcher.show(ctx.key, source.docs.length || source.codeDocs!.length, () => openReader(source));
        else launcher.hide();
      },
      () => {
        if (current?.key !== ctx.key) return;
        launcher.show(
          ctx.key,
          0,
          () => {
            // Retry on click: a token may have been added, or a rate limit may have reset.
            const retry = sourceFor(ctx, true);
            openReader(retry);
            retry.then(
              () => present(ctx),
              () => {},
            );
          },
          true,
        );
      },
    );
  };

  const refresh = () => {
    href = location.href;
    const ctx = detectContext(location, document) ?? detectRepository(location, document);
    if (!ctx) {
      current = null;
      launcher.hide();
      return;
    }
    if (ctx.key === current?.key) {
      launcher.reattach();
      return;
    }
    current = ctx;
    launcher.hide();
    // A repository page is read on request only: nothing is fetched until Read docs is chosen.
    // Hiding the button there hides it for the whole repository.
    if ('view' in ctx) launcher.show(ctx.repository, null, () => openRepository(loadRepository(ctx)));
    else present(ctx);
  };

  refresh();
  // GitHub and GitLab are single-page apps: watch for in-app navigation.
  document.addEventListener('turbo:load', refresh);
  window.addEventListener('popstate', refresh);
  setInterval(() => (location.href === href ? launcher.reattach() : refresh()), 1000);

  // A token saved in the toolbar popup for this site takes effect without reloading the page.
  chrome.storage?.onChanged?.addListener((changes) => {
    const signal = changes[TOKENS_CHANGED]?.newValue as Partial<TokensChanged> | undefined;
    if (signal?.origin !== location.origin || !current) return;
    sources.delete(current.key);
    current = null;
    refresh();
  });
}

const flags = window as unknown as Record<string, boolean>;
if (!flags[LOADED]) {
  flags[LOADED] = true;
  start();
}
