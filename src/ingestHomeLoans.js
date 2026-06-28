// Home-loan ingest. Same shape as the credit-card ingest but writes to the
// `home_loans` table and filters on RESIDENTIAL_MORTGAGES products.
//
//   npm run ingest:loans
//   INGEST_BANKS="Tiimely Home,Unloan" npm run ingest:loans
//   INGEST_LIMIT_PER_BANK=3 npm run ingest:loans

import banks from './constants/banks.js';
import supabase from './lib/supabase.js';
import { fetchProductsList, fetchProductDetail, summariseError } from './lib/fetchCdr.js';
import { buildHomeLoanRecord } from './lib/homeLoan/buildHomeLoanRecord.js';

// CDR uses RESIDENTIAL_MORTGAGES; some banks use the older REG_HOME_LOANS too.
const HOME_LOAN_CATEGORIES = new Set(['RESIDENTIAL_MORTGAGES', 'REG_HOME_LOANS']);

const DRY_RUN = process.env.INGEST_DRY_RUN === '1' || process.env.INGEST_DRY_RUN === 'true';
const LIMIT_PER_BANK = Number(process.env.INGEST_LIMIT_PER_BANK) || Infinity;

const pickBanks = () => {
  const filter = process.env.INGEST_BANKS;
  if (!filter) return banks;
  const wanted = new Set(filter.split(',').map((s) => s.trim().toLowerCase()));
  return banks.filter((b) => wanted.has(b.name.toLowerCase()));
};

const upsertLoan = async (record) => {
  if (DRY_RUN) return { dryRun: true };
  const { error } = await supabase
    .from('home_loans')
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

  const loans = products
    .filter((p) => HOME_LOAN_CATEGORIES.has(p.productCategory))
    .slice(0, LIMIT_PER_BANK);
  if (!loans.length) {
    console.log(`  no home-loan products (${products.length} total)`);
    return;
  }
  console.log(`  ${loans.length} home-loan product(s) of ${products.length} total`);

  for (const item of loans) {
    try {
      const detail = await fetchProductDetail(bank.baseUrl, item.productId, fetchOpts);
      const record = buildHomeLoanRecord({ bank, listItem: item, detail });
      await upsertLoan(record);
      totals.upserted += 1;
      console.log(`  [ok]     ${item.productId}  ${item.name || ''}`);
    } catch (err) {
      totals.detailFailures += 1;
      console.error(`  [detail] ${item.productId}  ${summariseError(err)}`);
    }
  }
};

const main = async () => {
  const selected = pickBanks();
  console.log(
    `Home-loan ingest · ${selected.length} bank(s)` +
      (DRY_RUN ? ' · DRY RUN' : '') +
      (LIMIT_PER_BANK !== Infinity ? ` · cap ${LIMIT_PER_BANK}/bank` : ''),
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
      ` · detail failures=${totals.detailFailures}`,
  );
};

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
