import mongoose from 'mongoose';

const CreditCardSchema = new mongoose.Schema({
  bankName: { type: String, required: true },
  productId: { type: String, required: true },
  name: String,
  description: String,
  brand: String,
  lastUpdated: Date,
  fees: [mongoose.Schema.Types.Mixed],
  features: [mongoose.Schema.Types.Mixed],
  interestRates: [mongoose.Schema.Types.Mixed]
});

CreditCardSchema.index({ bankName: 1, productId: 1 }, { unique: true });

export default mongoose.model('CreditCard', CreditCardSchema);
