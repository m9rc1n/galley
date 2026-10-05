import { icons } from './icons.ts';

const CSS = `
:host { all: initial; }
.wrap {
  position: fixed; right: 24px; bottom: 24px; z-index: 2147483000;
  animation: rise .35s cubic-bezier(.2, .8, .2, 1);
}
.launch {
  display: inline-flex; align-items: center; gap: 9px; height: 44px; padding: 0 16px 0 15px;
  border: 0; border-radius: 999px; background: #191919; color: #fff; cursor: pointer;
  font: 600 14px/1 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; letter-spacing: .01em;
  box-shadow: 0 10px 28px rgba(0, 0, 0, .2), 0 2px 6px rgba(0, 0, 0, .12);
  transition: transform .15s ease, box-shadow .15s ease;
}
.launch:hover { transform: translateY(-1px); box-shadow: 0 14px 34px rgba(0, 0, 0, .24), 0 3px 8px rgba(0, 0, 0, .14); }
.launch:focus-visible { outline: 2px solid #1a8917; outline-offset: 3px; }
.mr-icon { width: 19px; height: 19px; }
.count {
  display: inline-grid; place-items: center; min-width: 20px; height: 20px; padding: 0 6px; box-sizing: border-box;
  border-radius: 999px; background: rgba(255, 255, 255, .17); font-size: 12px; font-variant-numeric: tabular-nums;
}
.launch.is-error .count { background: #c4413a; }
.wrap.dev { bottom: 80px; }
.dev-tag {
  padding: 2px 6px; border-radius: 999px; background: #f08a24; color: #fff;
  font-size: 10px; letter-spacing: .06em;
}
.dismiss {
  position: absolute; top: -7px; right: -7px; display: none; width: 20px; height: 20px; padding: 0;
  border: 0; border-radius: 50%; background: #fff; color: #191919; cursor: pointer;
  font: 600 13px/20px system-ui, sans-serif; box-shadow: 0 1px 4px rgba(0, 0, 0, .3);
}
.wrap:hover .dismiss, .dismiss:focus-visible { display: block; }
@media (prefers-color-scheme: dark) {
  .launch { background: #f2f2f2; color: #121212; }
  .count { background: rgba(0, 0, 0, .1); }
}
@keyframes rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .wrap { animation: none; } .launch { transition: none; } }
`;

/** The floating "Read" button shown on pull/merge requests that change markdown files. */
export class Launcher {
  private host: HTMLElement | null = null;
  private dismissed = new Set<string>();

  show(key: string, count: number, onOpen: () => void, error = false): void {
    if (this.dismissed.has(key)) return;
    this.hide();
    const host = document.createElement('div');
    host.id = __MREADIE_DEV__ ? 'mreadie-launcher-dev' : 'mreadie-launcher';
    const shadow = host.attachShadow({ mode: 'open' });
    const dev = __MREADIE_DEV__ ? '<span class="dev-tag">DEV</span>' : '';
    shadow.innerHTML = `<style>${CSS}</style><div class="wrap${__MREADIE_DEV__ ? ' dev' : ''}"><button class="launch">${icons.book}<span>Read</span>${dev}<span class="count"></span></button><button class="dismiss" aria-label="Hide for this page" title="Hide for this page">×</button></div>`;
    const launch = shadow.querySelector<HTMLButtonElement>('.launch')!;
    shadow.querySelector('.count')!.textContent = error ? '!' : String(count);
    launch.classList.toggle('is-error', error);
    launch.title = error
      ? 'mreadie could not load the documents. Click for details.'
      : `Read ${count} changed markdown document${count === 1 ? '' : 's'} as articles`;
    launch.addEventListener('click', onOpen);
    shadow.querySelector('.dismiss')!.addEventListener('click', () => {
      this.dismissed.add(key);
      this.hide();
    });
    document.documentElement.append(host);
    this.host = host;
  }

  hide(): void {
    this.host?.remove();
    this.host = null;
  }

  /** Single-page navigations can wipe nodes we added; put the button back if that happened. */
  reattach(): void {
    if (this.host && !this.host.isConnected) document.documentElement.append(this.host);
  }
}
