# Remote Waitlist

A virtual waitlist for a fully booked restaurant with 10 seats. Diners join with their name, email and party size. They watch their place in line, check in when their table is ready, and see the meal count down.

Ruby 3.3 · Rails 8.1 · MongoDB · vanilla JS · Playwright + RSpec (used Pico.css for basic styling) 

## Setup

```sh
docker compose up
```

| URL | What |
|---|---|
| http://localhost:3000 | The app |
| http://localhost:8025 | Mailpit: the "your table is ready" emails land here |

The first start builds the image and creates the Mongo indexes. Ports 3000, 8025, 1025 and 27017 must be free.

To try the queue, open the app in two different browsers (or one normal and one private window) and join with different emails.

### Tests

```sh
docker compose --profile e2e run --rm e2e     # Playwright end-to-end tests
docker compose --profile test run --rm test   # RSpec unit tests
```

The E2E stack runs its own `web-e2e` and `scheduler-e2e` with a separate database, so it never touches your dev data. Service time there is 1 second per person, so tests run fast.

### Settings

Set in `config/application.rb`. Override them with environment variables in `docker-compose.yml`.

| Variable | Default | Meaning |
|---|---|---|
| `CAPACITY` | `10` | Seats in the restaurant |
| `SERVICE_SECONDS_PER_PERSON` | `3` | Service time per person (a party of 4 = 12s) |

---

## How the waitlist works

### The pieces

```
 browser ──HTTP──▶  web (Rails)  ──▶  MongoDB  ◀──  scheduler (rake waitlist:tick_forever)
   ▲                                         │                 │
   └── polls status every 3s ◀───────────────┘                 └──▶ Mailpit (table-ready email)
```

| Piece | Job |
|---|---|
| `web` | Serves the pages. Lets a party **join** and **check in**. It never hands out seats. |
| `scheduler` | Runs `Waitlist::Tick` once a second. It is the **only** process that hands out seats. |
| `Party` (Mongo document) | One document per party. Its `status` field is the whole queue state. |
| `mailpit` | Catches the "your table is ready" email locally. |

The frontend is server-rendered ERB with one small vanilla-JS  (`app/javascript/application.js`). It polls the status partial and runs the countdown. There is no SPA and no frontend framework.

### A party's life

```
waiting ──(Tick: seats free)──▶ ready ──(diner clicks Check in)──▶ seated ──(Tick: service time over)──▶ completed
```

| Status | What it means | Who moves it on |
|---|---|---|
| `waiting` | In line. The page shows their position. | `Tick`, when the party fits |
| `ready` | Seats are **held** for them. The page shows a Check in button, and an email goes out. | The diner |
| `seated` | Being served. `service_ends_at = now + size × 3s`. | `Tick`, after `service_ends_at` |
| `completed` | Done. They have left the queue. | — |

`active` is `true` for `waiting`, `ready` and `seated`. It is kept in sync with `status` in `before_validation`.

### Capacity (10 seats) and the queue

`Waitlist::Tick` (`app/services/waitlist/tick.rb`) runs every second and does two things:

1. **Finish service.** Every `seated` party past its `service_ends_at` becomes `completed`.
2. **Ready the next parties.** It walks the `waiting` parties in join order (`created_at`, with `_id` as a tie-breaker). While the next party fits (`seats held by ready + seated + this party ≤ 10`), it marks that party `ready` and emails them. It **stops at the first party that does not fit.**

Seats are counted as taken from the moment a party is `ready`, not only once it is `seated`. Otherwise two parties could be told "your table is ready" for the same seats.

The queue is strict first-in, first-out: a small party never skips a larger party ahead of it (unless two parties are ready and the one in front is just not clicking the check-in button). This keeps the line fair and easy to predict. The cost is some empty seats while the front party waits for room. 

A `ready` party keeps its seats until it checks in. There is deliberately no check-in deadline or no-show handling. This is one of the shortcomings of this appliaction, a no-show blcoks the queue. However, adding a no-show status in the state machine would necessitate more careful approach, and I thought I would not have time for that.

### Check in

`Waitlist::CheckIn` uses a single atomic `find_one_and_update`. It matches `status: "ready"` and sets `status: "seated"` plus the service timestamps. A double-click or two open tabs can only check in once. The second request sees `:already_seated` and gets a friendly message.

### No duplicate parties

A **partial unique index** on `email`, limited to `active: true` documents, enforces this in the database:

```ruby
index({ email: 1 }, unique: true, partial_filter_expression: { active: true })
```

- Two joins with the same email can never both be active, even if they arrive at the same moment. Mongo rejects the second with error `11000`.
- `Waitlist::Join` catches that error and returns the party already in line, so the diner lands on their existing page instead of seeing an error.
- Once a party is `completed`, it is no longer `active`, so the same person can join again another day.
- Emails are trimmed and lowercased first, so `Foo@x.com ` and `foo@x.com` count as the same.

### Concurrency: no overbooking

Joining only **inserts** a `waiting` document. It never claims seats. Only the scheduler claims seats, and there is exactly one scheduler running the steps one after another. So however many people join at once, the seat check is never done by two processes at the same time.

Each party still gets the best experience it can: its place in line is set by `created_at` at insert time. A simultaneous join cannot jump ahead of them.

### Seeing your status from more than one browser session

Each party has a random, unguessable `token`. Their page is `/parties/:token`, and the token is the only key needed to see it.

- **Same browser:** a signed, permanent, `httponly` cookie remembers the token. Visiting `/` takes you back to your party.
- **Another browser or device:** open the same URL, use the link in the "table ready" email, or join again with the same email. That returns your existing party instead of creating a second one. 

### Live updates

The status block (`parties/_status`) is a partial with its own route (`GET /parties/:token/status`). The page re-fetches it every 3 seconds and swaps it in. The countdown ticks down in the browser from the server's `service_ends_at`, so it stays correct across refreshes.

### What the tests cover

The Playwright suite (`e2e/tests/`) drives real browsers against the full stack:

- **Happy path:** join → table-ready email → check in → countdown → end screen.
- **Queue:** waiting while full and getting called when seats free up; a smaller party never skipping the one in front.
- **Concurrency:** 5 parties joining at the same moment, with the database watched the whole time to check that seats held never go above 10; the same email submitted from 3 browsers at once creating one party.
- **Browser sessions:** the cookie bringing you back; a second browser staying in sync; a check-in from two browsers at once seating the party only once; joining again after the meal.

### Where things live

```
app/models/party.rb               state, validations, indexes, position in line
app/services/waitlist/join.rb     join + duplicate handling
app/services/waitlist/check_in.rb atomic ready → seated
app/services/waitlist/tick.rb     finish service + ready next parties (the only seat allocator)
lib/tasks/waitlist.rake           the scheduler loop (calls Tick every second)
app/controllers/*                 thin: call a service, redirect based on the result
app/javascript/application.js     polling + countdown
e2e/                              Playwright tests
spec/                             RSpec unit tests
```
