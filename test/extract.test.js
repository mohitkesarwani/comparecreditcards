// Pure tests for the CDR-shape extractors. Fixtures mirror what real banks
// return (verified against live ANZ, CommBank, NAB, Westpac responses).

import test from 'node:test';
import assert from 'node:assert';
import {
  parseIsoDuration,
  extractFeeAmount,
  findAnnualFeeAmount,
  findMonthlyFeeAmount,
  findPurchaseRate,
  findCashAdvanceRate,
  findComparisonRate,
  findInterestFreeDays,
} from '../src/lib/extract.js';

// ----- parseIsoDuration -----
test('parseIsoDuration: days', () => {
  assert.strictEqual(parseIsoDuration('P55D'), 55);
  assert.strictEqual(parseIsoDuration('P30D'), 30);
});
test('parseIsoDuration: months → days approximation', () => {
  assert.strictEqual(parseIsoDuration('P1M'), 30);
});
test('parseIsoDuration: years → days approximation', () => {
  assert.strictEqual(parseIsoDuration('P1Y'), 365);
});
test('parseIsoDuration: returns null for garbage', () => {
  assert.strictEqual(parseIsoDuration(''), null);
  assert.strictEqual(parseIsoDuration('hello'), null);
  assert.strictEqual(parseIsoDuration(undefined), null);
});

// ----- extractFeeAmount -----
test('extractFeeAmount: fixedAmount.amount (CommBank, NAB, Westpac)', () => {
  assert.strictEqual(
    extractFeeAmount({ feeMethodUType: 'fixedAmount', fixedAmount: { amount: '30.00' } }),
    30,
  );
});
test('extractFeeAmount: variableAmount.amount fallback', () => {
  assert.strictEqual(
    extractFeeAmount({ feeMethodUType: 'variableAmount', variableAmount: { amount: '5.50' } }),
    5.5,
  );
});
test('extractFeeAmount: legacy `amount` field still works', () => {
  assert.strictEqual(extractFeeAmount({ amount: '99' }), 99);
});
test('extractFeeAmount: returns null when no amount anywhere', () => {
  assert.strictEqual(extractFeeAmount({ name: 'Free Fee' }), null);
});

// ----- findAnnualFeeAmount -----
test('findAnnualFeeAmount: NAB "Annual Card Fee" $60', () => {
  const fees = [
    { name: 'Annual Card Fee', feeType: 'PERIODIC', additionalValue: 'P1Y', fixedAmount: { amount: '60.00' } },
    { name: 'Late Payment Fee', fixedAmount: { amount: '20.00' } },
  ];
  assert.strictEqual(findAnnualFeeAmount(fees), 60);
});

test('findAnnualFeeAmount: ANZ "Account Service" $87 (no "annual" in name, but PERIODIC + P1Y)', () => {
  const fees = [
    { name: 'Account Service', feeType: 'PERIODIC', additionalValue: 'P1Y', fixedAmount: { amount: '87.00' } },
    { name: 'Overseas Transaction Fee', feeType: 'PURCHASE' },
  ];
  assert.strictEqual(findAnnualFeeAmount(fees), 87);
});

test('findAnnualFeeAmount: skips PERIODIC fees that are "additional cardholder"', () => {
  const fees = [
    { name: 'Additional cardholder fee', feeType: 'PERIODIC', additionalValue: 'P1Y', fixedAmount: { amount: '0.00' } },
    { name: 'Monthly fee', feeType: 'PERIODIC', additionalValue: 'P1M', fixedAmount: { amount: '6.00' } },
  ];
  // No annual found → null (monthly is captured by findMonthlyFeeAmount)
  assert.strictEqual(findAnnualFeeAmount(fees), null);
});

test('findAnnualFeeAmount: prefers name-matched (pass 1) over structural-matched (pass 2)', () => {
  const fees = [
    // Pass 1 candidate — name says Annual, even without PERIODIC tag
    { name: 'Annual Card Fee', fixedAmount: { amount: '99.00' } },
    // Pass 2 candidate — structural match only
    { name: 'Some yearly charge', feeType: 'PERIODIC', additionalValue: 'P1Y', fixedAmount: { amount: '50.00' } },
  ];
  assert.strictEqual(findAnnualFeeAmount(fees), 99);
});

test('findAnnualFeeAmount: picks the LARGER fee when annual is split into components (ANZ-style)', () => {
  // Real ANZ Rewards Black: Account Service $320 + Rewards Program $55 — base fee is $320.
  const fees = [
    { name: 'Account Service', feeType: 'PERIODIC', additionalValue: 'P1Y', fixedAmount: { amount: '320.00' } },
    { name: 'Rewards Program', feeType: 'PERIODIC', additionalValue: 'P1Y', fixedAmount: { amount: '55.00' } },
  ];
  assert.strictEqual(findAnnualFeeAmount(fees), 320);
});

