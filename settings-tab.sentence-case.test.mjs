import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.dirname(fileURLToPath(import.meta.url));

async function readProjectFile(relativePath) {
  return readFile(path.join(repoRoot, relativePath), 'utf8');
}

test('settings source uses sentence case for the resource placeholder', async () => {
  const source = await readProjectFile('src/settings-tab.ts');

  assert.match(source, /\.setPlaceholder\(['"]Resources['"]\)/);
});

test('bundled plugin uses sentence case for the resource placeholder', async () => {
  const bundle = await readProjectFile('main.js');

  assert.match(bundle, /setPlaceholder\(["']Resources["']\)/);
});
