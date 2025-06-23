import express from 'express';
import ResidentialMortgage from '../models/ResidentialMortgage.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const mortgages = await ResidentialMortgage.find({});
    res.json(mortgages);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});


router.get('/:id', async (req, res) => {
  try {
    let mortgage = await ResidentialMortgage.findById(req.params.id);
    if (!mortgage) {
      mortgage = await ResidentialMortgage.findOne({ productId: req.params.id });
    }
    if (!mortgage) return res.status(404).send('Mortgage not found');
    res.json(mortgage);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

export default router;
