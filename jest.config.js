/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  // Mirror the tsconfig path aliases so tests can import @core/@modules/etc.
  moduleNameMapper: {
    "^@core/(.*)$": "<rootDir>/src/core/$1",
    "^@modules/(.*)$": "<rootDir>/src/modules/$1",
    "^@config/(.*)$": "<rootDir>/src/core/config/$1",
    "^generated/(.*)$": "<rootDir>/src/generated/$1",
    "^routes/(.*)$": "<rootDir>/src/routes/$1",
  },
  clearMocks: true,
};
