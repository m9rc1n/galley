// Small, optional enhancements. Navigation, installation, the FAQ and the demo work without this file.

// The illustrated review: the same change as a raw diff, in Galley, or clean.
const reader = document.querySelector('#illustrated-reader');
const modes = document.querySelectorAll('[data-mode]');
for (const button of modes) {
  button.addEventListener('click', () => {
    reader.classList.toggle('is-clean', button.dataset.mode === 'clean');
    reader.classList.toggle('is-diff', button.dataset.mode === 'diff');
    for (const option of modes) option.setAttribute('aria-pressed', String(option === button));
  });
}

// Real reader screenshots, one feature at a time.
const previews = {
  changes: {
    image: 'assets/reader-changes.jpg',
    alt: 'The Galley reader showing a rendered RFC with edits marked in the text, a contents column and a comment thread in the margin.',
    caption: 'Read the document with edits in context, a contents list on the left and review comments on the right.',
  },
  comments: {
    image: 'assets/reader-comments.jpg',
    alt: 'A comment being written beside the paragraph it is about, under an existing thread with a reply.',
    caption: 'Select text or point at a paragraph to add a comment beside it. Reply in the same thread, with the relevant text still in view.',
  },
  code: {
    image: 'assets/reader-code.jpg',
    alt: 'A TypeScript file in Galley with old and new line numbers, syntax colours, a wrapped long line and a comment beside line 8.',
    caption: 'Turn on Code files to review source changes with line numbers, syntax colours, wrapped lines and comments beside the code.',
  },
  tables: {
    image: 'assets/reader-tables.jpg',
    alt: 'The Galley reader comparing a Markdown table cell by cell, with changes highlighted in place.',
    caption: 'Read tables as tables, with each edit shown in its cell. Changes to paragraph wrapping do not appear as text edits.',
  },
  diagram: {
    image: 'assets/reader-diagram.jpg',
    alt: 'A Mermaid diagram drawn in the reading palette, with its before and after versions.',
    caption: 'Compare the old and new versions of a Mermaid diagram. Open either version to zoom in and explore the details.',
  },
  dark: {
    image: 'assets/reader-dark.jpg',
    alt: 'The Galley reader in the warm Night palette and Clean mode, with quiet change bars in the margin.',
    caption: 'Read the updated version in Clean mode, shown here with the Night palette. Change indicators stay in the margin.',
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

// Before and after: the range input moves the divider (by pointer or keyboard).
const compare = document.querySelector('.compare-frame');
const range = compare?.querySelector('.compare-range');
if (compare && range) {
  compare.classList.add('is-interactive');
  const move = () => compare.style.setProperty('--split', `${range.value}%`);
  range.addEventListener('input', move);
  move();
}
