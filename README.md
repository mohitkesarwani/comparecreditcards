# comparecreditcards · CDR → Supabase ingest

A small Node CLI that fetches Australian Consumer Data Right (CDR) credit-card
products from each bank's public Open Banking API and upserts them into the
`credit_cards` table consumed by the [creditcardsUI](../creditcardsUI) frontend.

This is the only thing in this repo: a one-shot ingest. There is no Express
server, no cron, no Mongo. The UI talks to Supabase directly.

## Setup

```bash
npm install
cp .env.example .env       # then fill in SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
npm run ingest             # writes to Supabase
```

Requires Node 20+ (uses `--env-file`).

### Where to find the keys

In the Supabase dashboard → **Project Settings → API**:

| Field | Use |
| ----- | --- |
| Project URL | `SUPABASE_URL` |
| `service_role` secret | `SUPABASE_SERVICE_ROLE_KEY` — bypasses RLS so the ingest can write. **Never** ship this in the frontend bundle. |

## Useful run modes

```bash
# Fetch only — don't touch Supabase
npm run ingest:dry

# Only one or two banks (matches src/constants/banks.js name exactly)
INGEST_BANKS="ANZ,CommBank" npm run ingest

# Cap products per bank — quick smoke test
INGEST_LIMIT_PER_BANK=2 INGEST_BANKS="ANZ" npm run ingest
```

## How it works

For each bank in `src/constants/banks.js`:

1. `GET {baseUrl}/banking/products` — paginated product list.
2. Filter to credit cards (`productCategory ∈ {CRED_AND_CHRG_CARDS, CREDIT_CARD}`).
3. For each card: `GET {baseUrl}/banking/products/{id}` for full detail.
4. Shape into the Supabase `credit_cards` schema (`src/lib/buildCardRecord.js`) — most
   of the CDR nesting lands in JSONB columns (`fees_and_pricing`, `lending_rates`,
   `fees`, `features`, `eligibility`, `card_art`); fields without a column home
   land in `raw`.
5. Upsert on `product_id`.

CDR APIs are inconsistent — some banks 404, some are slow, some return the
wrong `x-v` version. The script logs each failure and continues; `x-v` version
mismatches automatically retry once with the version configured in
`X_V_RETRY_TO`.

## Project structure

```
src/
├── constants/banks.js     ~100 CDR base URLs (one per bank)
├── lib/
│   ├── supabase.js        service-role client
│   ├── fetchCdr.js        list + detail fetchers, x-v retry
│   └── buildCardRecord.js raw product → Supabase row
└── ingest.js              CLI entry point

examples/get_products.py   small Python demo of the CDR API
```

## What's not here (yet)

- Residential mortgages ingest — the old repo had a parallel cron job for
  `RESIDENTIAL_MORTGAGES`. Easy to add: copy `ingest.js`, change the category
  filter and target table.
- Scheduled runs — invoke `npm run ingest` from cron / GitHub Actions / Supabase
  Edge Functions / etc. The CLI is intentionally idempotent (upsert on
  `product_id`).
