import cron from 'node-cron';
import CreditCard from '../models/CreditCard.js';
import { fetchCardsFromBank, getAllBanks } from '../services/fetchCards.js';
import dotenv from 'dotenv';

dotenv.config();

export const startCardSync = () => {
  const schedule = process.env.CRON_SCHEDULE || '0 */12 * * *';

  cron.schedule(schedule, async () => {
    console.log('Running card sync job');
    const banks = getAllBanks();

    for (const bank of banks) {
      const cards = await fetchCardsFromBank(bank);
      for (const card of cards) {
        try {
          await CreditCard.findOneAndUpdate(
            { productId: card.productId },
            card,
            { upsert: true, new: true }
          );
        } catch (err) {
          console.error('Error saving card:', err.message);
        }
      }
    }
  });
};
