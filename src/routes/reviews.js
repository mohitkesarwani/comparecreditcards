import express from 'express';
import Joi from 'joi';
import { addReviewToProduct } from '../services/engagementStore.js';

const router = express.Router();

const schema = Joi.object({
  userId: Joi.string().required(),
  entityId: Joi.string().required(),
  entityType: Joi.string()
    .valid('credit-cards', 'home-loans', 'deposit')
    .required(),
  rating: Joi.number().min(0).max(5).required(),
  commentText: Joi.string().min(1).required()
});

router.post('/', async (req, res) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    console.error('Validation error:', error.details.map(d => d.message).join(', '));
    return res.status(400).json({ message: 'Invalid review' });
  }
  try {
    const review = await addReviewToProduct(value.entityId, {
      name: value.userId,
      comment: value.commentText,
      stars: value.rating
    });
    res.status(201).json(review);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

export default router;
