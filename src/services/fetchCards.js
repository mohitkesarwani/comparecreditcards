import axios from 'axios';
import banks from '../constants/banks.js';
import CreditCard from '../models/CreditCard.js';

const logRequest = (method, url, headers) => {
  const headerPairs = Object.entries(headers)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');
  console.log(`HTTP ${method.toUpperCase()} ${url} with headers: ${headerPairs}`);
};

const DEFAULT_X_V = process.env.DEFAULT_X_V || '4';
const RETRY_FROM_X_V = process.env.X_V_RETRY_FROM || '3';
const RETRY_TO_X_V = process.env.X_V_RETRY_TO || '4';

const axiosGetWithRetry = async (url, headers) => {
  try {
    logRequest('get', url, headers);
    return await axios.get(url, { headers });
  } catch (err) {
    const version = headers['x-v'] || headers['X-V'];
    if (version === RETRY_FROM_X_V) {
      const retryHeaders = { ...headers, 'x-v': RETRY_TO_X_V };
      console.warn(
        `Request failed with x-v ${RETRY_FROM_X_V}. Retrying ${url} with x-v ${RETRY_TO_X_V}.`
      );
      logRequest('get', url, retryHeaders);
      return await axios.get(url, { headers: retryHeaders });
    }
    throw err;
  }
};

const DEFAULT_LIST_HEADERS = {
  'x-v': DEFAULT_X_V,
  Accept: 'application/json'
};

const DEFAULT_DETAIL_HEADERS = {
  'x-v': DEFAULT_X_V,
  Accept: 'application/json'
};

const LIST_HEADERS = process.env.GET_PRODUCTS_HEADERS
  ? JSON.parse(process.env.GET_PRODUCTS_HEADERS)
  : DEFAULT_LIST_HEADERS;

const DETAIL_HEADERS = process.env.GET_PRODUCT_DETAIL_HEADERS
  ? JSON.parse(process.env.GET_PRODUCT_DETAIL_HEADERS)
  : DEFAULT_DETAIL_HEADERS;

const logApiError = (prefix, err) => {
  const status = err.response?.status;
  const url = err.config?.url;
  let message = `${prefix}: ${err.message}`;
  if (status) {
    message += ` (status ${status})`;
  }
  if (url) {
    message += ` [${url}]`;
  }
  console.error(message);
  const reqHeaders = err.config?.headers;
  if (reqHeaders) {
    const headerPairs = Object.entries(reqHeaders)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
    console.error('Request headers:', headerPairs);
  }
  if (err.response?.data) {
    console.error('Response data:', JSON.stringify(err.response.data));
  }
  if (err.stack) {
    console.error(err.stack);
  }
};

export const fetchCards = async () => {
  for (const bank of banks) {
    console.log(`Fetching cards for ${bank.name}`);
    try {
      const listUrl = `${bank.baseUrl}/banking/products`;
      const listRes = await axiosGetWithRetry(listUrl, LIST_HEADERS);
      const products = listRes.data?.data?.products || [];
      const creditCards = products.filter(p => p.productCategory === 'CRED_AND_CHRG_CARDS');

      for (const product of creditCards) {
        try {
          const detailUrl = `${bank.baseUrl}/banking/products/${product.productId}`;
          const detailRes = await axiosGetWithRetry(detailUrl, DETAIL_HEADERS);
          const detail = detailRes.data?.data?.product || {};

          const record = {
            bankName: bank.name,
            productId: detail.productId,
            name: detail.name,
            description: detail.description,
            brand: detail.brand,
            brandName: detail.brandName,
            productCategory: detail.productCategory,
            applicationUri: detail.applicationUri,
            lastUpdated: detail.lastUpdated,
            additionalInformation: detail.additionalInformation || {},
            features: detail.features || [],
            constraints: detail.constraints || [],
            eligibility: detail.eligibility || [],
            fees: detail.fees || [],
            lendingRates: detail.lendingRates || []
          };

          await CreditCard.findOneAndUpdate(
            { bankName: bank.name, productId: detail.productId },
            record,
            { upsert: true, new: true }
          );
          console.log(`Saved ${detail.productId} from ${bank.name}`);
        } catch (err) {
          logApiError(`Failed to fetch product ${product.productId} from ${bank.name}`, err);
        }
      }
    } catch (err) {
      logApiError(`Failed to fetch product list from ${bank.name}`, err);
    }
  }
};
