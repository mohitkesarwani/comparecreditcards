# Credit Card Data Service

This service fetches credit card product details from Australian bank Consumer Data Standards APIs and stores them in MongoDB. Data is refreshed on a schedule using `node-cron`.

## Setup

1. Install dependencies (Node.js 18+ recommended):
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and update the values if necessary:
   ```bash
   cp .env.example .env
   ```
   - `MONGO_URI` – MongoDB connection string
   - `CRON_SCHEDULE` – cron expression used to run the fetch job

3. Start the service
   ```bash
   npm start
   ```
   During development you can use `npm run dev` to restart automatically.

The service connects to MongoDB, then periodically fetches credit card products from the banks defined in `src/constants/banks.js`. Only products with a `productCategory` of `CRED_AND_CHRG_CARDS` are processed. Each card is stored or updated in the `CreditCard` collection based on `bankName` and `productId`.
