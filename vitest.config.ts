import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // A fixed zone with daylight saving time, so the calendar tests behave the same everywhere.
    env: { TZ: "Europe/Oslo" },
    coverage: {
      include: ["src/**"],
      reporter: ["text", "lcov"],
      thresholds: { lines: 100, functions: 100, branches: 100, statements: 100 },
    },
  },
});
