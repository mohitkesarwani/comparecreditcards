import 'dotenv/config';
import { connectDB } from './config/db.js';
import { startCronJob } from './jobs/cronJob.js';

const start = async () => {
  await connectDB();
  startCronJob();
};

start();
