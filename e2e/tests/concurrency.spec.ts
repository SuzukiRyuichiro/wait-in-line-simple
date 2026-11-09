import {
  test, expect, fillJoinForm, submitJoinForm, newBrowserPage, findParties, seatsHeld,
  tableReady, checkInButton, thanks, type PartyInput,
} from "./support/fixtures";

test("many parties joining at the same moment never overbook the restaurant", async ({ browser }) => {
  // 5 parties of 4 = 20 seats wanted, 10 available.
  const parties: PartyInput[] = ["a", "b", "c", "d", "e"].map((id) => ({ name: `Party ${id}`, email: `${id}@example.com`, size: 4 }));
  const pages = await Promise.all(parties.map(() => newBrowserPage(browser)));
  await Promise.all(pages.map((page, i) => fillJoinForm(page, parties[i])));

  // Watch the database the whole time: seats held must never go above 10.
  let maxSeatsHeld = 0;
  let watching = true;
  const watcher = (async () => {
    while (watching) {
      maxSeatsHeld = Math.max(maxSeatsHeld, await seatsHeld());
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  })();

  await Promise.all(pages.map(submitJoinForm));
  await expect.poll(async () => (await findParties()).length).toBe(5);

  // Only two parties of 4 fit at first.
  await expect.poll(async () => (await findParties({ status: "ready" })).length).toBe(2);
  expect(await findParties({ status: "waiting" })).toHaveLength(3);

  // Every diner checks in as soon as they're called; everyone gets served eventually.
  await Promise.all(pages.map(async (page) => {
    await expect(tableReady(page)).toBeVisible({ timeout: 45_000 });
    await checkInButton(page).click();
    await expect(thanks(page)).toBeVisible({ timeout: 45_000 });
  }));

  watching = false;
  await watcher;
  expect(maxSeatsHeld).toBeGreaterThan(0);
  expect(maxSeatsHeld).toBeLessThanOrEqual(10);
});

test("the same email submitted from several browsers at once creates one party", async ({ browser }) => {
  const pages = await Promise.all([1, 2, 3].map(() => newBrowserPage(browser)));
  await Promise.all(pages.map((page) => fillJoinForm(page, { name: "Dup", email: "dup@example.com", size: 2 })));

  await Promise.all(pages.map(submitJoinForm));
  await Promise.all(pages.map((page) => expect(page).toHaveURL(/\/parties\/[\w-]+$/)));

  expect(await findParties({ email: "dup@example.com" })).toHaveLength(1);
  // Everyone lands on the same party page.
  expect(new Set(pages.map((page) => page.url())).size).toBe(1);
});
