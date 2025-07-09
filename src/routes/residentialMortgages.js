import express from 'express';
import mongoose from 'mongoose';
import ResidentialMortgage from '../models/ResidentialMortgage.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    let { cursor, limit = 20, minInterestRate, maxInterestRate } = req.query;
    limit = parseInt(limit, 10);

    if (isNaN(limit) || limit < 1) {
      return res.status(400).json({ message: 'Invalid limit parameter' });
    }

    // Enforce maximum page size
    const maxLimit = 50;
    if (limit > maxLimit) limit = maxLimit;

    const query = {};

    // Handle interest rate filters
    let minRate = parseFloat(minInterestRate);
    let maxRate = parseFloat(maxInterestRate);
    if (isNaN(minRate)) minRate = null;
    if (isNaN(maxRate)) maxRate = null;

    if ((minRate === 0 || minRate === null) && (maxRate === 0 || maxRate === null)) {
      minRate = null;
      maxRate = null;
    }

    if (minRate !== null && maxRate !== null && maxRate < minRate) {
      minRate = null;
      maxRate = null;
    }

    if (minRate !== null || maxRate !== null) {
      const rateFilter = {};
      if (minRate !== null) rateFilter.$gte = minRate;
      if (maxRate !== null) rateFilter.$lte = maxRate;
      query['lendingRates.rate'] = rateFilter;
    }
    if (cursor) {
      if (!mongoose.Types.ObjectId.isValid(cursor)) {
        return res.status(400).json({ message: 'Invalid cursor parameter' });
      }
      query._id = { $gt: new mongoose.Types.ObjectId(cursor) };
    }

    // Fetch one extra to determine if there are more results
    const records = await ResidentialMortgage.find(query)
      .sort({ _id: 1 })
      .limit(limit + 1);

    const hasMore = records.length > limit;
    const data = hasMore ? records.slice(0, limit) : records;
    const nextCursor = hasMore ? data[data.length - 1]._id.toString() : null;

    res.json({ data, nextCursor, hasMore });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

router.get('/rate-range', async (req, res) => {
  try {
    // Only select the lendingRates.rate fields to minimise data transfer
    const mortgages = await ResidentialMortgage.find({}, 'lendingRates.rate').lean();

    const rates = [];
    for (const mortgage of mortgages) {
      if (Array.isArray(mortgage.lendingRates)) {
        for (const lr of mortgage.lendingRates) {
          const rate = parseFloat(lr.rate);
          if (!isNaN(rate)) {
            rates.push(rate);
          }
        }
      }
    }

    let minRate = 0.05;
    let maxRate = 0.15;

    if (rates.length > 0) {
      minRate = Math.min(...rates);
      maxRate = Math.max(...rates);
    }

    res.json({ minRate, maxRate });
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
