require('ts-node').register({
  transpileOnly: true,
  compilerOptions: { module: 'commonjs' }
});
require('tsconfig-paths/register');

module.exports = require('../../src/utils/resource-sync-utils.ts');
