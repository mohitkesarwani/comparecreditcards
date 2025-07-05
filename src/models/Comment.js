import mongoose from 'mongoose';

const CommentSchema = new mongoose.Schema({
  productId: { type: String, index: true },
  userId: { type: String, index: true },
  comment: String,
  rating: Number,
  timestamp: { type: Date, default: Date.now }
});

export default mongoose.model('Comment', CommentSchema);
