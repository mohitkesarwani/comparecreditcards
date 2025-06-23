import express from 'express';
import cors from 'cors';
import creditCardsRouter from './routes/creditCards.js';

export const startServer = () => {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(cors());
  app.use(express.json());

  app.use('/api/credit-cards', creditCardsRouter);

  app.use((req, res) => {
    res.status(404).send('Not Found');
  });

  app.listen(PORT, () => {
    console.log(`HTTP server running on port ${PORT}`);
  });
};
