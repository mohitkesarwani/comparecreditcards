import axios from 'axios';
import banks from '../data/banks.json' assert { type: 'json' };

export const fetchCardsFromBank = async (bank) => {
  try {
    const productsRes = await axios.get(`${bank.baseUrl}/banking/products`);
    const products = productsRes.data.data.products || [];

    const cardPromises = products.map(async (product) => {
      const detailRes = await axios.get(`${bank.baseUrl}/banking/products/${product.productId}`);
      return detailRes.data.data.product;
    });

    const cards = await Promise.all(cardPromises);
    return cards.map(card => ({ ...card, bankName: bank.bankName }));
  } catch (err) {
    console.error(`Error fetching cards from ${bank.bankName}:`, err.message);
    return [];
  }
};

export const getAllBanks = () => banks;
