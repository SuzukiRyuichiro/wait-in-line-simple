import { test, expect } from "./support/fixtures";

// Proves the stack is wired: Playwright → Rails → Mongo reset works.
// Replace with real user-flow tests as you build (see docs/STEPS.local.md).
test("the app is up", async ({ request }) => {
  const response = await request.get("/up");
  expect(response.ok()).toBe(true);
});
