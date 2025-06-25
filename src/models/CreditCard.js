import mongoose from 'mongoose';

// Stores images representing the card
const cardArtSchema = new mongoose.Schema({
  imageUri: String,
  title: String
}, { _id: false });

// Interest rates for fees and pricing block
const interestRateSchema = new mongoose.Schema({
  type: String,
  rate: Number,
  additionalInfo: String
}, { _id: false });

// Generic fee model used in old and new endpoints
const feeSchema = new mongoose.Schema({
  name: String,
  feeType: String,
  type: String,
  amount: Number,
  balanceRate: String,
  transactionRate: String,
  currency: String,
  additionalValue: String,
  additionalInfo: String,
  additionalInfoUri: String
}, { _id: false });

const feesAndPricingSchema = new mongoose.Schema({
  interestFreePeriod: String,
  interestRates: [interestRateSchema],
  fees: [feeSchema]
}, { _id: false });

const featureSchema = new mongoose.Schema({
  featureType: String,
  additionalValue: String,
  additionalInfo: String,
  additionalInfoUri: String
}, { _id: false });

const constraintSchema = new mongoose.Schema({
  constraintType: String,
  additionalValue: String,
  additionalInfo: String,
  additionalInfoUri: String
}, { _id: false });

const eligibilitySchema = new mongoose.Schema({
  eligibilityType: String,
  additionalValue: String,
  value: mongoose.Schema.Types.Mixed,
  unit: String,
  additionalInfo: String,
  additionalInfoUri: String
}, { _id: false });

const lendingRateSchema = new mongoose.Schema({
  lendingRateType: String,
  rateType: String,
  rate: mongoose.Schema.Types.Mixed,
  comparisonRate: Number,
  applicationFrequency: String,
  calculationFrequency: String,
  additionalValue: String,
  additionalInfo: String,
  additionalInfoUri: String
}, { _id: false });

const CreditCardSchema = new mongoose.Schema({
  bankName: String,
  productId: { type: String, unique: true },
  name: String,
  brand: String,
  brandName: String,
  productCategory: String,
  applicationUri: String,
  lastUpdated: Date,
  description: String,
  effectiveFrom: Date,
  effectiveTo: Date,
  additionalInformation: mongoose.Schema.Types.Mixed,
  additionalInformationUri: String,
  cardArt: [cardArtSchema],
  feesAndPricing: feesAndPricingSchema,
  fees: [feeSchema],
  features: [featureSchema],
  constraints: [constraintSchema],
  eligibility: [eligibilitySchema],
  lendingRates: [lendingRateSchema],
  isSponsored: { type: Boolean, default: false },
  sponsorRank: { type: Number, default: 0 }
}, { timestamps: true });

CreditCardSchema.index({ productId: 1 }, { unique: true });

export default mongoose.model('CreditCard', CreditCardSchema);
