import { detectContext, type PageContext } from '../platforms/detect.ts';
import { loadSource } from '../platforms/index.ts';
import type { ReviewSource } from '../platforms/types.ts';
import { Launcher } from '../ui/launcher.ts';
import { openReader } from '../ui/reader.ts';

const LOADED = '__galleyLoaded';

function start(): void {
  const launcher = new Launcher();
  const sources = new Map<string, Promise<ReviewSource>>();
  let current: PageContext | null = null;
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
        if (source.docs.length || source.codeDocs?.length) launcher.show(ctx.key, source.docs.length || source.codeDocs?.length || 0, () => openReader(source));
        else launcher.hide();
      },
      () => {
        if (current?.key !== ctx.key) return;
        launcher.show(ctx.key, 0, () => {
          // Retry on click: a token may have been added, or a rate limit may have reset.
          const retry = sourceFor(ctx, true);
          openReader(retry);
          retry.then(() => present(ctx), () => {});
        }, true);
      },
    );
  };

  const refresh = () => {
    href = location.href;
    const ctx = detectContext(location, document);
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
    present(ctx);
  };

  refresh();
  // GitHub and GitLab are single-page apps: watch for in-app navigation.
  document.addEventListener('turbo:load', refresh);
  window.addEventListener('popstate', refresh);
  setInterval(() => (location.href === href ? launcher.reattach() : refresh()), 1000);

  // A token saved in the toolbar popup takes effect without reloading the page.
  chrome.storage?.onChanged?.addListener((changes) => {
    if (!changes['galley:tokens'] || !current) return;
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
