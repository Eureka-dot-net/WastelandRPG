const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  transform: {
    ...tsJestTransformCfg,
  },
  // Force Jest to exit after tests complete
  forceExit: true,
  // Increased timeout to allow for database connection
  testTimeout: 20000,
  // Detect open handles to help debug hanging
  detectOpenHandles: true
};