import mongoose from 'mongoose';

const SharedPostSchema = new mongoose.Schema({
  userId: String,
  sharedEntityId: mongoose.Schema.Types.ObjectId,
  sharedEntityType: { type: String, enum: ['creditCard', 'residential-mortgages', 'deposit'] },
  commentText: String,
  createdAt: { type: Date, default: Date.now }
});

SharedPostSchema.index({ sharedEntityId: 1, userId: 1 });

export default mongoose.model('SharedPost', SharedPostSchema);
