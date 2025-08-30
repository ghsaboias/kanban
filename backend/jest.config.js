module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  // Run tests sequentially to avoid cross-file DB cleanup races
  maxWorkers: 1,
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/src/index.ts',
    '<rootDir>/src/socket/',
    '<rootDir>/src/routes/cards.ts',
    '<rootDir>/src/routes/columns.ts',
    '<rootDir>/src/routes/users.ts',
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
  ],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  testTimeout: 10000,
};
