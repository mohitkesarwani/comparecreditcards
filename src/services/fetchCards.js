import axios from 'axios';
import banks from '../constants/banks.js';
import CreditCard from '../models/CreditCard.js';

const DEFAULT_LIST_HEADERS = {
  'x-v': '4',
  Accept: 'application/json'
};

const DEFAULT_DETAIL_HEADERS = {
  'x-v': '4',
  Accept: 'application/json'
};

const LIST_HEADERS = process.env.GET_PRODUCTS_HEADERS
  ? JSON.parse(process.env.GET_PRODUCTS_HEADERS)
  : DEFAULT_LIST_HEADERS;

const DETAIL_HEADERS = process.env.GET_PRODUCT_DETAIL_HEADERS
  ? JSON.parse(process.env.GET_PRODUCT_DETAIL_HEADERS)
  : DEFAULT_DETAIL_HEADERS;

export const fetchCards = async () => {
  for (const bank of banks) {
    console.log(`Fetching cards for ${bank.name}`);
    try {
      const listRes = await axios.get(`${bank.baseUrl}/banking/products`, { headers: LIST_HEADERS });
      const products = listRes.data?.data?.products || [];
      const creditCards = products.filter(p => p.productCategory === 'CRED_AND_CHRG_CARDS');

      for (const product of creditCards) {
        try {
          const detailRes = await axios.get(`${bank.baseUrl}/banking/products/${product.productId}`, { headers: DETAIL_HEADERS });
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
          console.error(`Failed to fetch product ${product.productId} from ${bank.name}:`, err.message);
        }
      }
    } catch (err) {
      console.error(`Failed to fetch product list from ${bank.name}:`, err.message);
    }
  }
};
