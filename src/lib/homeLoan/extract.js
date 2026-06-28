// Pure extractors for CDR home-loan (RESIDENTIAL_MORTGAGES) products.
//
// CDR shape for home loans:
//   lendingRates[] — many entries, one per (rateType × loanPurpose × LVR tier)
//     { lendingRateType: 'VARIABLE'|'FIXED'|'DISCOUNT'|'INTRODUCTORY',
//       rate: '0.0595', comparisonRate: '0.0596',
//       loanPurpose: 'OWNER_OCCUPIED'|'INVESTMENT',
//       repaymentType: 'PRINCIPAL_AND_INTEREST'|'INTEREST_ONLY',
//       tiers: [{ name: 'LVR', unitOfMeasure: 'PERCENT',
//                 minimumValue, maximumValue }] }
//
//   features[].featureType ∈ OFFSET_ACCOUNT, REDRAW, EXTRA_REPAYMENTS,
//     RATE_LOCK, SPLIT_LOAN, CONSTRUCTION_LOAN, DIGITAL_BANKING, ...
//
//   fees[] same shape as credit-card fees (feeMethodUType + fixedAmount).
//
//   constraints[] { constraintType: 'MIN_LIMIT'|'MAX_LIMIT'|'MAX_LVR' ...,
//                   additionalValue: '...' }

const arrOrEmpty = (v) => (Array.isArray(v) ? v : []);

// "P30Y" → 360 months, "P1Y" → 12, "P12M" → 12, "P360M" → 360, else null
export const parseIsoMonths = (value) => {
  if (!value || typeof value !== 'string') return null;
  const months = value.match(/^P(\d+)M$/);
  if (months) return Number(months[1]);
  const years = value.match(/^P(\d+)Y$/);
  if (years) return Number(years[1]) * 12;
  const days = value.match(/^P(\d+)D$/);
  if (days) return Math.round(Number(days[1]) / 30);
  return null;
};

export const extractFeeAmount = (fee) => {
  if (!fee) return null;
  const candidates = [
    fee.fixedAmount?.amount,
    fee.variableAmount?.amount,
    fee.variableAmount?.minimumAmount,
    fee.amount, // legacy
  ];
  for (const c of candidates) {
    if (c === undefined || c === null || c === '') continue;
    const n = parseFloat(c);
    if (Number.isFinite(n)) return n;
  }
  return null;
};

const toRate = (r) => {
  if (r === null || r === undefined || r === '') return null;
  const n = parseFloat(r);
  return Number.isFinite(n) ? n : null;
};

// ── Rate extractors ─────────────────────────────────────────────────────────
// Lowest rate matching the (rateType × loanPurpose) filter. PRINCIPAL_AND_INTEREST
// is preferred when present (it's the apples-to-apples rate borrowers compare).
export const findMinRate = (rates, rateTypeRe, loanPurposeRe) => {
  const list = arrOrEmpty(rates).filter((r) => {
    const rt = (r?.lendingRateType || r?.rateType || '').toUpperCase();
    const lp = (r?.loanPurpose || '').toUpperCase();
    return rateTypeRe.test(rt) && loanPurposeRe.test(lp);
  });
  if (!list.length) return null;

  // Prefer P&I rates when they exist, otherwise any.
  const pi = list.filter((r) => /PRINCIPAL/i.test(r?.repaymentType || ''));
  const candidates = pi.length ? pi : list;

  const nums = candidates.map((r) => toRate(r?.rate)).filter((n) => n !== null);
  return nums.length ? Math.min(...nums) : null;
};

export const findMinComparisonRate = (rates) => {
  const nums = arrOrEmpty(rates)
    .map((r) => toRate(r?.comparisonRate))
    .filter((n) => n !== null);
  return nums.length ? Math.min(...nums) : null;
};

// ── Feature flags ────────────────────────────────────────────────────────────
const hasFeature = (features, typeRe) =>
  arrOrEmpty(features).some((f) =>
    typeRe.test((f?.featureType || '').toUpperCase()),
  );

