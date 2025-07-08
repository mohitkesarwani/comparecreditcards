import express from 'express';
import ResidentialMortgage from '../models/ResidentialMortgage.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [stats] = await ResidentialMortgage.aggregate([
      { $unwind: '$lendingRates' },
      { $match: { 'lendingRates.rate': { $type: 'number' } } },
      {
        $group: {
          _id: null,
          minRate: { $min: '$lendingRates.rate' },
          maxRate: { $max: '$lendingRates.rate' }
        }
      }
    ]);
    const total = await ResidentialMortgage.countDocuments();
    res.json({
      minInterestRate: stats ? stats.minRate : null,
      maxInterestRate: stats ? stats.maxRate : null,
      totalMortgages: total
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

export default router;
