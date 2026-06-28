// Pure extraction helpers, written against the CDR Banking Product Detail
// schema (v3/v4/v5/v6 are compatible at this level):
//
//   feeMethodUType: 'fixedAmount' | 'variableAmount' | 'transactionRate' | ...
//     fixedAmount:     { amount: '30.00', currency: 'AUD' }
//     variableAmount:  { minimumAmount, maximumAmount, currency }
//
//   features[].additionalValue:
//     INTEREST_FREE       → 'P55D'      (ISO 8601 period — days)
//     CASHBACK_OFFER      → '240.00'
//     ADDITIONAL_CARDS    → '5'
//     DIGITAL_WALLET      → 'Apple Pay'
//
// All helpers are pure so they can be unit-tested without HTTP.

const arrOrEmpty = (v) => (Array.isArray(v) ? v : []);

// "P55D" → 55, "P1Y" → 365, "P12M" → 365, else null
export const parseIsoDuration = (value) => {
  if (!value || typeof value !== 'string') return null;
  const days = value.match(/^P(\d+)D$/);
  if (days) return Number(days[1]);
  const months = value.match(/^P(\d+)M$/);
  if (months) return Number(months[1]) * 30;
  const years = value.match(/^P(\d+)Y$/);
  if (years) return Number(years[1]) * 365;
  return null;
};

// Pulls amount from whichever CDR feeMethodUType variant is present.
export const extractFeeAmount = (fee) => {
  if (!fee) return null;
  const candidates = [
    fee.fixedAmount?.amount,
    fee.variableAmount?.amount,
    fee.variableAmount?.minimumAmount,
    fee.amount, // legacy / pre-spec field; kept defensively
  ];
  for (const c of candidates) {
    if (c === undefined || c === null || c === '') continue;
    const n = parseFloat(c);
    if (Number.isFinite(n)) return n;
  }
  return null;
};

// "Annual fee" identification across banks. Tries name match first (high
// confidence), then the structural signal of feeType=PERIODIC + a P1Y/P12M
// frequency. Returns the smallest match if multiple.
// Words that disqualify a fee from being the card's headline annual fee.
//   - additional / secondary / supplement / cardholder → fee for extra cards
//   - inactive / dormant / penalty                     → penalty / behavioural fee
//   - late / overlimit / overdrawn                     → penalty
//   - statement / paper                                → admin add-on
//   - facility                                         → treasury / business-only fee
//   - replacement                                      → one-off card-reissue charge
const ANNUAL_EXCLUDE = /additional|secondary|supplement|cardholder|inactive|dormant|penalty|late|overlimit|overdrawn|statement|paper|facility|replacement|withdrawal|cash advance|enquiry/i;

const isAnnualByName = (f) =>
  /\b(annual|membership)\b/i.test(f?.name || '') &&
  !ANNUAL_EXCLUDE.test(f?.name || '');

const isPeriodicYearly = (f) =>
  f?.feeType === 'PERIODIC' &&
  /^P(1Y|12M|365D)$/i.test(f?.additionalValue || '');

// Picks the maximum among matching fees. Reason: when a card carries split
// components (e.g. ANZ "Account Service $320" + "Rewards Program $55", or
// Westpac "Annual Card Fee $295" + "Annual rewards program fee $0"), the
// base annual fee is the larger one — the lower component is either a
// promo, a $0 add-on, or a sub-fee. Taking min consistently understates.
export const findAnnualFeeAmount = (fees) => {
  const list = arrOrEmpty(fees);
  // Pass 1: name explicitly mentions Annual / Membership
  const named = list
    .filter(isAnnualByName)
    .map(extractFeeAmount)
    .filter((n) => Number.isFinite(n));
  if (named.length) return Math.max(...named);

  // Pass 2: structural match — PERIODIC fee on a yearly cycle, not penalty/add-on
  const yearly = list
    .filter((f) => isPeriodicYearly(f) && !ANNUAL_EXCLUDE.test(f.name || ''))
    .map(extractFeeAmount)
    .filter((n) => Number.isFinite(n));
  if (yearly.length) return Math.max(...yearly);

  return null;
};

export const findMonthlyFeeAmount = (fees) => {
  const list = arrOrEmpty(fees);
  const monthly = list
    .filter((f) => f?.feeType === 'PERIODIC' && /^P(1M|30D)$/i.test(f?.additionalValue || ''))
    .map(extractFeeAmount)
    .filter((n) => Number.isFinite(n));
  if (!monthly.length) return null;
  return Math.min(...monthly);
};

const rateType = (r) => r?.lendingRateType || r?.rateType || '';

export const findRate = (lendingRates, typeRegex) => {
  const entry = arrOrEmpty(lendingRates).find((r) => typeRegex.test(rateType(r)));
  const raw = entry?.rate;
  if (raw === undefined || raw === null || raw === '') return null;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : null;
};

export const findPurchaseRate = (lendingRates) => {
  const v = findRate(lendingRates, /purchase/i);
  if (v !== null) return v;
  // Fallback: first rate (single-rate cards often omit the tag)
  const first = arrOrEmpty(lendingRates)[0]?.rate;
  const n = parseFloat(first);
  return Number.isFinite(n) ? n : null;
};

export const findCashAdvanceRate = (lendingRates) => findRate(lendingRates, /cash|advance/i);

export const findComparisonRate = (lendingRates) => {
  const list = arrOrEmpty(lendingRates);
  const purchase = list.find(
    (r) => r.comparisonRate && /purchase/i.test(rateType(r)),
  );
  const fallback = list.find((r) => r.comparisonRate);
  const raw = (purchase || fallback)?.comparisonRate;
  if (!raw) return null;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : null;
};

export const findInterestFreeDays = (features) => {
  const list = arrOrEmpty(features);
  const entry = list.find((f) => f?.featureType === 'INTEREST_FREE');
  if (!entry) return null;
  return parseIsoDuration(entry.additionalValue);
};
