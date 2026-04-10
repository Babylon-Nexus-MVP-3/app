require("dotenv").config({ path: require("path").resolve(__dirname, ".env") });

/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/src/**/*.test.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  testTimeout: 30000,
};

