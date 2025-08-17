import mongoose from 'mongoose';

const topUpSchema = new mongoose.Schema({
  topUpId: {
    type: String,
    unique: true
  },
  bankAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankAccount',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  topUpMethod: {
    type: String,
    enum: ['bank_transfer_idr', 'debit_card_idr', 'third_party_purchase', 'multi_step_routing'],
    required: true
  },
  sourceDetails: {
    // For bank_transfer_idr
    sourceBank: String,
    sourceBankAccount: String,
    targetBank: String,
    targetBankAccount: String,
    nameMatching: {
      sourceName: String,
      targetName: String,
      isMatched: Boolean
    },
    
    // For debit_card_idr
    cardNumber: String,
    cardType: {
      type: String,
      enum: ['individual', 'corporate']
    },
    
    // For third_party_purchase
    vendor: String,
    vendorTransactionId: String,
    purchaseRate: Number,
    
    // For multi_step_routing
    routeSteps: [{
      stepNumber: Number,
      fromProvider: String,
      toProvider: String,
      fromCurrency: String,
      toCurrency: String,
      amount: Number,
      convertedAmount: Number,
      exchangeRate: Number,
      stepStatus: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
      },
      completedAt: Date,
      failureReason: String
    }],
    
    // Common fields
    referenceNumber: String,
    exchangeRate: Number
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  fee: {
    type: Number,
    default: 0
  },
  feeDetails: {
    providerFee: Number,
    exchangeFee: Number,
    processingFee: Number,
    thirdPartyFee: Number,
    userInputFee: Number, // Manual fee input dari user
    feeBreakdown: String,
    feeCalculationMethod: {
      type: String,
      enum: ['manual_input', 'calculated', 'api_retrieved'],
      default: 'manual_input'
    }
  },
  totalAmount: {
    type: Number,
    required: true
  },
  routeOptimization: {
    isSystemSuggested: {
      type: Boolean,
      default: false
    },
    isUserCustom: {
      type: Boolean,
      default: false
    },
    suggestedRoutes: [{
      routeId: String,
      totalFee: Number,
      estimatedTime: String,
      steps: Number,
      riskLevel: {
        type: String,
        enum: ['low', 'medium', 'high']
      }
    }],
    selectedRoute: String,
    selectionReason: String
  },
  description: {
    type: String,
    trim: true
  },
  metadata: {
    type: Map,
    of: String
  },
  completedAt: Date,
  failedAt: Date,
  failureReason: String
}, {
  timestamps: true
});

// Index untuk optimasi query
topUpSchema.index({ topUpId: 1 });
topUpSchema.index({ bankAccount: 1, status: 1 });
topUpSchema.index({ status: 1, createdAt: 1 });

// Auto-generate top up ID
topUpSchema.pre('save', function(next) {
  if (this.isNew && !this.topUpId) {
    this.topUpId = `TOP${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }
  next();
});

// Method untuk complete top up
topUpSchema.methods.complete = function() {
  this.status = 'completed';
  this.completedAt = new Date();
  return this.save();
};

// Method untuk fail top up
topUpSchema.methods.fail = function(reason) {
  this.status = 'failed';
  this.failedAt = new Date();
  this.failureReason = reason;
  return this.save();
};

export default mongoose.model('TopUp', topUpSchema);