test('findAnnualFeeAmount: ignores $0 "Annual rewards program fee" beside real annual (Westpac-style)', () => {
  const fees = [
    { name: 'Annual Card Fee', feeType: 'PERIODIC', additionalValue: 'P1Y', fixedAmount: { amount: '295.00' } },
    { name: 'Annual rewards program fee', feeType: 'PERIODIC', additionalValue: 'P1Y', fixedAmount: { amount: '0.00' } },
  ];
  assert.strictEqual(findAnnualFeeAmount(fees), 295);
});

test('findAnnualFeeAmount: excludes "Inactive Membership Fee" (Bank First-style penalty fee)', () => {
  const fees = [
    { name: 'Inactive Membership Fee', feeType: 'PERIODIC', additionalValue: 'P1Y', fixedAmount: { amount: '30.00' } },
    { name: 'Visa Platinum Credit Card Annual Fee', feeType: 'PERIODIC', additionalValue: 'P1Y', fixedAmount: { amount: '99.00' } },
  ];
  assert.strictEqual(findAnnualFeeAmount(fees), 99);
});

test('findAnnualFeeAmount: excludes additional cardholder fee even when name says Annual', () => {
  const fees = [
    { name: 'Annual Card Fee', feeType: 'PERIODIC', additionalValue: 'P1Y', fixedAmount: { amount: '100.00' } },
    { name: 'Additional Cardholder Annual Fee', feeType: 'PERIODIC', additionalValue: 'P1Y', fixedAmount: { amount: '50.00' } },
  ];
  assert.strictEqual(findAnnualFeeAmount(fees), 100);
});

test('findAnnualFeeAmount: skips paper statement / late / facility fees in pass 2', () => {
  const fees = [
    { name: 'Account Service', feeType: 'PERIODIC', additionalValue: 'P1Y', fixedAmount: { amount: '87.00' } },
    { name: 'Paper Statement Fee', feeType: 'PERIODIC', additionalValue: 'P1Y', fixedAmount: { amount: '15.00' } },
    { name: 'Annual Facility Fee', feeType: 'PERIODIC', additionalValue: 'P1Y', fixedAmount: { amount: '500.00' } },
  ];
  // Annual Facility Fee is excluded; Account Service wins pass 2 (no Annual/Membership in name).
  assert.strictEqual(findAnnualFeeAmount(fees), 87);
});

test('findAnnualFeeAmount: returns null on empty', () => {
  assert.strictEqual(findAnnualFeeAmount([]), null);
  assert.strictEqual(findAnnualFeeAmount(undefined), null);
});

// ----- findMonthlyFeeAmount -----
test('findMonthlyFeeAmount: CommBank Low Rate $6/month', () => {
  const fees = [
    { name: 'Monthly fee', feeType: 'PERIODIC', additionalValue: 'P1M', fixedAmount: { amount: '6.00' } },
  ];
  assert.strictEqual(findMonthlyFeeAmount(fees), 6);
});

// ----- findPurchaseRate / findCashAdvanceRate -----
const sampleRates = [
  { rate: '0.2099', lendingRateType: 'PURCHASE' },
  { rate: '0.2199', lendingRateType: 'CASH_ADVANCE' },
];
test('findPurchaseRate: returns numeric rate', () => {
  assert.strictEqual(findPurchaseRate(sampleRates), 0.2099);
});
test('findPurchaseRate: falls back to first rate when none tagged', () => {
  assert.strictEqual(findPurchaseRate([{ rate: '0.15', lendingRateType: 'STANDARD' }]), 0.15);
});
test('findCashAdvanceRate: matches CASH_ADVANCE', () => {
  assert.strictEqual(findCashAdvanceRate(sampleRates), 0.2199);
});
test('findPurchaseRate: returns null when empty', () => {
  assert.strictEqual(findPurchaseRate([]), null);
});

// ----- findComparisonRate -----
test('findComparisonRate: prefers PURCHASE-tagged entry', () => {
  const rates = [
    { lendingRateType: 'CASH_ADVANCE', comparisonRate: '0.25' },
    { lendingRateType: 'PURCHASE', comparisonRate: '0.21' },
  ];
  assert.strictEqual(findComparisonRate(rates), 0.21);
});
test('findComparisonRate: null when CDR data omits it (most banks)', () => {
  assert.strictEqual(findComparisonRate(sampleRates), null);
});

// ----- findInterestFreeDays -----
test('findInterestFreeDays: parses "P55D" from features', () => {
  const features = [
    { featureType: 'ADDITIONAL_CARDS', additionalValue: '9' },
    { featureType: 'INTEREST_FREE', additionalValue: 'P55D', additionalInfo: 'Up to 55 days...' },
  ];
  assert.strictEqual(findInterestFreeDays(features), 55);
});
test('findInterestFreeDays: returns null when no INTEREST_FREE feature', () => {
  assert.strictEqual(findInterestFreeDays([{ featureType: 'INSURANCE' }]), null);
});
test('findInterestFreeDays: returns null when feature has no parseable additionalValue', () => {
  assert.strictEqual(
    findInterestFreeDays([{ featureType: 'INTEREST_FREE', additionalValue: 'something' }]),
    null,
  );
});
