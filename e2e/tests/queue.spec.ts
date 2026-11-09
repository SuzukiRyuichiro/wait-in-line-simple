import {
  test, expect, joinWaitlist, newBrowserPage, findParties,
  tableReady, checkInButton, enjoyMeal, thanks,
} from "./support/fixtures";

test("a party waits while the restaurant is full and is called when seats free up", async ({ page, browser }) => {
  await joinWaitlist(page, { name: "Big", email: "big@example.com", size: 10 });
  await expect(tableReady(page)).toBeVisible();
  await checkInButton(page).click();
  await expect(enjoyMeal(page)).toBeVisible();

  const second = await newBrowserPage(browser);
  await joinWaitlist(second, { name: "Small", email: "small@example.com", size: 2 });
  await expect(second.getByRole("heading", { name: "You're 1st in line" })).toBeVisible();

  // Big party leaves after 10s; the waiting party is called without reloading the page.
  await expect(thanks(page)).toBeVisible();
  await expect(tableReady(second)).toBeVisible();
});

test("a smaller party never skips the party at the front of the line", async ({ page, browser }) => {
  await joinWaitlist(page, { name: "Eight", email: "eight@example.com", size: 8 });
  await expect(tableReady(page)).toBeVisible(); // 8 of 10 seats held

  const four = await newBrowserPage(browser);
  await joinWaitlist(four, { name: "Four", email: "four@example.com", size: 4 }); // doesn't fit
  const two = await newBrowserPage(browser);
  await joinWaitlist(two, { name: "Two", email: "two@example.com", size: 2 }); // would fit, but is behind Four

  await expect(four.getByRole("heading", { name: "You're 1st in line" })).toBeVisible();
  await expect(two.getByRole("heading", { name: "You're 2nd in line" })).toBeVisible();

  // Give the scheduler a few ticks: the party of 2 must still be waiting.
  await two.waitForTimeout(3_000);
  expect((await findParties({ email: "two@example.com" }))[0].status).toBe("waiting");

  // Once the party of 8 is done, both fit (4 + 2) and are called together.
  await checkInButton(page).click();
  await expect(thanks(page)).toBeVisible();
  await expect(tableReady(four)).toBeVisible();
  await expect(tableReady(two)).toBeVisible();
});
