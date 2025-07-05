import express from 'express';
import Joi from 'joi';
import mongoose from 'mongoose';
import Comment from '../models/Comment.js';

const router = express.Router();

const schema = Joi.object({
  userId: Joi.string().trim().required(),
  entityId: Joi.string().required(),
  entityType: Joi.string().valid('credit-cards', 'home-loans').required(),
  commentText: Joi.string().min(1).required()
});

router.post('/', async (req, res) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    console.error('Validation error:', error.details.map(d => d.message).join(', '));
    return res.status(400).json({ message: 'Invalid comment' });
  }

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(value.entityId)) {
    console.error('Invalid entityId:', value.entityId);
    return res.status(400).json({ message: 'Invalid comment' });
  }

  try {
    const comment = await Comment.create({
      userId: value.userId,
      entityId: value.entityId,
      entityType: value.entityType,
      commentText: value.commentText
    });
    res.status(201).json(comment);
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
    const comments = await Comment.find({ entityId })
      .sort({ createdAt: -1 })
      .lean();
    res.json(comments);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

export default router;
