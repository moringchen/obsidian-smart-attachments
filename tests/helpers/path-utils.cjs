require('ts-node').register({
  transpileOnly: true,
  compilerOptions: { module: 'commonjs' }
});
require('tsconfig-paths/register');

const { PathUtils } = require('../../src/utils/path-utils.ts');

module.exports = {
  getManagedResourceDirPrefixes: PathUtils.getManagedResourceDirPrefixes,
  mapManagedResourceDir: PathUtils.mapManagedResourceDir,
  resolveManagedResourcePath: PathUtils.resolveManagedResourcePath.bind(PathUtils)
};
