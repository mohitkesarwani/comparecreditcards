import cron from 'node-cron';
import { fetchProducts } from '../services/fetchProducts.js';

export const startCronJob = () => {
  const schedule = process.env.CRON_SCHEDULE || '0 */12 * * *';
  console.log(`Cron job scheduled with ${schedule}`);
  cron.schedule(schedule, async () => {
    console.log('Cron job started');
    await fetchProducts();
    console.log('Cron job finished');
  });
};
