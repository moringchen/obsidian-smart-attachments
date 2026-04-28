import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { extractManagedResourceLinks, rewriteManagedResourcePrefix, listManagedResourcePaths } = require('./helpers/managed-link-utils.cjs');

test('extracts wikilinks and markdown links under resources', () => {
  const content = [
    '![[resources/images/notes/a.png]]',
    '![doc](resources/documents/notes/a.pdf)',
    '[external](https://example.com)'
  ].join('\n');

  assert.deepEqual(
    extractManagedResourceLinks(content).map(link => link.resourcePath),
    ['resources/images/notes/a.png', 'resources/documents/notes/a.pdf']
  );
});

test('rewrites only managed resource prefixes', () => {
  const content = '![[resources/images/notes/a/file.png]]\n![[other/path.png]]';
  const result = rewriteManagedResourcePrefix(content, 'notes/a', 'notes/b');

  assert.match(result.content, /resources\/images\/notes\/b\/file\.png/);
  assert.match(result.content, /other\/path\.png/);
  assert.equal(result.updatedCount, 1);
});

test('lists managed resource paths from note content', () => {
  const content = '![[resources/images/notes/a/file.png]]\n![doc](resources/files/notes/a/doc.pdf)';
  assert.deepEqual(listManagedResourcePaths(content), [
    'resources/images/notes/a/file.png',
    'resources/files/notes/a/doc.pdf'
  ]);
});
