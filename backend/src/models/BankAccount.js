import mongoose from 'mongoose';

const bankAccountSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankProvider',
    required: true
  },
  accountNumber: {
    type: String,
    required: true,
    trim: true
  },
  currency: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    postalCode: String
  },
  metadata: {
    type: Map,
    of: String
  }
}, {
  timestamps: true
});

// Index untuk optimasi query
bankAccountSchema.index({ provider: 1, currency: 1 });
bankAccountSchema.index({ accountNumber: 1 });
bankAccountSchema.index({ isActive: 1 });

// Validasi currency harus ada di supported currencies provider
bankAccountSchema.pre('save', async function(next) {
  if (this.isModified('currency') || this.isModified('provider')) {
    try {
      const provider = await mongoose.model('BankProvider').findById(this.provider);
      if (!provider || !provider.supportedCurrencies.includes(this.currency)) {
        throw new Error(`Currency ${this.currency} tidak didukung oleh provider ${provider?.name}`);
      }
    } catch (error) {
      return next(error);
    }
  }
  next();
});

export default mongoose.model('BankAccount', bankAccountSchema);
