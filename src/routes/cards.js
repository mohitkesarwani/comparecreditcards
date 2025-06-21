import { Router } from 'express';
import CreditCard from '../models/CreditCard.js';

const router = Router();

// GET /api/cards - return all stored credit cards
router.get('/', async (req, res) => {
  try {
    const cards = await CreditCard.find();
    res.json(cards);
  } catch (err) {
    console.error('Error fetching cards:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
