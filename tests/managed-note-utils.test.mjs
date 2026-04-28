import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { isManagedNoteLikePath } = require('./helpers/managed-note-utils.cjs');

test('treats markdown files as managed notes', () => {
  assert.equal(isManagedNoteLikePath('notes/example.md'), true);
});

test('treats extensionless files as managed notes', () => {
  assert.equal(isManagedNoteLikePath('notes/daily-note'), true);
  assert.equal(isManagedNoteLikePath('notes/daily/2026-04-28'), true);
});

test('ignores files with other extensions', () => {
  assert.equal(isManagedNoteLikePath('notes/diagram.canvas'), false);
  assert.equal(isManagedNoteLikePath('notes/image.png'), false);
});
