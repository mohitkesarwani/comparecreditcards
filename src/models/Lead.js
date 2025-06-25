import mongoose from 'mongoose';

const LeadSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  productType: String,
  sourcePage: String,
  status: { type: String, default: 'new' },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Lead', LeadSchema);
