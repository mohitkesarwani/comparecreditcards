import cron from 'node-cron';
import { fetchMortgagesData } from '../utils/fetchMortgagesData.js';

const scheduleFromHours = hours => {
  if (hours >= 24) return '0 0 * * *';
  if (hours >= 1 && Number.isInteger(hours)) return `0 */${hours} * * *`;
  const minutes = Math.round(hours * 60);
  return `*/${minutes} * * * *`;
};

export const startMortgageCronJob = () => {
  const defaultHours = 12;
  const raw = process.env.CRON_SCHEDULE;
  const envHours = parseFloat(raw);
  const valid = !Number.isNaN(envHours) && envHours > 0 && envHours <= 24;
  let hours = valid ? envHours : defaultHours;

  if (!valid && raw) {
    console.warn(`Invalid CRON_SCHEDULE \"${raw}\". Using ${hours} hours instead.`);
  }

  let schedule = scheduleFromHours(hours);
  if (!cron.validate(schedule)) {
    console.warn(`Generated cron expression \"${schedule}\" is invalid. Falling back to ${defaultHours} hours.`);
    hours = defaultHours;
    schedule = scheduleFromHours(hours);
  }

  console.log(`Cron job scheduled every ${hours} hour(s) with expression \"${schedule}\"`);
  cron.schedule(schedule, async () => {
    console.log('Cron job started');
    await fetchMortgagesData();
    console.log('Cron job finished');
  });
};
