import mongoose from 'mongoose';

const feeHistorySchema = new mongoose.Schema({
  topUpId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TopUp',
    required: true
  },
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankProvider',
    required: true
  },
  topUpMethod: {
    type: String,
    enum: ['bank_transfer_idr', 'debit_card_idr', 'third_party_purchase', 'multi_step_routing'],
    required: true
  },
  currency: {
    type: String,
    required: true,
    uppercase: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  feeAmount: {
    type: Number,
    required: true,
    min: 0
  },
  feePercentage: {
    type: Number,
    min: 0,
    max: 100
  },
  cardType: {
    type: String,
    enum: ['individual', 'corporate', 'not_applicable']
  },
  exchangeRate: {
    type: Number,
    min: 0
  },
  processingTime: {
    actual: String, // "15 minutes", "2 hours", etc.
    estimated: String
  },
  feeBreakdown: {
    providerFee: Number,
    exchangeFee: Number,
    processingFee: Number,
    thirdPartyFee: Number,
    otherFees: Number
  },
  // Machine Learning Features
  dayOfWeek: {
    type: Number,
    min: 0,
    max: 6 // 0 = Sunday, 6 = Saturday
  },
  hourOfDay: {
    type: Number,
    min: 0,
    max: 23
  },
  isWeekend: {
    type: Boolean,
    default: false
  },
  isHoliday: {
    type: Boolean,
    default: false
  },
  marketConditions: {
    usdIdrRate: Number,
    eurIdrRate: Number,
    audIdrRate: Number,
    volatilityIndex: Number
  },
  // Analytics and Patterns
  userBehavior: {
    isRepeatUser: Boolean,
    frequencyScore: Number, // How often user does this type of topup
    averageAmount: Number,
    preferredTime: String
  },
  prediction: {
    predictedFee: Number,
    actualFee: Number,
    predictionAccuracy: Number,
    modelVersion: String
  },
  tags: [String], // For categorization and filtering
  notes: String
}, {
  timestamps: true
});

// Indexes for analytics and machine learning queries
feeHistorySchema.index({ provider: 1, topUpMethod: 1, currency: 1 });
feeHistorySchema.index({ amount: 1, feeAmount: 1 });
feeHistorySchema.index({ createdAt: 1, dayOfWeek: 1 });
feeHistorySchema.index({ cardType: 1, feePercentage: 1 });
feeHistorySchema.index({ exchangeRate: 1, currency: 1 });

// Methods for analytics
feeHistorySchema.statics.getFeeAnalytics = async function(filters = {}) {
  const pipeline = [
    { $match: filters },
    {
      $group: {
        _id: {
          provider: '$provider',
          method: '$topUpMethod',
          currency: '$currency'
        },
        avgFeePercentage: { $avg: '$feePercentage' },
        minFee: { $min: '$feeAmount' },
        maxFee: { $max: '$feeAmount' },
        avgAmount: { $avg: '$amount' },
        count: { $sum: 1 }
      }
    }
  ];
  
  return this.aggregate(pipeline);
};

feeHistorySchema.statics.predictFee = async function(amount, currency, method, provider) {
  // Simple prediction based on historical data
  const historicalData = await this.find({
    currency,
    topUpMethod: method,
    provider,
    amount: { $gte: amount * 0.8, $lte: amount * 1.2 } // Similar amounts
  }).sort({ createdAt: -1 }).limit(10);
  
  if (historicalData.length === 0) return null;
  
  const avgFeePercentage = historicalData.reduce((sum, record) => 
    sum + record.feePercentage, 0) / historicalData.length;
  
  return {
    predictedFee: amount * (avgFeePercentage / 100),
    confidence: Math.min(historicalData.length * 10, 100),
    basedOnSamples: historicalData.length
  };
};

// Pre-save hook to calculate derived fields
feeHistorySchema.pre('save', function(next) {
  const now = new Date();
  this.dayOfWeek = now.getDay();
  this.hourOfDay = now.getHours();
  this.isWeekend = (this.dayOfWeek === 0 || this.dayOfWeek === 6);
  
  if (this.amount > 0 && this.feeAmount >= 0) {
    this.feePercentage = (this.feeAmount / this.amount) * 100;
  }
  
  next();
});

export default mongoose.model('FeeHistory', feeHistorySchema);

