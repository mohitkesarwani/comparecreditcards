// Maps the CDR product (list item + detail) into the Supabase `credit_cards`
// row shape (schema 001 + 002).
//
// The structured columns (annual_fee_amount, purchase_rate, etc.) are populated
// from the deeply nested CDR shapes by extract.js. The JSONB columns keep the
// raw arrays so we can extract additional fields later without re-ingesting.

import {
  findAnnualFeeAmount,
  findMonthlyFeeAmount,
  findPurchaseRate,
  findCashAdvanceRate,
  findComparisonRate,
  findInterestFreeDays,
  extractFeeAmount,
} from './extract.js';

const arrOrEmpty = (v) => (Array.isArray(v) ? v : []);

// Normalise a fee row so the JSONB column carries `amount` (extracted) on top
// of the raw CDR object — this makes downstream JSONB filtering possible.
const normaliseFee = (f) => ({
  ...f,
  amount: extractFeeAmount(f),
});

export function buildCardRecord({ bank, listItem, detail }) {
  const fees = arrOrEmpty(detail.fees).map(normaliseFee);
  const lending_rates = arrOrEmpty(detail.lendingRates);
  const features = arrOrEmpty(detail.features);
  const eligibility = arrOrEmpty(detail.eligibility);
  const constraints = arrOrEmpty(detail.constraints);

  // Structured columns — what the UI reads directly
  const annual_fee_amount = findAnnualFeeAmount(fees);
  const monthly_fee_amount = findMonthlyFeeAmount(fees);
  const purchase_rate = findPurchaseRate(lending_rates);
  const cash_advance_rate = findCashAdvanceRate(lending_rates);
  const comparison_rate = findComparisonRate(lending_rates);
  const interest_free_days = findInterestFreeDays(features);

  return {
    product_id: listItem.productId,
    name: listItem.name || detail.name || null,
    description: listItem.description || detail.description || null,
    brand: listItem.brand || detail.brand || null,
    brand_name: detail.brandName || null,
    bank_name: bank.name,
    application_uri: listItem.applicationUri || detail.applicationUri || null,
    is_sponsored: false,
    sponsor_rank: 0,

    // Structured (schema 002)
    annual_fee_amount,
    monthly_fee_amount,
    purchase_rate,
    cash_advance_rate,
    comparison_rate,
    interest_free_days,

    // JSONB blobs (preserved for forward-compat)
    card_art: arrOrEmpty(detail.cardArt),
    lending_rates,
    fees,
    features,
    eligibility,
    details: null,
    raw: {
      productCategory: listItem.productCategory,
      lastUpdated: listItem.lastUpdated || detail.lastUpdated,
      effectiveFrom: listItem.effectiveFrom,
      effectiveTo: listItem.effectiveTo,
      additionalInformation:
        listItem.additionalInformation || detail.additionalInformation,
      additionalInformationUri:
        listItem.additionalInformationUri || detail.additionalInformationUri,
      constraints,
    },
    updated_at: new Date().toISOString(),
  };
}
