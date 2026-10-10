import { detectContext, detectRepository, type PageContext, type RepoContext } from '../platforms/detect.ts';
import { loadRepository, loadSource } from '../platforms/index.ts';
import { OPEN_READER, PAGE_STATE, type PageState } from '../platforms/page-actions.ts';
import { TOKENS_CHANGED, type TokensChanged } from '../platforms/token-signal.ts';
import type { ReviewSource } from '../platforms/types.ts';
import { Launcher } from '../ui/launcher.ts';
import { openReader } from '../ui/reader.ts';
import { openRepository } from '../ui/repo-reader.ts';
import { DEFAULT_SETTINGS, loadSettings, SETTINGS_KEY } from '../ui/settings.ts';

const LOADED = '__galleyLoaded';

function start(): void {
  const launcher = new Launcher();
  const sources = new Map<string, Promise<ReviewSource>>();
  let current: PageContext | RepoContext | null = null;
  let href = '';
  let readButton = DEFAULT_SETTINGS.readButton;
  let settingsReady = false;
  let settingsFailed = false;
  let generation = 0;

  const sourceFor = (ctx: PageContext, fresh = false): Promise<ReviewSource> => {
    let source = sources.get(ctx.key);
    if (!source || fresh) {
      source = loadSource(ctx);
      sources.set(ctx.key, source);
      const loading = source;
      loading.catch(() => {
        if (sources.get(ctx.key) === loading) sources.delete(ctx.key);
      });
    }
    return source;
  };

  const present = (ctx: PageContext) => {
    const version = generation;
    sourceFor(ctx).then(
      (source) => {
        if (current?.key !== ctx.key || version !== generation) return;
        if (source.docs.length || source.codeDocs?.length) launcher.show(ctx.key, source.docs.length || source.codeDocs!.length, () => openReader(source));
        else launcher.hide();
      },
      () => {
        if (current?.key !== ctx.key || version !== generation) return;
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
    if (!settingsReady || !readButton) return;
    // A repository page is read on request only: nothing is fetched until Read docs is chosen.
    // Hiding the button there hides it for the whole repository.
    if ('view' in ctx) launcher.show(ctx.repository, null, () => openRepository(loadRepository(ctx)));
    else present(ctx);
  };

  const reloadSettings = async () => {
    const version = ++generation;
    settingsReady = false;
    launcher.hide();
    try {
      const settings = await loadSettings(true);
      if (version !== generation) return;
      readButton = settings.readButton;
      settingsFailed = false;
    } catch {
      if (version !== generation) return;
      readButton = false;
      settingsFailed = true;
    }
    settingsReady = true;
    current = null;
    refresh();
  };
  let ready = reloadSettings();

  const pageState = (): PageState => {
    if (settingsFailed) return { kind: 'unavailable', label: 'Your settings could not be read. Open Settings and try again.' };
    const ctx = detectContext(location, document) ?? detectRepository(location, document);
    if (!ctx) return { kind: 'unavailable', label: 'Open a pull or merge request, or a repository, to read with Galley.' };
    const repository = ctx.platform === 'github' ? `${ctx.owner}/${ctx.repo}` : ctx.projectPath;
    if ('view' in ctx) return { kind: 'repository', label: repository };
    const request = ctx.platform === 'github' ? `Pull request #${ctx.number}` : `Merge request !${ctx.iid}`;
    return { kind: 'review', label: `${request} in ${repository}` };
  };

  chrome.runtime.onMessage.addListener((message, sender, reply) => {
    if (sender.id !== chrome.runtime.id || sender.tab || (message?.type !== PAGE_STATE && message?.type !== OPEN_READER)) return false;
    const respond = async () => {
      // Settings can change again while a previous read is still pending.
      let loading: Promise<void>;
      do {
        loading = ready;
        await loading;
      } while (loading !== ready);
      const state = pageState();
      if (message.type === OPEN_READER && state.kind !== 'unavailable') {
        const existing = document.querySelector<HTMLElement>('#galley-reader, #galley-repo-reader, #galley-reader-dev, #galley-repo-reader-dev');
        if (existing) {
          const focused = existing.shadowRoot?.activeElement as HTMLElement | null;
          (focused ?? existing.shadowRoot?.querySelector<HTMLElement>('.mr-root') ?? existing).focus({ preventScroll: true });
        } else {
          const ctx = detectContext(location, document) ?? detectRepository(location, document)!;
          if ('view' in ctx) openRepository(loadRepository(ctx));
          else {
            // A rejected cached load is retried only on this explicit action.
            const loading = sourceFor(ctx);
            openReader(loading);
          }
        }
      }
      reply(state);
    };
    void respond();
    return true;
  });
  // GitHub and GitLab are single-page apps: watch for in-app navigation.
  document.addEventListener('turbo:load', refresh);
  window.addEventListener('popstate', refresh);
  setInterval(() => (location.href === href ? launcher.reattach() : refresh()), 1000);

  // A token saved in the toolbar popup for this site takes effect without reloading the page.
  chrome.storage?.onChanged?.addListener((changes) => {
    if (changes[SETTINGS_KEY]) {
      ready = reloadSettings();
      return;
    }
    const signal = changes[TOKENS_CHANGED]?.newValue as Partial<TokensChanged> | undefined;
    if (signal?.origin !== location.origin || !current) return;
    // A pending settings read already invalidated the old launcher and will refresh next.
    // Do not invalidate that read when a token changes at the same time.
    if (settingsReady) generation++;
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
