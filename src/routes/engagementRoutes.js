import express from 'express';
import {
  likedIpCache,
  getEngagement,
  incrementLike,
  incrementShare,
  addReviewToProduct
} from '../services/engagementStore.js';

const router = express.Router();

router.get('/:productId', async (req, res) => {
  const { productId } = req.params;
  const data = await getEngagement(productId);
  res.json(data);
});

router.post('/:productId/like', async (req, res) => {
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
  const likes = await incrementLike(productId);
  res.json({ likes });
});

router.post('/:productId/share', async (req, res) => {
  const { productId } = req.params;
  const shares = await incrementShare(productId);
  res.json({ shares });
});

router.get('/:productId/reviews', async (req, res) => {
  const { productId } = req.params;
  const data = await getEngagement(productId);
  res.json(data.reviews);
});

router.post('/:productId/review', async (req, res) => {
  const { productId } = req.params;
  const { name, comment, stars } = req.body;
  if (!name || !comment || typeof stars !== 'number') {
    return res.status(400).json({ message: 'Invalid review' });
  }
  const review = await addReviewToProduct(productId, {
    name,
    comment,
    stars
  });
  res.status(201).json(review);
});

export default router;
