import { test as base, expect } from "@playwright/test";
import { MongoClient } from "mongodb";

// Every test starts with an empty waitlist and an empty Mailpit inbox.
// We clear the e2e database straight from Node, so the Rails app needs no
// test-only reset endpoint.
const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://localhost:27017/wait_in_line_simple_e2e";
const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://localhost:8025";

export async function resetWaitlist() {
  const client = new MongoClient(MONGODB_URI);
  try {
    // deleteMany (not drop) keeps the unique email index in place.
    await client.db().collection("parties").deleteMany({});
  } finally {
    await client.close();
  }
  await fetch(`${MAILPIT_URL}/api/v1/messages`, { method: "DELETE" });
}

export const test = base.extend<{ cleanSlate: void }>({
  cleanSlate: [async ({}, use) => { await resetWaitlist(); await use(); }, { auto: true }],
});

export { expect };
