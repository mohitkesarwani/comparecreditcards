import 'dotenv/config';
import { connectDB } from './config/db.js';
import { startCronJob } from './jobs/cronJob.js';
import { startServer } from './server.js';

const start = async () => {
  await connectDB();
  startServer();
  startCronJob();
};

start();
