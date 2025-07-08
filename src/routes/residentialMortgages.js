import express from 'express';
import ResidentialMortgage from '../models/ResidentialMortgage.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    let { page = 1, limit = 20 } = req.query;
    page = parseInt(page, 10);
    limit = parseInt(limit, 10);
    if (isNaN(page) || isNaN(limit) || page < 1 || limit < 1) {
      return res.status(400).json({ message: 'Invalid pagination parameters' });
    }
    const skip = (page - 1) * limit;
    const [total, data] = await Promise.all([
      ResidentialMortgage.countDocuments({}),
      ResidentialMortgage.find({}).skip(skip).limit(limit)
    ]);
    res.json({ total, page, limit, data });
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
