import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  name: String,
  comment: String,
  stars: Number,
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const EngagementSchema = new mongoose.Schema({
  productId: { type: String, index: true, unique: true },
  likes: { type: Number, default: 0 },
  shares: { type: Number, default: 0 },
  comments: { type: Number, default: 0 },
  rating: { type: Number, default: 0 },
  reviews: [reviewSchema]
});

export default mongoose.model('Engagement', EngagementSchema);
