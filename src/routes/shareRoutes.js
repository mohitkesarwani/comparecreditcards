import express from 'express';
import SharedPost from '../models/SharedPost.js';
import CreditCard from '../models/CreditCard.js';
import ResidentialMortgage from '../models/ResidentialMortgage.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

const sanitize = text => text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
const validType = t => ['creditCard', 'homeLoan'].includes(t);

router.post('/share', requireAuth, async (req, res) => {
  const { sharedEntityId, sharedEntityType, commentText } = req.body;
  const userId = req.user.id;
  if (!sharedEntityId || !sharedEntityType) {
    return res.status(400).json({ message: 'Invalid body' });
  }
  if (!validType(sharedEntityType)) {
    return res.status(400).json({ message: 'Invalid sharedEntityType' });
  }
  const Model = sharedEntityType === 'creditCard' ? CreditCard : ResidentialMortgage;
  const entity = await Model.findById(sharedEntityId);
  if (!entity) {
    return res.status(404).json({ message: 'Entity not found' });
  }
  const sanitized = commentText ? sanitize(commentText) : undefined;
  const post = await SharedPost.create({
    userId,
    sharedEntityId,
    sharedEntityType,
    commentText: sanitized
  });
  await Model.findByIdAndUpdate(sharedEntityId, { $inc: { shareCount: 1 } });
  res.status(201).json(post);
});

router.get('/shared-posts/:userId', async (req, res) => {
  const { userId } = req.params;
  const posts = await SharedPost.find({ userId }).sort({ createdAt: -1 }).lean();
  const results = await Promise.all(posts.map(async p => {
    const Model = p.sharedEntityType === 'creditCard' ? CreditCard : ResidentialMortgage;
    const entity = await Model.findById(p.sharedEntityId).lean();
    return { ...p, entity };
  }));
  res.json(results);
});

router.get('/share-count/:entityType/:entityId', async (req, res) => {
  const { entityType, entityId } = req.params;
  if (!validType(entityType)) {
    return res.status(400).json({ message: 'Invalid entityType' });
  }
  const Model = entityType === 'creditCard' ? CreditCard : ResidentialMortgage;
  const entity = await Model.findById(entityId);
  if (!entity) {
    return res.status(404).json({ message: 'Entity not found' });
  }
  res.json({ shareCount: entity.shareCount || 0 });
});

export default router;
