import cron from 'node-cron';
import { fetchCards } from '../services/fetchCards.js';

export const startCronJob = () => {
  const defaultSchedule = '0 */12 * * *';
  const envSchedule = process.env.CRON_SCHEDULE;
  const schedule = cron.validate(envSchedule) ? envSchedule : defaultSchedule;

  if (envSchedule && envSchedule !== schedule) {
    console.warn(`Invalid CRON_SCHEDULE \"${envSchedule}\". Using \"${schedule}\" instead.`);
  }

  console.log(`Cron job scheduled with ${schedule}`);
  cron.schedule(schedule, async () => {
    console.log('Cron job started');
    await fetchCards();
    console.log('Cron job finished');
  });
};
