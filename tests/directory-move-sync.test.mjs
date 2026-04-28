import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  getManagedResourceDirPrefixes,
  mapManagedResourceDir,
  resolveManagedResourcePath
} = require('./helpers/path-utils.cjs');
const { createDirectoryMovePlan, rewriteDirectoryMoveContent } = require('./helpers/directory-move-sync.cjs');

test('returns all managed resource prefixes for a note directory', () => {
  assert.deepEqual(getManagedResourceDirPrefixes('notes/a'), [
    'resources/images/notes/a',
    'resources/audio/notes/a',
    'resources/videos/notes/a',
    'resources/documents/notes/a',
    'resources/archives/notes/a',
    'resources/code/notes/a',
    'resources/files/notes/a'
  ]);
});

test('maps managed resource directories from old dir to new dir', () => {
  assert.equal(
    mapManagedResourceDir('resources/images/notes/a', 'notes/a', 'notes/b'),
    'resources/images/notes/b'
  );
});

test('resolves managed resource paths to the external resource root', () => {
  const path = resolveManagedResourcePath(
    {
      adapter: { getBasePath: () => '/vault/root' },
      getName: () => 'vault'
    },
    'resources',
    'resources/images/notes/a/a.png'
  );

  assert.equal(path, '/vault/root/../resources/images/notes/a/a.png');
});

test('creates move operations and rewrite targets for directory moves', () => {
  const plan = createDirectoryMovePlan({
    oldDir: 'notes/a',
    newDir: 'notes/b',
    managedFiles: ['notes/b/file.md', 'notes/b/daily'],
    availableResourceDirs: [
      'resources/images/notes/a',
      'resources/files/notes/a'
    ]
  });

  assert.deepEqual(plan.directoryMoves, [
    { from: 'resources/images/notes/a', to: 'resources/images/notes/b' },
    { from: 'resources/files/notes/a', to: 'resources/files/notes/b' }
  ]);
  assert.deepEqual(plan.filesToRewrite, ['notes/b/file.md', 'notes/b/daily']);
});

test('rewrite helper reports one updated link for one managed prefix change', () => {
  const rewrite = rewriteDirectoryMoveContent(
    '![[resources/files/notes/a/doc.pdf]]',
    'notes/a',
    'notes/b'
  );

  assert.equal(rewrite.updatedCount, 1);
});
