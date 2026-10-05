const svg = (body: string) =>
  `<svg class="mr-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const icons = {
  back: svg('<path d="M15 18l-6-6 6-6"/>'),
  chevronDown: svg('<path d="M6 9l6 6 6-6"/>'),
  up: svg('<path d="M18 15l-6-6-6 6"/>'),
  down: svg('<path d="M6 9l6 6 6-6"/>'),
  arrowRight: svg('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  book: svg('<path d="M3 5.5C5.5 4 8.5 4 12 6c3.5-2 6.5-2 9-.5v13c-2.5-1.5-5.5-1.5-9 .5-3.5-2-6.5-2-9-.5z"/><path d="M12 6v13"/>'),
};
