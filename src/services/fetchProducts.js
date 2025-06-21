import axios from 'axios';
import banks from '../constants/banks.js';
import CreditCard from '../models/CreditCard.js';

const CREDIT_CARD_CATEGORIES = ['TRANS_AND_SAVINGS_ACCOUNTS', 'CREDIT_CARDS'];

export const fetchProducts = async () => {
  for (const bank of banks) {
    console.log(`Fetching products for ${bank.name}`);
    try {
      const listRes = await axios.get(`${bank.baseUrl}/banking/products`);
      const products = listRes.data?.data?.products || [];
      const creditCards = products.filter(p =>
        CREDIT_CARD_CATEGORIES.includes(p.productCategory)
      );
      for (const product of creditCards) {
        try {
          const detailRes = await axios.get(`${bank.baseUrl}/banking/products/${product.productId}`);
          const detail = detailRes.data?.data?.product || {};
          const record = {
            bankName: bank.name,
            productId: detail.productId,
            name: detail.name,
            description: detail.description,
            brand: detail.brand,
            lastUpdated: detail.lastUpdated,
            fees: detail.fees || [],
            features: detail.features || [],
            interestRates: detail.interestRates || []
          };

          await CreditCard.findOneAndUpdate(
            { bankName: bank.name, productId: detail.productId },
            record,
            { upsert: true, new: true }
          );
          console.log(`Saved ${detail.productId} from ${bank.name}`);
        } catch (err) {
          console.error(`Error processing ${product.productId} from ${bank.name}:`, err.message);
        }
      }
    } catch (err) {
      console.error(`Error fetching product list from ${bank.name}:`, err.message);
    }
  }
};
