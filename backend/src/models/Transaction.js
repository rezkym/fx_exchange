import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    unique: true
  },
  fromAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankAccount',
    required: true
  },
  toAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankAccount',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  fromCurrency: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  toCurrency: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  exchangeRate: {
    type: Number,
    required: true
  },
  convertedAmount: {
    type: Number,
    required: true
  },
  fee: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  card: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Card'
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
transactionSchema.index({ transactionId: 1 });
transactionSchema.index({ fromAccount: 1, status: 1 });
transactionSchema.index({ toAccount: 1, status: 1 });
transactionSchema.index({ status: 1, createdAt: 1 });
transactionSchema.index({ fromCurrency: 1, toCurrency: 1 });

// Auto-generate transaction ID
transactionSchema.pre('save', function(next) {
  if (this.isNew && !this.transactionId) {
    this.transactionId = `TXN${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }
  next();
});

// Method untuk complete transaction
transactionSchema.methods.complete = function() {
  this.status = 'completed';
  this.completedAt = new Date();
  return this.save();
};

// Method untuk fail transaction
transactionSchema.methods.fail = function(reason) {
  this.status = 'failed';
  this.failedAt = new Date();
  this.failureReason = reason;
  return this.save();
};

export default mongoose.model('Transaction', transactionSchema);
