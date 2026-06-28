// One-shot ingest CLI.
//
//   node src/ingest.js                       # all banks
//   INGEST_BANKS="ANZ,CommBank" npm run ingest   # only listed banks
//   INGEST_LIMIT_PER_BANK=2 npm run ingest       # cap products per bank
//   INGEST_DRY_RUN=1 npm run ingest              # fetch only, skip Supabase writes
//
// Reads from .env (loaded by `node --env-file=.env`, see the npm script).

import banks from './constants/banks.js';
import supabase from './lib/supabase.js';
import {
  fetchProductsList,
  fetchProductDetail,
  summariseError,
} from './lib/fetchCdr.js';
import { buildCardRecord } from './lib/buildCardRecord.js';
import {
  findAnnualFeeAmount,
  findMonthlyFeeAmount,
  findPurchaseRate,
  findCashAdvanceRate,
  findComparisonRate,
  findInterestFreeDays,
} from './lib/extract.js';

const CREDIT_CARD_CATEGORIES = new Set(['CRED_AND_CHRG_CARDS', 'CREDIT_CARD']);
const DRY_RUN = process.env.INGEST_DRY_RUN === '1' || process.env.INGEST_DRY_RUN === 'true';
const LIMIT_PER_BANK = Number(process.env.INGEST_LIMIT_PER_BANK) || Infinity;

const pickBanks = () => {
  const filter = process.env.INGEST_BANKS;
  if (!filter) return banks;
  const wanted = new Set(filter.split(',').map((s) => s.trim().toLowerCase()));
  return banks.filter((b) => wanted.has(b.name.toLowerCase()));
};

const upsertCard = async (record) => {
  if (DRY_RUN) return { dryRun: true };
  const { error } = await supabase
    .from('credit_cards')
    .upsert(record, { onConflict: 'product_id' });
  if (error) throw error;
  return { upserted: true };
};

const ingestOneBank = async (bank, totals) => {
  console.log(`\n=== ${bank.name} ===`);
  const fetchOpts = { allowInsecureTls: !!bank.allowInsecureTls };
  let products;
  try {
    products = await fetchProductsList(bank.baseUrl, fetchOpts);
  } catch (err) {
    console.error(`  [list]   ${summariseError(err)}`);
    totals.listFailures += 1;
    return;
  }

  const cards = products
    .filter((p) => CREDIT_CARD_CATEGORIES.has(p.productCategory))
    .slice(0, LIMIT_PER_BANK);
  console.log(`  ${cards.length} credit-card product(s) of ${products.length} total`);

  for (const item of cards) {
    try {
      const detail = await fetchProductDetail(bank.baseUrl, item.productId, fetchOpts);
      const record = buildCardRecord({ bank, listItem: item, detail });
      await upsertCard(record);
      totals.upserted += 1;
      console.log(`  [ok]     ${item.productId}  ${item.name || ''}`);
    } catch (err) {
      totals.detailFailures += 1;
      console.error(`  [detail] ${item.productId}  ${summariseError(err)}`);
    }
  }
};

// Re-runs the structured-column extraction across every row already in
// Supabase, without re-fetching from CDR. Use after the extractors change.
const reextract = async () => {
  console.log('Re-extracting structured columns from existing rows…');
  const { data, error } = await supabase
    .from('credit_cards')
    .select('id,fees,lending_rates,features')
    .limit(10000);
  if (error) throw error;
  let changed = 0;
  for (const row of data || []) {
    const update = {
      annual_fee_amount: findAnnualFeeAmount(row.fees),
      monthly_fee_amount: findMonthlyFeeAmount(row.fees),
      purchase_rate: findPurchaseRate(row.lending_rates),
      cash_advance_rate: findCashAdvanceRate(row.lending_rates),
      comparison_rate: findComparisonRate(row.lending_rates),
      interest_free_days: findInterestFreeDays(row.features),
      updated_at: new Date().toISOString(),
    };
    const { error: upErr } = await supabase
      .from('credit_cards')
      .update(update)
      .eq('id', row.id);
    if (upErr) {
      console.error('  fail', row.id, upErr.message);
      continue;
    }
    changed += 1;
  }
  console.log(`Done · ${changed} of ${(data || []).length} rows updated.`);
};

const main = async () => {
  if (process.env.INGEST_REEXTRACT_ONLY === '1' || process.env.INGEST_REEXTRACT_ONLY === 'true') {
    return reextract();
  }
  const selected = pickBanks();
  console.log(
    `Ingest starting · ${selected.length} bank(s)` +
      (DRY_RUN ? ' · DRY RUN (no Supabase writes)' : '') +
      (LIMIT_PER_BANK !== Infinity ? ` · cap ${LIMIT_PER_BANK}/bank` : '')
  );

  const totals = { upserted: 0, listFailures: 0, detailFailures: 0 };
  const startedAt = Date.now();

  for (const bank of selected) {
    await ingestOneBank(bank, totals);
  }

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(
    `\nDone in ${elapsed}s · upserted=${totals.upserted}` +
      ` · list failures=${totals.listFailures}` +
      ` · detail failures=${totals.detailFailures}`
  );
};

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
