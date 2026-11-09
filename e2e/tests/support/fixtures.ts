import { test as base, expect, type Page, type Browser } from "@playwright/test";
import { MongoClient, type Collection, type Document } from "mongodb";

// Every test starts with an empty waitlist and an empty Mailpit inbox.
// We clear the e2e database straight from Node, so the Rails app needs no
// test-only reset endpoint.
const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://localhost:27017/wait_in_line_simple_e2e";
export const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://localhost:8025";

async function withParties<T>(fn: (parties: Collection) => Promise<T>) {
  const client = new MongoClient(MONGODB_URI);
  try {
    return await fn(client.db().collection("parties"));
  } finally {
    await client.close();
  }
}

export async function resetWaitlist() {
  // deleteMany (not drop) keeps the unique email index in place.
  await withParties((parties) => parties.deleteMany({}));
  await fetch(`${MAILPIT_URL}/api/v1/messages`, { method: "DELETE" });
}

// Read parties straight from Mongo, for checks the UI can't show (e.g. "only one document").
export function findParties(filter: Document = {}) {
  return withParties((parties) => parties.find(filter).toArray());
}

// Seats held right now = ready + seated party sizes. Must never exceed capacity (10).
export async function seatsHeld() {
  const held = await findParties({ status: { $in: ["ready", "seated"] } });
  return held.reduce((sum, party) => sum + party.size, 0);
}

// Text bodies of the emails Mailpit received for an address.
export async function emailsTo(address: string): Promise<string[]> {
  const search = await fetch(`${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:"${address}"`)}`);
  const { messages } = await search.json();
  return Promise.all(
    messages.map(async ({ ID }: { ID: string }) => (await (await fetch(`${MAILPIT_URL}/api/v1/message/${ID}`)).json()).Text),
  );
}

export type PartyInput = { name: string; email: string; size: number };

// Fill the join form without submitting, so several browsers can submit at the same moment.
export async function fillJoinForm(page: Page, { name, email, size }: PartyInput) {
  await page.goto("/");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Party size").fill(String(size));
}

export function submitJoinForm(page: Page) {
  return page.getByRole("button", { name: "Join the queue" }).click();
}

export async function joinWaitlist(page: Page, party: PartyInput) {
  await fillJoinForm(page, party);
  await submitJoinForm(page);
  await expect(page).toHaveURL(/\/parties\/[\w-]+$/);
}

// A separate browser context = a separate browser (own cookies), like another device.
export async function newBrowserPage(browser: Browser) {
  const context = await browser.newContext();
  return context.newPage();
}

export const tableReady = (page: Page) => page.getByRole("heading", { name: "Your table is ready!" });
export const checkInButton = (page: Page) => page.getByRole("button", { name: "Check in" });
export const enjoyMeal = (page: Page) => page.getByRole("heading", { name: "Enjoy your meal" });
export const thanks = (page: Page) => page.getByRole("heading", { name: "Thanks for dining with us!" });

export const test = base.extend<{ cleanSlate: void }>({
  cleanSlate: [async ({}, use) => { await resetWaitlist(); await use(); }, { auto: true }],
});

export { expect };
