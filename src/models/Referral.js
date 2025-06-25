import mongoose from 'mongoose';

const ReferralSchema = new mongoose.Schema({
  userId: String,
  cardId: String,
  partnerId: String,
  redirectUrl: String,
  isApproved: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Referral', ReferralSchema);
