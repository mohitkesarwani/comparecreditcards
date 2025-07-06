import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const depositConnection = mongoose.createConnection(
  process.env.MONGO_DEPOSIT_URI || 'mongodb://localhost:27017/deposits'
);

const cardArtSchema = new mongoose.Schema({
  imageUri: String,
  title: String
}, { _id: false });

const interestRateSchema = new mongoose.Schema({
  type: String,
  rate: Number,
  additionalInfo: String
}, { _id: false });

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

const depositRateSchema = new mongoose.Schema({
  depositRateType: String,
  rate: mongoose.Schema.Types.Mixed,
  calculationFrequency: String,
  applicationFrequency: String,
  additionalValue: String,
  additionalInfo: String,
  additionalInfoUri: String
}, { _id: false });

const DepositSchema = new mongoose.Schema({
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
  depositRates: [depositRateSchema],
  shareCount: { type: Number, default: 0 }
}, { timestamps: true });

DepositSchema.index({ productId: 1 }, { unique: true });

export default depositConnection.model('Deposit', DepositSchema);
