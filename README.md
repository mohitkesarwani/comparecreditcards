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
  - `CRON_SCHEDULE` – number of hours between fetches. Accepts values from `0.1` up to `24`; for example `1` runs hourly and `0.5` runs every 30 minutes.
  - `GET_PRODUCTS_HEADERS` – JSON object of headers for the product list request
  - `GET_PRODUCT_DETAIL_HEADERS` – JSON object of headers for the product detail request
  - `DEFAULT_X_V` – default `x-v` header value if not supplied in the JSON header variables
  - `X_V_RETRY_FROM` – `x-v` value that triggers a retry when a request fails
  - `X_V_RETRY_TO` – `x-v` version used for that retry
    (requests failing with `X_V_RETRY_FROM` will automatically retry with `X_V_RETRY_TO`)

3. Start the service
   ```bash
   npm start
   ```
   During development you can use `npm run dev` to restart automatically.

The service connects to MongoDB, then periodically fetches credit card products from the banks defined in `src/constants/banks.js`. Only products with a `productCategory` of `CRED_AND_CHRG_CARDS` are processed. Each card is stored or updated in the `CreditCard` collection based on `bankName` and `productId`.

## Python Example

An example Python script is available in the `examples` directory. It demonstrates how to call the Consumer Data Standards APIs using the `requests` library.

Run the script with Python 3:

```bash
python examples/get_products.py
```

The script fetches the product list from ANZ and then retrieves details for the first product returned.
