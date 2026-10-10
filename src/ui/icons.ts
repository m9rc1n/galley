const svg = (body: string) =>
  `<svg class="mr-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const icons = {
  settings: svg('<path d="M4 8h16M4 16h16"/><circle cx="9" cy="8" r="2.4" fill="var(--bg)"/><circle cx="15" cy="16" r="2.4" fill="var(--bg)"/>'),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  minus: svg('<path d="M5 12h14"/>'),
  check: svg('<path d="M5 12.5l4.2 4.2L19 7"/>'),
  layout: svg('<rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="M8.5 5v14M15.5 5v14"/>'),
  keyboard: svg('<rect x="3" y="6.5" width="18" height="11" rx="2"/><path d="M7 10.25h.01M10.5 10.25h.01M14 10.25h.01M17 10.25h.01M8 14h8"/>'),
  comment: svg('<path d="M5 18.5V6.8A1.8 1.8 0 0 1 6.8 5h10.4A1.8 1.8 0 0 1 19 6.8v7.4a1.8 1.8 0 0 1-1.8 1.8H9.2z"/><path d="M12 8.2v4.6M9.7 10.5h4.6"/>'),
  reply: svg('<path d="M9.5 6.5L4.5 11l5 4.5"/><path d="M4.5 11h9a6 6 0 0 1 6 6v1"/>'),
  viewed: svg('<circle cx="12" cy="12" r="8.25"/><path d="M8.4 12.3l2.5 2.5 4.8-5.1"/>'),
  chevronDown: svg('<path d="M6 9l6 6 6-6"/>'),
  chevronLeft: svg('<path d="M15 6l-6 6 6 6"/>'),
  chevronRight: svg('<path d="M9 6l6 6-6 6"/>'),
  up: svg('<path d="M18 15l-6-6-6 6"/>'),
  down: svg('<path d="M6 9l6 6 6-6"/>'),
  map: svg('<circle cx="6" cy="12" r="2.4"/><circle cx="18" cy="6" r="2.4"/><circle cx="18" cy="18" r="2.4"/><path d="M8.2 10.9l7.6-3.8M8.2 13.1l7.6 3.8"/>'),
  refresh: svg('<path d="M19 12a7 7 0 1 1-2.05-4.95"/><path d="M19.2 4.6v3.6h-3.6"/>'),
  note: svg('<path d="M5 19h3.5L19 8.5 15.5 5 5 15.5z"/><path d="M13.5 7l3.5 3.5"/>'),
  review: svg('<rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M9 8.5h6M9 12h6M9 15.5h3"/>'),
  book: svg('<path d="M3 5.5C5.5 4 8.5 4 12 6c3.5-2 6.5-2 9-.5v13c-2.5-1.5-5.5-1.5-9 .5-3.5-2-6.5-2-9-.5z"/><path d="M12 6v13"/>'),
};
