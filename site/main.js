// Small, optional enhancements. Navigation, installation and the demo work without this file.
const reader = document.querySelector('#illustrated-reader');
const modes = document.querySelectorAll('[data-mode]');
for (const button of modes) {
  button.addEventListener('click', () => {
    const clean = button.dataset.mode === 'clean';
    reader.classList.toggle('is-clean', clean);
    for (const option of modes) option.setAttribute('aria-pressed', String(option === button));
  });
}

const previews = {
  changes: {
    image: 'assets/reader-changes.jpg',
    alt: 'The Galley reader showing a rendered RFC with inline word changes and a review conversation.',
    caption: 'The whole thought, with the edits right where they belong. Actual Galley reader, sample review.',
  },
  tables: {
    image: 'assets/reader-tables.jpg',
    alt: 'The Galley reader comparing a Markdown table cell by cell, with changes highlighted in place.',
    caption: 'Tables become tables. Edits stay with their cells. Actual Galley reader, sample review.',
  },
  dark: {
    image: 'assets/reader-dark.jpg',
    alt: 'The Galley reader in dark theme and clean reading mode, with no change markers.',
    caption: 'A clean read, in your kind of light. Light, sepia, and dark themes. Actual Galley reader, sample review.',
  },
};
const image = document.querySelector('#preview-image');
const caption = document.querySelector('#preview-caption');
const buttons = document.querySelectorAll('[data-preview]');
for (const button of buttons) {
  button.addEventListener('click', () => {
    const preview = previews[button.dataset.preview];
    image.src = preview.image;
    image.alt = preview.alt;
    caption.textContent = preview.caption;
    for (const option of buttons) option.setAttribute('aria-pressed', String(option === button));
  });
}
