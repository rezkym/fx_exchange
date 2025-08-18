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
  // Multi-currency wallets - setiap account bisa punya multiple currencies
  wallets: [{
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
    openedAt: {
      type: Date,
      default: Date.now
    }
  }],
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
bankAccountSchema.index({ provider: 1, 'wallets.currency': 1 });
bankAccountSchema.index({ accountNumber: 1 });
bankAccountSchema.index({ isActive: 1 });

// Validasi currency di wallets harus ada di supported currencies provider
bankAccountSchema.pre('save', async function(next) {
  if (this.isModified('wallets') || this.isModified('provider')) {
    try {
      const provider = await mongoose.model('BankProvider').findById(this.provider);
      if (!provider) {
        throw new Error('Provider tidak ditemukan');
      }
      
      // Validasi setiap currency di wallets
      for (const wallet of this.wallets) {
        if (!provider.supportedCurrencies.includes(wallet.currency)) {
          throw new Error(`Currency ${wallet.currency} tidak didukung oleh provider ${provider.name}`);
        }
      }
      
      // Cek duplicate currency
      const currencies = this.wallets.map(w => w.currency);
      const uniqueCurrencies = [...new Set(currencies)];
      if (currencies.length !== uniqueCurrencies.length) {
        throw new Error('Duplicate currency dalam satu account tidak diperbolehkan');
      }
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Method untuk menambah wallet currency baru
bankAccountSchema.methods.addCurrency = function(currency) {
  const existingWallet = this.wallets.find(w => w.currency === currency.toUpperCase());
  if (existingWallet) {
    throw new Error(`Currency ${currency} sudah ada di account ini`);
  }
  
  this.wallets.push({
    currency: currency.toUpperCase(),
    balance: 0,
    isActive: true,
    openedAt: new Date()
  });
  
  return this.save();
};

// Method untuk update balance wallet tertentu
bankAccountSchema.methods.updateWalletBalance = function(currency, amount) {
  const wallet = this.wallets.find(w => w.currency === currency.toUpperCase() && w.isActive);
  if (!wallet) {
    throw new Error(`Currency ${currency} tidak ditemukan atau tidak aktif`);
  }
  
  if (wallet.balance + amount < 0) {
    throw new Error(`Insufficient balance for ${currency}`);
  }
  
  wallet.balance += amount;
  return this.save();
};

// Method untuk mendapatkan total balance dalam USD (converted)
bankAccountSchema.methods.getTotalBalanceUSD = function() {
  // Simplified - dalam implementasi nyata bisa pakai rate conversion
  let total = 0;
  this.wallets.forEach(wallet => {
    if (wallet.currency === 'USD') {
      total += wallet.balance;
    }
    // Bisa ditambahkan logic conversion rate untuk currency lain
  });
  return total;
};

export default mongoose.model('BankAccount', bankAccountSchema);
