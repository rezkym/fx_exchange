import mongoose from 'mongoose';

const cardSchema = new mongoose.Schema({
  cardNumber: {
    type: String,
    required: true,
    trim: true
  },
  cardName: {
    type: String,
    required: true,
    trim: true
  },
  expiredDate: {
    type: Date,
    required: true
  },
  cvv: {
    type: String,
    required: true,
    trim: true
  },
  bankAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankAccount',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'used', 'expired', 'blocked'],
    default: 'active'
  },
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    postalCode: String
  },
  useAccountAddress: {
    type: Boolean,
    default: true
  },
  lastUsedAt: Date,
  usageCount: {
    type: Number,
    default: 0
  },
  metadata: {
    type: Map,
    of: String
  },
  replacementHistory: [{
    replacedAt: {
      type: Date,
      default: Date.now
    },
    reason: {
      type: String,
      enum: ['expired', 'lost', 'compromised', 'damaged', 'upgrade', 'other'],
      default: 'other'
    },
    previousCardNumber: String,
    notes: String
  }],
  creationSource: {
    type: String,
    enum: ['initial', 'replacement', 'additional'],
    default: 'initial'
  },
  fraudFlags: {
    isHighRisk: {
      type: Boolean,
      default: false
    },
    riskScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    lastRiskAssessment: Date,
    flaggedReasons: [String]
  }
}, {
  timestamps: true
});

// Index untuk optimasi query
cardSchema.index({ bankAccount: 1, status: 1 });
cardSchema.index({ cardNumber: 1 });
cardSchema.index({ status: 1 });
cardSchema.index({ expiredDate: 1 });

// Auto-update status expired
cardSchema.pre('save', function(next) {
  if (this.expiredDate < new Date()) {
    this.status = 'expired';
  }
  next();
});

// Method untuk mark card sebagai used
cardSchema.methods.markAsUsed = function() {
  this.status = 'used';
  this.lastUsedAt = new Date();
  this.usageCount += 1;
  return this.save();
};

// Method untuk check apakah card masih valid
cardSchema.methods.isValid = function() {
  return this.status === 'active' && this.expiredDate > new Date();
};

export default mongoose.model('Card', cardSchema);
