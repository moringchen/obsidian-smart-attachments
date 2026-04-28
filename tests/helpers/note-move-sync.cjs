require('ts-node').register({
  transpileOnly: true,
  compilerOptions: { module: 'commonjs' }
});
require('tsconfig-paths/register');

module.exports = require('../../src/services/note-move-sync.ts');
