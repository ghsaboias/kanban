export default {
  preset: "ts-jest/presets/default-esm",
  extensionsToTreatAsEsm: [".ts"],
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  // Enable parallel execution for faster test runs
  maxWorkers: "50%",
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        useESM: true,
      },
    ],
  },
  coverageDirectory: "coverage",
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "<rootDir>/src/index.ts",
    "<rootDir>/src/socket/",
    "<rootDir>/src/routes/cards.ts",
    "<rootDir>/src/routes/columns.ts",
    "<rootDir>/src/routes/users.ts",
  ],
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts", "!src/index.ts"],
  setupFilesAfterEnv: ["<rootDir>/src/__tests__/setup.ts"],
  testTimeout: 10000,
  // Enable isolated database per worker
  globalSetup: "<rootDir>/src/__tests__/globalSetup.ts",
  globalTeardown: "<rootDir>/src/__tests__/globalTeardown.ts",
};
