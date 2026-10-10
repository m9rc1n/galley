/** Extension-only messages. The page never supplies a source, URL or platform request. */
export const PAGE_STATE = 'galley:page-state';
export const OPEN_READER = 'galley:open-reader';
export const READ_COMMAND = 'read-page';

export interface PageState {
  kind: 'review' | 'repository' | 'unavailable';
  label: string;
}
