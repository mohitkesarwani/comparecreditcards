import Engagement from '../models/Engagement.js';

export const engagements = new Map(); // in-memory cache
export const likedIpCache = new Map();
const TTL = 60 * 1000; // 1 minute

const setCache = (id, doc) => {
  engagements.set(id, { data: doc, expires: Date.now() + TTL });
};

export const getEngagement = async productId => {
  const cached = engagements.get(productId);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }
  let doc = await Engagement.findOne({ productId });
  if (!doc) {
    doc = await Engagement.create({ productId });
  }
  const data = doc.toObject();
  const result = {
    productId: data.productId,
    likes: data.likes || 0,
    shares: data.shares || 0,
    comments: data.comments ? data.comments.length : 0,
    reviews: data.reviews || [],
    rating: data.rating || 0
  };
  setCache(productId, result);
  return result;
};

export const incrementLike = async productId => {
  const doc = await Engagement.findOneAndUpdate(
    { productId },
    { $inc: { likes: 1 } },
    { new: true, upsert: true }
  );
  const data = await getEngagement(productId);
  data.likes = doc.likes;
  setCache(productId, data);
  return doc.likes;
};

export const incrementShare = async productId => {
  const doc = await Engagement.findOneAndUpdate(
    { productId },
    { $inc: { shares: 1 } },
    { new: true, upsert: true }
  );
  const data = await getEngagement(productId);
  data.shares = doc.shares;
  setCache(productId, data);
  return doc.shares;
};

export const addReviewToProduct = async (productId, review) => {
  review.timestamp = new Date();
  let doc = await Engagement.findOne({ productId });
  if (!doc) {
    doc = await Engagement.create({
      productId,
      reviews: [review],
      rating: review.stars || 0
    });
  } else {
    doc.reviews.push(review);
    const avg =
      doc.reviews.reduce((a, r) => a + (r.stars || 0), 0) / doc.reviews.length;
    doc.rating = Number(avg.toFixed(2));
    await doc.save();
  }
  const data = await getEngagement(productId);
  data.reviews = doc.reviews;
  data.rating = doc.rating;
  setCache(productId, data);
  return review;
};

export const addCommentToProduct = async (productId, comment) => {
  comment.timestamp = new Date();
  let doc = await Engagement.findOne({ productId });
  if (!doc) {
    doc = await Engagement.create({ productId, comments: [comment] });
  } else {
    doc.comments.push(comment);
    await doc.save();
  }
  const data = await getEngagement(productId);
  data.comments = doc.comments.length;
  setCache(productId, data);
  return comment;
};

export const clearEngagementCache = () => engagements.clear();

export const populateDummyEngagements = async () => {
  const count = await Engagement.countDocuments();
  if (count > 0) return;
  const sample = [
    {
      id: '123',
      likes: 10,
      shares: 4,
      reviews: [
        { name: 'Alice', comment: 'Great product', stars: 5 },
        { name: 'Bob', comment: 'Works well', stars: 4 },
        { name: 'Carol', comment: 'Pretty good', stars: 4 },
        { name: 'Dave', comment: 'Not bad', stars: 3 },
        { name: 'Eve', comment: 'Excellent', stars: 5 }
      ]
    },
    {
      id: '456',
      likes: 5,
      shares: 2,
      reviews: [
        { name: 'Frank', comment: 'Okay', stars: 3 },
        { name: 'Grace', comment: 'Nice', stars: 4 },
        { name: 'Heidi', comment: 'Could be better', stars: 2 },
        { name: 'Ivan', comment: 'Loved it', stars: 5 },
        { name: 'Judy', comment: 'Good value', stars: 4 }
      ]
    },
    {
      id: '789',
      likes: 7,
      shares: 3,
      reviews: [
        { name: 'Mallory', comment: 'Solid', stars: 4 },
        { name: 'Niaj', comment: 'Great', stars: 5 },
        { name: 'Olivia', comment: 'Decent', stars: 3 },
        { name: 'Peggy', comment: 'Fantastic', stars: 5 },
        { name: 'Trent', comment: 'Works for me', stars: 4 }
      ]
    }
  ];
  for (const item of sample) {
    const reviews = item.reviews.map(r => ({ ...r, timestamp: new Date() }));
    const rating =
      reviews.reduce((sum, r) => sum + r.stars, 0) / reviews.length;
    await Engagement.create({
      productId: item.id,
      likes: item.likes,
      shares: item.shares,
      comments: [],
      rating,
      reviews
    });
  }
};
