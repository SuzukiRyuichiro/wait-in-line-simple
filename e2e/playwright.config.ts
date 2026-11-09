import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  // There is one shared queue, so tests running in parallel would see each
  // other's parties. Run one at a time; each test starts from an empty DB.
  fullyParallel: false,
  workers: 1,
  // The page polls every 3s and the scheduler ticks every 1s, so status changes
  // can take a few seconds to show up. Service is 1s per person in E2E.
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    // In Docker, compose sets BASE_URL=http://web-e2e:3000.
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
