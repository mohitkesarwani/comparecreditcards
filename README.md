# Compare Credit Cards Backend

This project is an Express/MongoDB backend for a React-based credit card comparison website in Australia. It fetches credit card data from Australian Open Banking APIs and exposes it via REST.

## Setup

1. Install dependencies (requires Node.js 18+)

```bash
npm install
```

2. Create a `.env` file (already included) and set the following values:

```
MONGO_URI=mongodb://localhost:27017/creditcards
CRON_SCHEDULE=0 */12 * * *
PORT=3000
```

3. Start the server

```bash
npm start
```

During development you can use `npm run dev` to start with nodemon.

## Endpoints

- `GET /api/cards` – returns all stored credit cards.

## Data Sync

A cron job runs every 12 hours (configurable via `.env`) to fetch credit card products from banks specified in `src/data/banks.json` using the Open Banking APIs.
