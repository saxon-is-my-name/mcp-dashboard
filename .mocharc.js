module.exports = {
  require: [
    'ts-node/register',
    '@babel/register'
  ],
  extension: ['ts', 'tsx'],
  // Spec pattern is defined per test command in package.json
  // to avoid loading VS Code integration tests in unit test runs
};
