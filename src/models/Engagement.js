import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema(
  {
    name: String,
    userId: String,
    comment: String,
    timestamp: { type: Date, default: Date.now }
  },
  { _id: false }
);

const reviewSchema = new mongoose.Schema(
  {
    name: String,
    userId: String,
    comment: String,
    stars: Number,
    timestamp: { type: Date, default: Date.now }
  },
  { _id: false }
);

const EngagementSchema = new mongoose.Schema({
  productId: { type: String, index: true, unique: true },
  productType: {
    type: String,
    enum: ['credit-card', 'home-loan', 'deposit'],
    required: false
  },
  likes: { type: Number, default: 0 },
  shares: { type: Number, default: 0 },
  comments: [commentSchema],
  reviews: [reviewSchema],
  rating: { type: Number, default: 0 }
});

export default mongoose.model('Engagement', EngagementSchema);
