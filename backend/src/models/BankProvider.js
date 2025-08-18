import mongoose from 'mongoose';

const bankProviderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  supportedCurrencies: [{
    type: String,
    uppercase: true,
    trim: true
  }],
  // Note: No API integration - manual tracking only
  metadata: {
    type: Map,
    of: String // For storing any additional provider info
  },
  topUpMethods: [{
    method: {
      type: String,
      enum: ['bank_transfer', 'debit_card', 'third_party', 'multi_step'],
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    minimumAmounts: {
      type: Map,
      of: Number // { 'EUR': 2, 'AUD': 5, 'USD': 0 }
    },
    fees: {
      type: Map,
      of: String // Fee calculation formula or API endpoint
    },
    processingTime: {
      type: String, // e.g., "instant", "1-3 hours", "1 day"
      default: "unknown"
    }
  }],
  cardLimits: {
    maxActiveCards: {
      type: Number,
      default: 3
    },
    maxReplacementsPerDay: {
      type: Number,
      default: 3
    },
    maxCreationsPerDay: {
      type: Number,
      default: 3
    }
  },
  transferRoutes: [{
    targetProvider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BankProvider'
    },
    supportedCurrencies: [String],
    averageProcessingTime: String,
    isActive: {
      type: Boolean,
      default: true
    }
  }]
}, {
  timestamps: true
});

// Index untuk optimasi query
bankProviderSchema.index({ code: 1 });
bankProviderSchema.index({ isActive: 1 });

export default mongoose.model('BankProvider', bankProviderSchema);
