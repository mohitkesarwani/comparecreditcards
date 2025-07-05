import express from 'express';
import Joi from 'joi';
import Comment from '../models/Comment.js';

const router = express.Router();

const schema = Joi.object({
  productId: Joi.string().required(),
  userId: Joi.string().required(),
  comment: Joi.string().min(1).max(300).required(),
  rating: Joi.number().min(1).max(5).required(),
  timestamp: Joi.string().isoDate().required()
});

router.post('/', async (req, res) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ message: 'Invalid comment' });
  }
  try {
    const comment = await Comment.create(value);
    res.status(201).json(comment);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

router.get('/', async (req, res) => {
  const { productId } = req.query;
  if (!productId) {
    return res.status(400).json({ message: 'productId query param required' });
  }
  try {
    const comments = await Comment.find({ productId })
      .sort({ timestamp: -1 })
      .lean();
    res.json(comments);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

export default router;
