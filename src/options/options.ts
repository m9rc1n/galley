import { loadSettings, updateSettings } from '../ui/settings.ts';

const control = document.querySelector<HTMLInputElement>('#read-button')!;
const status = document.querySelector<HTMLElement>('#status')!;
const retry = document.querySelector<HTMLButtonElement>('#retry')!;
let saved = true;

function showChoice(value: boolean): void {
  control.checked = value;
  control.setAttribute('aria-checked', String(value));
}

async function refresh(): Promise<void> {
  control.disabled = true;
  retry.hidden = true;
  try {
    saved = (await loadSettings(true)).readButton;
    showChoice(saved);
    control.disabled = false;
    status.textContent = '';
  } catch {
    status.textContent = 'Your settings could not be read. Try again before changing them.';
    retry.hidden = false;
  }
}

control.addEventListener('change', async () => {
  const readButton = control.checked;
  showChoice(readButton);
  control.disabled = true;
  try {
    await updateSettings({ readButton }, true);
    saved = readButton;
    status.textContent = readButton ? 'The Read button is on.' : 'The Read button is off. Open the reader from the toolbar or shortcut.';
  } catch {
    showChoice(saved);
    status.textContent = 'Your change was not saved. Try again.';
  }
  control.disabled = false;
});
retry.addEventListener('click', () => void refresh());
void refresh();
