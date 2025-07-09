import express from 'express';
import Joi from 'joi';
import { addCommentToProduct } from '../services/engagementStore.js';
import Engagement from '../models/Engagement.js';

const router = express.Router();

const schema = Joi.object({
  userId: Joi.string().trim().required(),
  entityId: Joi.string().required(),
  entityType: Joi.string()
    .valid('credit-cards', 'home-loans', 'deposit')
    .required(),
  commentText: Joi.string().min(1).required()
});

router.post('/', async (req, res) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    console.error('Validation error:', error.details.map(d => d.message).join(', '));
    return res.status(400).json({ message: 'Invalid comment' });
  }

  try {
    const comment = await addCommentToProduct(value.entityId, {
      userId: value.userId,
      comment: value.commentText
    });
    if (!comment) {
      return res.status(409).json({ message: 'Duplicate comment' });
    }
    res.status(201).json({
      userId: value.userId,
      entityId: value.entityId,
      entityType: value.entityType,
      commentText: comment.comment,
      createdAt: comment.timestamp
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

router.get('/', async (req, res) => {
  const { entityId } = req.query;
  if (!entityId) {
    return res.status(400).json({ message: 'entityId query param required' });
  }
  try {
    const doc = await Engagement.findOne({ productId: entityId }).lean();
    const comments = (doc?.comments || [])
      .sort((a, b) => b.timestamp - a.timestamp)
      .map(c => ({
        userId: c.userId,
        entityId,
        commentText: c.comment,
        createdAt: c.timestamp
      }));
    res.json(comments);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

export default router;
