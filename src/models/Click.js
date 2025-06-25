import mongoose from 'mongoose';

const ClickSchema = new mongoose.Schema({
  sessionId: String,
  productId: String,
  clickType: String,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Click', ClickSchema);
