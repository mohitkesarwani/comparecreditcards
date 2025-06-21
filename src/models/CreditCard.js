import mongoose from 'mongoose';

const CreditCardSchema = new mongoose.Schema({
  bankName: String,
  productId: String,
  name: String,
  description: String,
  brand: String,
  brandName: String,
  productCategory: String,
  applicationUri: String,
  lastUpdated: Date,
  additionalInformation: {
    overviewUri: String,
    termsUri: String,
    eligibilityUri: String,
    feesAndPricingUri: String,
    bundleUri: String,
  },
  features: [{
    featureType: String,
    additionalValue: String,
    additionalInfo: String,
    additionalInfoUri: String,
  }],
  constraints: [{
    constraintType: String,
    additionalValue: String,
    additionalInfo: String,
    additionalInfoUri: String,
  }],
  eligibility: [{
    eligibilityType: String,
    additionalValue: String,
    additionalInfo: String,
    additionalInfoUri: String,
  }],
  fees: [{
    name: String,
    feeType: String,
    amount: String,
    balanceRate: String,
    transactionRate: String,
    currency: String,
    additionalValue: String,
    additionalInfo: String,
    additionalInfoUri: String,
  }],
  lendingRates: [{
    lendingRateType: String,
    rate: String,
    applicationFrequency: String,
    calculationFrequency: String,
    additionalValue: String,
    additionalInfo: String,
    additionalInfoUri: String,
  }],
}, { timestamps: true });

CreditCardSchema.index({ bankName: 1, productId: 1 }, { unique: true });

export default mongoose.model('CreditCard', CreditCardSchema);
