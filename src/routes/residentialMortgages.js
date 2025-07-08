import express from 'express';
import mongoose from 'mongoose';
import ResidentialMortgage from '../models/ResidentialMortgage.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    let { cursor, limit = 20 } = req.query;
    limit = parseInt(limit, 10);

    if (isNaN(limit) || limit < 1) {
      return res.status(400).json({ message: 'Invalid limit parameter' });
    }

    // Enforce maximum page size
    const maxLimit = 50;
    if (limit > maxLimit) limit = maxLimit;

    const query = {};
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
