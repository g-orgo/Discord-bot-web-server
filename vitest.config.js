import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 30000, // MongoMemoryServer can be slow to start
    hookTimeout: 30000,
  },
});
