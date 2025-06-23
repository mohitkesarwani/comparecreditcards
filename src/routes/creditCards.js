import express from 'express';
import CreditCard from '../models/CreditCard.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const cards = await CreditCard.find({});
    res.json(cards);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

router.get('/:id', async (req, res) => {
  try {
    let card = await CreditCard.findById(req.params.id);
    if (!card) {
      card = await CreditCard.findOne({ productId: req.params.id });
    }
    if (!card) return res.status(404).send('Card not found');
    res.json(card);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

export default router;
