import express from 'express';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import cardsRoute from './routes/cards.js';
import { startCardSync } from './jobs/syncCards.js';

dotenv.config();

const app = express();
app.use(express.json());

app.use('/api/cards', cardsRoute);

const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  startCardSync();
  app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
});
