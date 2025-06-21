import mongoose from 'mongoose';

const CreditCardSchema = new mongoose.Schema({
  bankName: { type: String, required: true },
  productId: { type: String, required: true, unique: true },
  name: String,
  description: String,
  brand: String,
  lastUpdated: Date,
  interestRates: [String],
  fees: [String],
  features: [String],
  cardType: String,
  additionalInfo: mongoose.Schema.Types.Mixed
});

export default mongoose.model('CreditCard', CreditCardSchema);
