import test from 'node:test';
import assert from 'node:assert';
import {
  findMinRate,
  findMinComparisonRate,
  findFeatures,
  findFees,
  findConstraints,
  parseIsoMonths,
} from '../src/lib/homeLoan/extract.js';

// ── parseIsoMonths ──────────────────────────────────────────────────────────
test('parseIsoMonths: months / years / days', () => {
  assert.strictEqual(parseIsoMonths('P30Y'), 360);
  assert.strictEqual(parseIsoMonths('P12M'), 12);
  assert.strictEqual(parseIsoMonths('P60D'), 2);
  assert.strictEqual(parseIsoMonths('garbage'), null);
});

// ── findMinRate ─────────────────────────────────────────────────────────────
const sampleRates = [
  { lendingRateType: 'VARIABLE', rate: '0.0595', loanPurpose: 'OWNER_OCCUPIED', repaymentType: 'PRINCIPAL_AND_INTEREST' },
  { lendingRateType: 'VARIABLE', rate: '0.0625', loanPurpose: 'OWNER_OCCUPIED', repaymentType: 'INTEREST_ONLY' },
  { lendingRateType: 'VARIABLE', rate: '0.0640', loanPurpose: 'INVESTMENT',     repaymentType: 'PRINCIPAL_AND_INTEREST' },
  { lendingRateType: 'FIXED',    rate: '0.0639', loanPurpose: 'OWNER_OCCUPIED', repaymentType: 'PRINCIPAL_AND_INTEREST' },
  { lendingRateType: 'FIXED',    rate: '0.0699', loanPurpose: 'INVESTMENT' },
];

test('findMinRate: variable owner-occupied prefers P&I', () => {
  assert.strictEqual(findMinRate(sampleRates, /VARIABLE/, /OWNER/), 0.0595);
});

test('findMinRate: variable investment', () => {
  assert.strictEqual(findMinRate(sampleRates, /VARIABLE/, /INVEST/), 0.064);
});

test('findMinRate: fixed owner-occupied', () => {
  assert.strictEqual(findMinRate(sampleRates, /FIXED/, /OWNER/), 0.0639);
});

test('findMinRate: returns null when nothing matches', () => {
  assert.strictEqual(findMinRate([], /VARIABLE/, /OWNER/), null);
});

// ── findMinComparisonRate ───────────────────────────────────────────────────
test('findMinComparisonRate: lowest across entries', () => {
  const rates = [
    { comparisonRate: '0.0612' },
    { comparisonRate: '0.0596' },
    { comparisonRate: null },
  ];
  assert.strictEqual(findMinComparisonRate(rates), 0.0596);
});

// ── findFeatures ────────────────────────────────────────────────────────────
test('findFeatures: detects short OFFSET and REDRAW (Tiimely-style)', () => {
  const features = [
    { featureType: 'OFFSET' },
    { featureType: 'REDRAW' },
    { featureType: 'EXTRA_REPAYMENTS' },
  ];
  const flags = findFeatures(features);
  assert.strictEqual(flags.has_offset, true);
  assert.strictEqual(flags.has_redraw, true);
  assert.strictEqual(flags.has_extra_repayments, true);
});

test('findFeatures: detects OFFSET_ACCOUNT (canonical CDR)', () => {
  assert.strictEqual(findFeatures([{ featureType: 'OFFSET_ACCOUNT' }]).has_offset, true);
});

test('findFeatures: missing feature → false', () => {
  assert.strictEqual(findFeatures([]).has_offset, false);
  assert.strictEqual(findFeatures([{ featureType: 'DIGITAL_BANKING' }]).has_redraw, false);
});

// ── findFees ────────────────────────────────────────────────────────────────
test('findFees: extracts upfront / annual / monthly / discharge', () => {
  const fees = [
    { name: 'Establishment Fee', feeType: 'UPFRONT', fixedAmount: { amount: '600.00' } },
    { name: 'Annual Package Fee', feeType: 'PERIODIC', additionalValue: 'P1Y', fixedAmount: { amount: '395.00' } },
    { name: 'Monthly Account Fee', feeType: 'PERIODIC', additionalValue: 'P1M', fixedAmount: { amount: '8.00' } },
    { name: 'Discharge Fee', fixedAmount: { amount: '350.00' } },
  ];
  const out = findFees(fees);
  assert.strictEqual(out.upfront_fee_amount, 600);
  assert.strictEqual(out.annual_fee_amount, 395);
  assert.strictEqual(out.monthly_fee_amount, 8);
  assert.strictEqual(out.discharge_fee_amount, 350);
});

// ── findConstraints — LVR normalisation ─────────────────────────────────────
test('findConstraints: max LVR from constraints[] (already in percent)', () => {
  const constraints = [{ constraintType: 'MAX_LVR', additionalValue: '80' }];
  assert.strictEqual(findConstraints(constraints, []).max_lvr_percent, 80);
});

test('findConstraints: max LVR from tiers, normalises 0.9 to 90', () => {
  const rates = [
    { tiers: [{ name: 'LVR', unitOfMeasure: 'PERCENT', maximumValue: '0.9' }] },
  ];
  assert.strictEqual(findConstraints([], rates).max_lvr_percent, 90);
});

test('findConstraints: prefers largest LVR cap across tiers', () => {
  const rates = [
    { tiers: [{ name: 'LVR', maximumValue: '60' }] },
    { tiers: [{ name: 'LVR', maximumValue: '80' }] },
    { tiers: [{ name: 'LVR', maximumValue: '95' }] },
  ];
  assert.strictEqual(findConstraints([], rates).max_lvr_percent, 95);
});

test('findConstraints: loan-amount limits + term', () => {
  const out = findConstraints(
    [
      { constraintType: 'MIN_LIMIT', additionalValue: '50000' },
      { constraintType: 'MAX_LIMIT', additionalValue: '2000000' },
      { constraintType: 'MAX_TERM', additionalValue: 'P30Y' },
    ],
    [],
  );
  assert.strictEqual(out.min_loan_amount, 50000);
  assert.strictEqual(out.max_loan_amount, 2000000);
  assert.strictEqual(out.max_term_months, 360);
});
