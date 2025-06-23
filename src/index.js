import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import { startCronJob } from './jobs/cronJob.js';
import { startMortgageCronJob } from './jobs/mortgageCronJob.js';
import creditCardsRouter from './routes/creditCards.js';
import residentialMortgagesRouter from './routes/residentialMortgages.js';

const start = async () => {
  await connectDB();

  const app = express();
  app.use(cors());

  app.use('/api/residential-mortgages', residentialMortgagesRouter);
  app.use('/api/credit-cards', creditCardsRouter);

  app.use((req, res) => {
    res.status(404).send('Not Found');
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`HTTP server running on port ${PORT}`);
  });

  startCronJob();
  startMortgageCronJob();
};

start();
