import mongoose from 'mongoose';

const EmailEventSchema = new mongoose.Schema({
  userId: String,
  emailType: String,
  campaign: String,
  sentAt: Date,
  openedAt: Date
});

export default mongoose.model('EmailEvent', EmailEventSchema);
