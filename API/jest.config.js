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
  // Reduce timeout to prevent hanging
  testTimeout: 10000,
  // Detect open handles to help debug hanging
  detectOpenHandles: true
};