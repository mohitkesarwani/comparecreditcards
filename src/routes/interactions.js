import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import Interaction from '../models/Interaction.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

const sanitize = text => text.replace(/</g, '&lt;').replace(/>/g, '&gt;');

const getDoc = async (productId, type) => {
  let doc = await Interaction.findOne({ productId, type });
  if (!doc) {
    doc = await Interaction.create({ productId, type });
  }
  return doc;
};

router.get('/:productId', async (req, res) => {
  const { productId } = req.params;
  const { type, limit = 5 } = req.query;
  if (!type) {
    return res.status(400).json({ message: 'type query param required' });
  }
  const doc = await Interaction.findOne({ productId, type });
  if (!doc) {
    return res.json({ productId, type, likeCount: 0, comments: [], shareCount: 0 });
  }
  const comments = [...doc.comments]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, Number(limit));
  res.json({
    productId: doc.productId,
    type: doc.type,
    likeCount: doc.likes.length,
    comments,
    shareCount: doc.shareCount
  });
});

router.post('/:productId/like', requireAuth, async (req, res) => {
  const { productId } = req.params;
  const { type } = req.query;
  if (!type) {
    return res.status(400).json({ message: 'type query param required' });
  }
  const userId = req.user.id;
  const doc = await getDoc(productId, type);
  const idx = doc.likes.findIndex(l => l.userId === userId);
  if (idx >= 0) {
    doc.likes.splice(idx, 1);
  } else {
    doc.likes.push({ userId, timestamp: new Date() });
  }
  await doc.save();
  res.json({ likeCount: doc.likes.length });
});

router.post('/:productId/comment', requireAuth, async (req, res) => {
  const { productId } = req.params;
  const { type } = req.query;
  const { text } = req.body;
  if (!type) {
    return res.status(400).json({ message: 'type query param required' });
  }
  if (!text || text.length > 300) {
    return res.status(400).json({ message: 'Invalid comment' });
  }
  const doc = await getDoc(productId, type);
  const comment = {
    commentId: uuidv4(),
    userId: req.user.id,
    username: req.user.username,
    text: sanitize(text),
    timestamp: new Date()
  };
  doc.comments.push(comment);
  await doc.save();
  res.status(201).json(comment);
});

router.post('/:productId/share', async (req, res) => {
  const { productId } = req.params;
  const { type } = req.query;
  if (!type) {
    return res.status(400).json({ message: 'type query param required' });
  }
  const doc = await getDoc(productId, type);
  doc.shareCount += 1;
  await doc.save();
  res.json({ shareCount: doc.shareCount });
});

export default router;
