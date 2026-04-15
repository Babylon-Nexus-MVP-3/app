/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/src/**/*.test.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  setupFiles: ["./jest.env.setup.cjs"],
  testTimeout: 30000,
  // Run suites serially — all tests share a single MongoDB test database so
  // parallel workers cause deleteMany calls to race across suites.
  maxWorkers: 1,
  transformIgnorePatterns: ["node_modules/(?!(expo-server-sdk)/)"],
};
