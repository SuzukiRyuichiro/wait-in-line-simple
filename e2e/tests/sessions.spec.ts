import {
  test, expect, joinWaitlist, fillJoinForm, submitJoinForm, newBrowserPage, findParties,
  tableReady, checkInButton, enjoyMeal, thanks,
} from "./support/fixtures";

test("the same browser is taken back to its party when it opens the home page", async ({ page }) => {
  await joinWaitlist(page, { name: "Aiko", email: "aiko@example.com", size: 2 });
  const partyUrl = page.url();

  await page.goto("/");
  await expect(page).toHaveURL(partyUrl);
});

test("a different browser does not see someone else's party on the home page", async ({ page, browser }) => {
  await joinWaitlist(page, { name: "Aiko", email: "aiko@example.com", size: 2 });

  const other = await newBrowserPage(browser);
  await other.goto("/");
  await expect(other.getByRole("heading", { name: "Join the waitlist" })).toBeVisible();
});

test("joining again with the same email returns the existing party", async ({ page, browser }) => {
  await joinWaitlist(page, { name: "Aiko", email: "aiko@example.com", size: 2 });
  const partyUrl = page.url();

  // E.g. the diner switched to their phone. Upper case in the email doesn't matter.
  const phone = await newBrowserPage(browser);
  await fillJoinForm(phone, { name: "Aiko", email: "AIKO@example.com", size: 2 });
  await submitJoinForm(phone);

  await expect(phone).toHaveURL(partyUrl);
  await expect(phone.getByText("You are already in the queue")).toBeVisible();
  expect(await findParties()).toHaveLength(1);
});

test("status opened in a second browser stays in sync with the first", async ({ page, browser }) => {
  await joinWaitlist(page, { name: "Aiko", email: "aiko@example.com", size: 3 });

  const phone = await newBrowserPage(browser);
  await phone.goto(page.url());
  await expect(tableReady(phone)).toBeVisible();
  await expect(tableReady(page)).toBeVisible();

  // Check in on the phone; the laptop updates on its own (no reload).
  await checkInButton(phone).click();
  await expect(enjoyMeal(phone)).toBeVisible();
  await expect(enjoyMeal(page)).toBeVisible();

  // Both end up on the end screen.
  await expect(thanks(page)).toBeVisible();
  await expect(thanks(phone)).toBeVisible();
});

test("checking in from two browsers at the same moment seats the party once", async ({ page, browser }) => {
  await joinWaitlist(page, { name: "Aiko", email: "aiko@example.com", size: 4 });
  const phone = await newBrowserPage(browser);
  await phone.goto(page.url());
  await expect(tableReady(page)).toBeVisible();
  await expect(tableReady(phone)).toBeVisible();

  await Promise.all([checkInButton(page).click(), checkInButton(phone).click()]);
  await Promise.all([page, phone].map((p) => expect(enjoyMeal(p)).toBeVisible()));

  const notices = await Promise.all([page, phone].map((p) => p.locator("main > article").first().textContent()));
  expect(notices.map((text) => text?.trim()).sort()).toEqual([
    "You're already checked in.",
    "You're checked in. Have a nice meal",
  ]);
  const [party] = await findParties({ email: "aiko@example.com" });
  expect(party.status).toBe("seated");
});

test("after the meal, the diner can join the line again with the same email", async ({ page }) => {
  await joinWaitlist(page, { name: "Aiko", email: "aiko@example.com", size: 1 });
  const firstVisit = page.url();
  await expect(tableReady(page)).toBeVisible();
  await checkInButton(page).click();
  await expect(thanks(page)).toBeVisible();

  // The cookie no longer points to an active party, so the form shows.
  await page.getByRole("button", { name: "Back to home" }).click();
  await expect(page.getByRole("heading", { name: "Join the waitlist" })).toBeVisible();

  await joinWaitlist(page, { name: "Aiko", email: "aiko@example.com", size: 1 });
  expect(page.url()).not.toBe(firstVisit);
  expect(await findParties({ email: "aiko@example.com" })).toHaveLength(2);
});
