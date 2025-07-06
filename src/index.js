import 'dotenv/config';
import { startServer } from './server.js';
import { startCronJob } from './jobs/cronJob.js';
import { startMortgageCronJob } from './jobs/mortgageCronJob.js';
import { startDepositCronJob } from './jobs/depositCronJob.js';

const start = async () => {
  await startServer();
  startCronJob();
  startMortgageCronJob();
  startDepositCronJob();
}; 

start();
