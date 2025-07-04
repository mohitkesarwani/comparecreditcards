import express from 'express';
import cors from 'cors';
import axios from 'axios';
import creditCardsRouter from './routes/creditCards.js';
import residentialMortgagesRouter from './routes/residentialMortgages.js';
import interactionsRouter from './routes/interactions.js';
import engagementRoutes from './routes/engagementRoutes.js';
import { populateDummyEngagements } from './services/engagementStore.js';
import { mockAuth } from './middleware/auth.js';
import { connectDB } from './config/db.js';
import Referral from './models/Referral.js';
import Lead from './models/Lead.js';
import EmailEvent from './models/EmailEvent.js';

export const startServer = async () => {
  await connectDB();

  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(cors());
  app.use(express.json());
  app.use(mockAuth);

  await populateDummyEngagements();

  app.use('/api/residential-mortgages', residentialMortgagesRouter);
  app.use('/api/credit-cards', creditCardsRouter);
  app.use('/api/interactions', interactionsRouter);
  app.use('/api/products', engagementRoutes);

  app.post('/api/referrals', async (req, res) => {
    try {
      const referral = await Referral.create(req.body);
      res.status(201).json(referral);
    } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
    }
  });

  app.post('/api/leads', async (req, res) => {
    try {
      const lead = await Lead.create(req.body);
      const webhook = process.env.CRM_WEBHOOK_URL;
      if (webhook) {
        try {
          await axios.post(webhook, lead);
        } catch (err) {
          console.error('Failed to forward lead to CRM:', err.message);
        }
      }
      res.status(201).json(lead);
    } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
    }
  });

  app.post('/api/email-events', async (req, res) => {
    try {
      const event = await EmailEvent.create(req.body);
      res.status(201).json(event);
    } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
    }
  });

  app.use((req, res) => {
    res.status(404).send('Not Found');
  });

  app.listen(PORT, () => {
    console.log(`HTTP server running on port ${PORT}`);
  });
};
