import mongoose from 'mongoose';

// Generic comments on entities such as credit cards or home loans
// This schema replaces the old productId based comment structure.
const CommentSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  entityType: {
    type: String,
    enum: ['credit-cards', 'home-loans'],
    required: true,
    index: true
  },
  commentText: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Comment', CommentSchema);
