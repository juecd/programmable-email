export default {
  extensionsToTreatAsEsm: ['.ts'],
  moduleFileExtensions: ['js', 'ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { useESM: true }]
  },
  testMatch: ['**/src/**/*.test.ts'], // Point to src directory
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1' // Handle .js extensions in imports
  }
};