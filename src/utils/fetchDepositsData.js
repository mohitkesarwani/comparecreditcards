import axios from 'axios';
import banks from '../constants/banks.js';
import Deposit from '../models/Deposit.js';

const logRequest = (method, url, headers) => {
  const headerPairs = Object.entries(headers)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');
  console.log(`HTTP ${method.toUpperCase()} ${url} with headers: ${headerPairs}`);
};

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

const DEFAULT_X_V = process.env.DEFAULT_X_V || '4';
const RETRY_FROM_X_V = process.env.X_V_RETRY_FROM || '3';
const RETRY_TO_X_V = process.env.X_V_RETRY_TO || '4';

const axiosGetLogged = async (url, headers) => {
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

export const fetchDepositsData = async () => {
  console.log('Clearing existing deposit data');
  await Deposit.deleteMany({});

  for (const bank of banks) {
    console.log(`Fetching products for ${bank.name}`);
    try {
      const listUrl = `${bank.baseUrl}/banking/products`;
      const listRes = await axiosGetLogged(listUrl, LIST_HEADERS);
      const products = listRes.data?.data?.products || [];
      const deposits = products.filter(p =>
        p.productCategory === 'TRANS_AND_SAVINGS_ACCOUNTS' ||
        p.productCategory === 'TERM_DEPOSITS'
      );

      for (const item of deposits) {
        try {
          const detailUrl = `${bank.baseUrl}/banking/products/${item.productId}`;
          const detailRes = await axiosGetLogged(detailUrl, DETAIL_HEADERS);
          const detail = detailRes.data?.data?.product || detailRes.data?.data || {};

          const record = {
            bankName: bank.name,
            productId: item.productId,
            name: item.name || detail.name,
            brand: item.brand || detail.brand,
            brandName: detail.brandName,
            productCategory: item.productCategory,
            applicationUri: item.applicationUri || detail.applicationUri,
            lastUpdated: item.lastUpdated || detail.lastUpdated,
            description: item.description || detail.description,
            effectiveFrom: item.effectiveFrom,
            effectiveTo: item.effectiveTo,
            additionalInformation: item.additionalInformation || detail.additionalInformation,
            additionalInformationUri: item.additionalInformationUri || detail.additionalInformationUri,
            cardArt: detail.cardArt || [],
            feesAndPricing: {
              interestFreePeriod: detail.feesAndPricing?.interestFreePeriod || '',
              interestRates: (detail.feesAndPricing?.interestRates || []).map(ir => ({
                type: ir.type,
                rate: ir.rate,
                additionalInfo: ir.additionalInfo
              })),
              fees: (detail.feesAndPricing?.fees || []).map(f => ({
                type: f.type,
                amount: f.amount,
                currency: f.currency,
                additionalInfo: f.additionalInfo
              }))
            },
            fees: (detail.fees || []).map(f => ({
              name: f.name,
              feeType: f.feeType,
              amount: f.amount,
              balanceRate: f.balanceRate,
              transactionRate: f.transactionRate,
              currency: f.currency,
              additionalValue: f.additionalValue,
              additionalInfo: f.additionalInfo,
              additionalInfoUri: f.additionalInfoUri,
              type: f.type
            })),
            features: (detail.features || []).map(f => ({
              featureType: f.featureType,
              additionalValue: f.additionalValue,
              additionalInfo: f.additionalInfo,
              additionalInfoUri: f.additionalInfoUri
            })),
            constraints: (detail.constraints || []).map(c => ({
              constraintType: c.constraintType,
              additionalValue: c.additionalValue,
              additionalInfo: c.additionalInfo,
              additionalInfoUri: c.additionalInfoUri
            })),
            eligibility: (detail.eligibility || []).map(e => ({
              eligibilityType: e.eligibilityType,
              additionalValue: e.additionalValue,
              value: e.value,
              unit: e.unit,
              additionalInfo: e.additionalInfo,
              additionalInfoUri: e.additionalInfoUri
            })),
            depositRates: (detail.depositRates || []).map(d => ({
              depositRateType: d.depositRateType,
              rate: d.rate,
              calculationFrequency: d.calculationFrequency,
              applicationFrequency: d.applicationFrequency,
              additionalValue: d.additionalValue,
              additionalInfo: d.additionalInfo,
              additionalInfoUri: d.additionalInfoUri
            }))
          };

          await Deposit.findOneAndUpdate(
            { productId: record.productId },
            record,
            { upsert: true, new: true }
          );
          console.log(`Saved ${record.productId} from ${bank.name}`);
        } catch (err) {
          logApiError(`Failed to process product ${item.productId} from ${bank.name}`, err);
        }
      }
    } catch (err) {
      logApiError(`Failed to fetch product list from ${bank.name}`, err);
    }
  }
};
