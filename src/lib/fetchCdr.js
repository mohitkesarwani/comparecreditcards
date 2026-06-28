// Thin wrapper around the Consumer Data Standards endpoints with smart
// x-v negotiation, retries, short-circuit timeouts and consistent errors.

import axios from 'axios';
import { Agent } from 'node:https';

// Reuse one Agent per insecure host — node's default keep-alive helps both
// throughput and avoiding socket churn.
const insecureAgent = new Agent({ rejectUnauthorized: false });

const DEFAULT_X_V = process.env.DEFAULT_X_V || '4';
// Some CDR participants (notably the TMBL shared-host cluster) routinely take
// 5–10 s. Generous default so they don't fall out of one-pass ingests.
const REQUEST_TIMEOUT_MS = Number(process.env.CDR_TIMEOUT_MS) || 20000;
const MAX_VERSION = Number(process.env.MAX_X_V) || 12;
const MIN_VERSION = Number(process.env.MIN_X_V) || 1;
const RETRY_ON_5XX = 2;
const RETRY_BACKOFF_MS = 1500;

const LIST_HEADERS = process.env.GET_PRODUCTS_HEADERS
  ? JSON.parse(process.env.GET_PRODUCTS_HEADERS)
  : { 'x-v': DEFAULT_X_V, Accept: 'application/json' };

const DETAIL_HEADERS = process.env.GET_PRODUCT_DETAIL_HEADERS
  ? JSON.parse(process.env.GET_PRODUCT_DETAIL_HEADERS)
  : { 'x-v': DEFAULT_X_V, Accept: 'application/json' };

// Pull the supported version from a CDR 406 response. Three formats in the
// wild — see CDR-Quirks.md.
const parseSupportedVersion = (err) => {
  const headerVersion = err.response?.headers?.['x-v'];
  if (headerVersion) return String(headerVersion);
  const detail = err.response?.data?.errors?.[0]?.detail || '';
  const maxMatch = detail.match(/max\s*=\s*(\d+)/i);
  if (maxMatch) return maxMatch[1];
  const minMatch = detail.match(/minimum\s+version\s+supported\s+is\s+(\d+)/i);
  if (minMatch) return minMatch[1];
  return null;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Walk versions outward from `start`: start, start+1, start-1, start+2, start-2, ...
// Covers banks that want both higher AND lower than our default 4 (e.g. v6
// for ANZ, v3 for MyState/Tyro/Woolworths).
function* walkVersionsFrom(start) {
  const startNum = Number(start);
  yield String(startNum);
  for (let delta = 1; delta <= MAX_VERSION; delta++) {
    const up = startNum + delta;
    if (up <= MAX_VERSION) yield String(up);
    const down = startNum - delta;
    if (down >= MIN_VERSION) yield String(down);
  }
}

const fetchWithVersionNegotiation = async (url, baseHeaders, options = {}) => {
  const tried = new Set();
  let nextVersion = String(baseHeaders['x-v'] || baseHeaders['X-V'] || DEFAULT_X_V);
  const walker = walkVersionsFrom(nextVersion);

  while (true) {
    if (tried.has(nextVersion)) {
      const step = walker.next();
      if (step.done) {
        const err = new Error(`No supported x-v version after trying ${[...tried].join(',')}`);
        err.code = 'CDR_NO_VERSION';
        throw err;
      }
      nextVersion = step.value;
      continue;
    }
    tried.add(nextVersion);
    const headers = { ...baseHeaders, 'x-v': nextVersion };

    try {
      return await fetchWithRetry(url, headers, options);
    } catch (err) {
      if (err.response?.status !== 406) throw err;
      const hinted = parseSupportedVersion(err);
      if (hinted && !tried.has(hinted)) {
        nextVersion = hinted;
        continue;
      }
      const step = walker.next();
      if (step.done) throw err;
      nextVersion = step.value;
    }
  }
};

// Retry transient errors with a backoff: 5xx, 429 (rate-limited), and the
// connect/read timeouts you get from shared CDR hosting (TMBL, etc.).
const isRetriable = (err) => {
  const status = err.response?.status;
  if (status === 429) return true;
  if (status >= 500 && status < 600) return true;
  if (err.code === 'ECONNABORTED') return true; // request timeout
  if (err.code === 'ETIMEDOUT') return true;    // socket timeout
  if (err.code === 'ECONNRESET') return true;
  return false;
};

const fetchWithRetry = async (url, headers, options = {}) => {
  const axiosOpts = {
    headers,
    timeout: REQUEST_TIMEOUT_MS,
    ...(options.allowInsecureTls ? { httpsAgent: insecureAgent } : {}),
  };
  let lastError;
  for (let attempt = 0; attempt <= RETRY_ON_5XX; attempt++) {
    try {
      return await axios.get(url, axiosOpts);
    } catch (err) {
      if (!isRetriable(err) || attempt === RETRY_ON_5XX) throw err;
      await sleep(RETRY_BACKOFF_MS * (attempt + 1));
      lastError = err;
    }
  }
  throw lastError;
};

export const fetchProductsList = async (bankBaseUrl, options = {}) => {
  const url = `${bankBaseUrl}/banking/products`;
  const res = await fetchWithVersionNegotiation(url, LIST_HEADERS, options);
  return res.data?.data?.products || [];
};

export const fetchProductDetail = async (bankBaseUrl, productId, options = {}) => {
  const url = `${bankBaseUrl}/banking/products/${productId}`;
  const res = await fetchWithVersionNegotiation(url, DETAIL_HEADERS, options);
  return res.data?.data?.product || res.data?.data || {};
};

export const summariseError = (err) => {
  if (err.code === 'CDR_NO_VERSION') return 'no-supported-x-v';
  const status = err.response?.status;
  const code = err.code;
  if (status) return `HTTP ${status}`;
  if (code) return code;
  return err.message;
};
