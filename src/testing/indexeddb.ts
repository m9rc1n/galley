// Vitest setup for projects that use the extension's IndexedDB (GitHub tokens): a fresh in-memory
// database for every test, so no test sees another's data.
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach } from 'vitest';

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});
