import mongoose from 'mongoose';

const likeSchema = new mongoose.Schema({
  userId: String,
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const commentSchema = new mongoose.Schema({
  commentId: String,
  userId: String,
  username: String,
  text: String,
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const InteractionSchema = new mongoose.Schema({
  productId: String,
  type: { type: String, enum: ['creditCard', 'residential-mortgages', 'deposit'] },
  likes: [likeSchema],
  comments: [commentSchema],
  shareCount: { type: Number, default: 0 }
}, { timestamps: true });

InteractionSchema.index({ productId: 1, type: 1 }, { unique: true });

export default mongoose.model('Interaction', InteractionSchema);