// Banks publish the offset feature under both OFFSET_ACCOUNT and the shorter
// OFFSET (e.g. Tiimely). Same for redraw / extra-repayments — accept either.
export const findFeatures = (features) => ({
  has_offset: hasFeature(features, /^OFFSET(_ACCOUNT)?$/),
  has_redraw: hasFeature(features, /^REDRAW(_FACILITY)?$/),
  has_extra_repayments: hasFeature(features, /^EXTRA_REPAYMENTS$/),
  has_rate_lock: hasFeature(features, /RATE_LOCK/),
  has_split_loan: hasFeature(features, /SPLIT_LOAN/),
  has_construction_option: hasFeature(features, /CONSTRUCTION/),
});

// ── Fees ────────────────────────────────────────────────────────────────────
const feeMatching = (fees, nameRe, typeRe) =>
  arrOrEmpty(fees).filter((f) => {
    const n = (f?.name || '').toLowerCase();
    const t = (f?.feeType || '').toUpperCase();
    return (nameRe ? nameRe.test(n) : true) && (typeRe ? typeRe.test(t) : true);
  });

const minOf = (vals) => {
  const n = vals.filter((v) => Number.isFinite(v));
  return n.length ? Math.min(...n) : null;
};

export const findFees = (fees) => {
  const list = arrOrEmpty(fees);
  const amountsFor = (matches) => matches.map(extractFeeAmount);

  // Upfront / establishment / application
  const upfront = amountsFor(feeMatching(list, /establishment|application|upfront|set[- ]?up/i, /UPFRONT|EVENT/));
  // Annual / yearly
  const yearly = amountsFor(
    list.filter(
      (f) =>
        f?.feeType === 'PERIODIC' &&
        /^P(1Y|12M|365D)$/i.test(f?.additionalValue || '') &&
        !/cardholder|additional|inactive|late|paper|statement/i.test(f?.name || ''),
    ),
  );
  // Monthly service
  const monthly = amountsFor(
    list.filter(
      (f) =>
        f?.feeType === 'PERIODIC' &&
        /^P(1M|30D)$/i.test(f?.additionalValue || '') &&
        !/late|paper|statement/i.test(f?.name || ''),
    ),
  );
  // Discharge
  const discharge = amountsFor(feeMatching(list, /discharge|exit|release/i, null));

  return {
    upfront_fee_amount: minOf(upfront),
    annual_fee_amount: minOf(yearly),
    monthly_fee_amount: minOf(monthly),
    discharge_fee_amount: minOf(discharge),
  };
};

// ── Constraints: loan amount, LVR, term ─────────────────────────────────────
const constraintValue = (constraints, typeRe) => {
  const entry = arrOrEmpty(constraints).find((c) =>
    typeRe.test((c?.constraintType || '').toUpperCase()),
  );
  if (!entry) return null;
  const n = parseFloat(entry.additionalValue);
  return Number.isFinite(n) ? n : null;
};

// CDR is ambiguous on LVR units: most banks publish as "80" or "95" (already
// in percent), but some (Unloan etc.) publish as "0.9". Normalise to percent.
const toPercent = (n) => {
  if (!Number.isFinite(n)) return null;
  return n > 1 ? n : Number((n * 100).toFixed(2));
};

export const findConstraints = (constraints, rates) => {
  // Some banks publish LVR cap inside the lendingRates tiers; others use
  // constraints[]. Check both.
  let max_lvr = constraintValue(constraints, /^MAX_LVR$/);
  if (max_lvr === null) {
    const tierMaxes = arrOrEmpty(rates).flatMap((r) =>
      arrOrEmpty(r?.tiers)
        .filter((t) => /LVR/i.test(t?.name || '') || /^PERCENT$/.test(t?.unitOfMeasure || ''))
        .map((t) => parseFloat(t?.maximumValue))
        .filter((n) => Number.isFinite(n)),
    );
    if (tierMaxes.length) max_lvr = Math.max(...tierMaxes);
  }

  return {
    min_loan_amount: constraintValue(constraints, /^MIN_LIMIT$/),
    max_loan_amount: constraintValue(constraints, /^MAX_LIMIT$/),
    max_lvr_percent: toPercent(max_lvr),
    max_term_months: parseIsoMonths(
      arrOrEmpty(constraints).find((c) =>
        /TERM/i.test(c?.constraintType || ''),
      )?.additionalValue,
    ),
  };
};
