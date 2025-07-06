import express from 'express';
import Deposit from '../models/Deposit.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const deposits = await Deposit.find({});
    res.json(deposits);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

router.get('/:id', async (req, res) => {
  try {
    let deposit = await Deposit.findById(req.params.id);
    if (!deposit) {
      deposit = await Deposit.findOne({ productId: req.params.id });
    }
    if (!deposit) return res.status(404).send('Deposit not found');
    res.json(deposit);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

export default router;
