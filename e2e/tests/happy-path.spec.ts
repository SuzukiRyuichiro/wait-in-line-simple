import { test, expect, joinWaitlist, emailsTo, tableReady, checkInButton, enjoyMeal, thanks } from "./support/fixtures";

// The whole journey of one diner: join → table ready (+ email) → check in → service → end screen.
test("a diner joins, gets an email, checks in, is served and sees the end screen", async ({ page }) => {
  await joinWaitlist(page, { name: "Aiko", email: "aiko@example.com", size: 2 });
  await expect(page.getByRole("heading", { name: "Hi Aiko" })).toBeVisible();

  // The restaurant is empty, so the table is ready on the next tick.
  await expect(tableReady(page)).toBeVisible();

  // The table-ready email links back to this party's page.
  await expect.poll(() => emailsTo("aiko@example.com")).toHaveLength(1);
  const [email] = await emailsTo("aiko@example.com");
  expect(email).toContain(new URL(page.url()).pathname);

  await checkInButton(page).click();
  await expect(page.getByText("You're checked in. Have a nice meal")).toBeVisible();
  await expect(enjoyMeal(page)).toBeVisible();
  await expect(page.getByText(/Service ends in/)).toBeVisible();

  // Party of 2 × 1s per person in E2E. The page switches to the end screen without a reload.
  await expect(thanks(page)).toBeVisible();
  // "Back to home" is a link styled as a button (role="button").
  await expect(page.getByRole("button", { name: "Back to home" })).toBeVisible();
});

test("the server's validation errors are shown on the form, keeping what was typed", async ({ page }) => {
  await page.goto("/");
  // Skip the browser's own required-field check so the request reaches the server.
  await page.locator("form").evaluate((form: HTMLFormElement) => { form.noValidate = true; });
  await page.getByLabel("Email").fill("aiko@example.com");
  await page.getByLabel("Party size").fill("2");
  await page.getByRole("button", { name: "Join the queue" }).click();

  await expect(page.getByText("Name can't be blank")).toBeVisible();
  await expect(page.getByLabel("Email")).toHaveValue("aiko@example.com");
});
