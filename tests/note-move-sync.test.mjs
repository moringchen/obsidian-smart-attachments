import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createNoteMovePlan, syncMovedManagedNote } = require('./helpers/note-move-sync.cjs');
const { formatResourceSyncSummary } = require('./helpers/resource-sync-utils.cjs');

test('moves the resource directories when the source directory has no sibling managed notes', () => {
  const plan = createNoteMovePlan({
    oldDir: 'notes/a',
    newDir: 'notes/b',
    currentFileLinks: ['resources/images/notes/a/a.png'],
    siblingManagedNoteCount: 0
  });

  assert.equal(plan.mode, 'move-directory');
});

test('moves resource directories and rewrites links when the source directory has no sibling managed notes', async () => {
  const operations = [];
  const note = { path: 'test2/OpenSpec[OPSX] 1.md' };
  const vault = {
    adapter: {
      getBasePath: () => '/vault/root',
      async exists(path) {
        return path === '/vault/root/../resources/images/test';
      },
      async mkdir(path) {
        operations.push(['mkdir', path]);
      },
      async rename(from, to) {
        operations.push(['rename', from, to]);
      },
      async list() {
        return { files: [], folders: [] };
      },
      async rmdir(path, recursive) {
        operations.push(['rmdir', path, recursive]);
      }
    },
    getFiles() {
      return [note];
    },
    async cachedRead() {
      return '![[resources/images/test/image.png]]';
    },
    async modify(file, content) {
      operations.push(['modify', file.path, content]);
    }
  };

  const summary = await syncMovedManagedNote(vault, note, 'test/OpenSpec[OPSX] 1.md', 'resources');

  assert.deepEqual(summary.movedDirectories, [
    { from: 'resources/images/test', to: 'resources/images/test2' }
  ]);
  assert.deepEqual(operations, [
    ['mkdir', '/vault/root/../resources/images'],
    ['rename', '/vault/root/../resources/images/test', '/vault/root/../resources/images/test2'],
    ['modify', 'test2/OpenSpec[OPSX] 1.md', '![[resources/images/test2/image.png]]']
  ]);
});

test('copies linked resources when the source directory still has sibling managed notes', () => {
  const plan = createNoteMovePlan({
    oldDir: 'notes/a',
    newDir: 'notes/b',
    currentFileLinks: [
      'resources/images/notes/a/a.png',
      'resources/files/notes/a/doc.pdf'
    ],
    siblingManagedNoteCount: 2
  });

  assert.equal(plan.mode, 'copy-links');
  assert.deepEqual(plan.copyOperations, [
    { from: 'resources/images/notes/a/a.png', to: 'resources/images/notes/b/a.png' },
    { from: 'resources/files/notes/a/doc.pdf', to: 'resources/files/notes/b/doc.pdf' }
  ]);
});

test('builds target paths under the new directory for each copied resource', () => {
  const plan = createNoteMovePlan({
    oldDir: 'notes/a',
    newDir: 'notes/c',
    currentFileLinks: ['resources/images/notes/a/a.png'],
    siblingManagedNoteCount: 1
  });

  assert.deepEqual(plan.copyOperations, [
    { from: 'resources/images/notes/a/a.png', to: 'resources/images/notes/c/a.png' }
  ]);
});

test('keeps the same resource path when the linked resource is already under a deeper subdirectory than the moved note', () => {
  const plan = createNoteMovePlan({
    oldDir: '可交易',
    newDir: '可交易/可交易',
    currentFileLinks: ['resources/images/经济/可交易/image.png'],
    siblingManagedNoteCount: 1
  });

  assert.deepEqual(plan.copyOperations, [
    { from: 'resources/images/经济/可交易/image.png', to: 'resources/images/经济/可交易/image.png' }
  ]);
});

test('merges moved resources into an existing target resource directory', async () => {
  const operations = [];
  const note = { path: 'test/OpenSpec[OPSX] 1.md' };
  const vault = {
    adapter: {
      getBasePath: () => '/vault/root',
      async exists(path) {
        return path === '/vault/root/../resources/images/test3/test2'
          || path === '/vault/root/../resources/images/test';
      },
      async mkdir(path) {
        operations.push(['mkdir', path]);
      },
      async rename(from, to) {
        operations.push(['rename', from, to]);
      },
      async list() {
        return { files: ['/vault/root/../resources/images/test3/test2/image.png'], folders: [] };
      },
      async rmdir(path, recursive) {
        operations.push(['rmdir', path, recursive]);
      }
    },
    getFiles() {
      return [note];
    },
    async cachedRead() {
      return '![[resources/images/test3/test2/image.png]]';
    },
    async modify(file, content) {
      operations.push(['modify', file.path, content]);
    }
  };

  const summary = await syncMovedManagedNote(vault, note, 'test3/test2/OpenSpec[OPSX] 1.md', 'resources');

  assert.deepEqual(summary.movedDirectories, [
    { from: 'resources/images/test3/test2', to: 'resources/images/test' }
  ]);
  assert.deepEqual(operations, [
    ['rename', '/vault/root/../resources/images/test3/test2/image.png', '/vault/root/../resources/images/test/image.png'],
    ['rmdir', '/vault/root/../resources/images/test3/test2', false],
    ['modify', 'test/OpenSpec[OPSX] 1.md', '![[resources/images/test/image.png]]']
  ]);
});

test('formats sync summary text', () => {
  assert.equal(
    formatResourceSyncSummary({
      movedDirectories: [],
      copiedFiles: [{ from: 'a', to: 'b' }],
      updatedLinks: 1,
      missingResources: [],
      failedTargets: []
    }),
    '已复制 1 个资源，已更新 1 个链接'
  );
});
