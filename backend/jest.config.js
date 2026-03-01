module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'services/**/*.js',
    'recipe-sources/**/*.js',
    'routes/**/*.js',
    '!**/node_modules/**'
  ],
  testTimeout: 30000
};
