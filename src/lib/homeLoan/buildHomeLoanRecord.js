// Maps a CDR home-loan product into the Supabase `home_loans` row shape
// (migration 003).

import {
  findMinRate,
  findMinComparisonRate,
  findFeatures,
  findFees,
  findConstraints,
  extractFeeAmount,
} from './extract.js';

const arrOrEmpty = (v) => (Array.isArray(v) ? v : []);

// Decorate each raw fee with `.amount` so downstream JSONB queries can read
// it directly without re-parsing fixedAmount.amount.
const normaliseFee = (f) => ({ ...f, amount: extractFeeAmount(f) });

export function buildHomeLoanRecord({ bank, listItem, detail }) {
  const lending_rates = arrOrEmpty(detail.lendingRates);
  const fees = arrOrEmpty(detail.fees).map(normaliseFee);
  const features = arrOrEmpty(detail.features);
  const eligibility = arrOrEmpty(detail.eligibility);
  const constraints = arrOrEmpty(detail.constraints);

  // ── Headline rates ────────────────────────────────────────────────────────
  const min_variable_rate_owner  = findMinRate(lending_rates, /VARIABLE/, /OWNER/);
  const min_variable_rate_invest = findMinRate(lending_rates, /VARIABLE/, /INVEST/);
  const min_fixed_rate_owner     = findMinRate(lending_rates, /FIXED/,    /OWNER/);
  const min_fixed_rate_invest    = findMinRate(lending_rates, /FIXED/,    /INVEST/);
  const min_comparison_rate      = findMinComparisonRate(lending_rates);

  // ── Features (boolean flags) ──────────────────────────────────────────────
  const featureFlags = findFeatures(features);

  // ── Fees ──────────────────────────────────────────────────────────────────
  const feeFields = findFees(fees);

  // ── Constraints (loan amount, LVR, term) ──────────────────────────────────
  const constraintFields = findConstraints(constraints, lending_rates);

  return {
    product_id: listItem.productId,
    bank_name: bank.name,
    name: listItem.name || detail.name || null,
    description: listItem.description || detail.description || null,
    brand: listItem.brand || detail.brand || null,
    brand_name: detail.brandName || null,
    application_uri: listItem.applicationUri || detail.applicationUri || null,
    is_sponsored: false,
    sponsor_rank: 0,

    // Structured
    min_variable_rate_owner,
    min_variable_rate_invest,
    min_fixed_rate_owner,
    min_fixed_rate_invest,
    min_comparison_rate,
    ...constraintFields,
    ...featureFlags,
    ...feeFields,

    // JSONB
    card_art: arrOrEmpty(detail.cardArt),
    lending_rates,
    fees,
    features,
    eligibility,
    constraints,
    raw: {
      lastUpdated: listItem.lastUpdated || detail.lastUpdated,
      effectiveFrom: listItem.effectiveFrom,
      effectiveTo: listItem.effectiveTo,
      additionalInformation: listItem.additionalInformation || detail.additionalInformation,
      additionalInformationUri: listItem.additionalInformationUri || detail.additionalInformationUri,
    },
    updated_at: new Date().toISOString(),
  };
}
