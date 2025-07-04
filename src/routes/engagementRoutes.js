import express from 'express';
import { engagements, likedIpCache, getEngagement } from '../services/engagementStore.js';

const router = express.Router();

router.get('/:productId', (req, res) => {
  const { productId } = req.params;
  const data = getEngagement(productId);
  res.json(data);
});

router.post('/:productId/like', (req, res) => {
  const { productId } = req.params;
  const ip = req.ip;
  let ips = likedIpCache.get(productId);
  if (!ips) {
    ips = new Set();
    likedIpCache.set(productId, ips);
  }
  if (ips.has(ip)) {
    return res.status(429).json({ message: 'Already liked' });
  }
  ips.add(ip);
  const data = getEngagement(productId);
  data.likes += 1;
  res.json({ likes: data.likes });
});

router.post('/:productId/share', (req, res) => {
  const { productId } = req.params;
  const data = getEngagement(productId);
  data.shares += 1;
  res.json({ shares: data.shares });
});

router.get('/:productId/reviews', (req, res) => {
  const { productId } = req.params;
  const data = getEngagement(productId);
  res.json(data.reviews);
});

router.post('/:productId/review', (req, res) => {
  const { productId } = req.params;
  const { name, comment, stars } = req.body;
  if (!name || !comment || typeof stars !== 'number') {
    return res.status(400).json({ message: 'Invalid review' });
  }
  const data = getEngagement(productId);
  const review = { name, comment, stars, timestamp: new Date() };
  data.reviews.push(review);
  data.comments = data.reviews.length;
  data.rating = data.reviews.reduce((sum, r) => sum + r.stars, 0) / data.reviews.length;
  res.status(201).json(review);
});

export default router;
