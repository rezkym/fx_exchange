import mongoose from 'mongoose';

const binLookupSchema = new mongoose.Schema({
  bin: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true,
    minlength: 6,
    maxlength: 8
  },
  number: {
    length: {
      type: Number,
      default: 16
    },
    luhn: {
      type: Boolean,
      default: true
    }
  },
  scheme: {
    type: String,
    trim: true,
    lowercase: true
  },
  type: {
    type: String,
    trim: true,
    lowercase: true
  },
  brand: {
    type: String,
    trim: true
  },
  prepaid: {
    type: Boolean,
    default: false
  },
  country: {
    numeric: String,
    alpha2: String,
    name: String,
    emoji: String,
    currency: String,
    latitude: Number,
    longitude: Number
  },
  bank: {
    name: String,
    url: String,
    phone: String,
    city: String
  },
  lookupCount: {
    type: Number,
    default: 1
  },
  lastLookupAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  metadata: {
    type: Map,
    of: String
  }
}, {
  timestamps: true
});

// Index untuk optimasi query
binLookupSchema.index({ bin: 1 });
binLookupSchema.index({ scheme: 1 });
binLookupSchema.index({ type: 1 });
binLookupSchema.index({ 'country.alpha2': 1 });
binLookupSchema.index({ 'bank.name': 1 });
binLookupSchema.index({ createdAt: -1 });

// Method untuk increment lookup count
binLookupSchema.methods.incrementLookup = function() {
  this.lookupCount += 1;
  this.lastLookupAt = new Date();
  return this.save();
};

// Static method untuk find atau create BIN
binLookupSchema.statics.findOrCreate = async function(binData) {
  const bin = binData.bin;
  let binLookup = await this.findOne({ bin });
  
  if (binLookup) {
    // Update existing record
    await binLookup.incrementLookup();
    return binLookup;
  } else {
    // Create new record
    binLookup = new this(binData);
    return await binLookup.save();
  }
};

// Virtual untuk BIN statistics
binLookupSchema.virtual('isPopular').get(function() {
  return this.lookupCount >= 10;
});

binLookupSchema.virtual('riskLevel').get(function() {
  // Simple risk assessment based on country and type
  const highRiskCountries = ['CN', 'RU', 'NG', 'BD'];
  const mediumRiskCountries = ['IN', 'PK', 'ID', 'PH'];
  
  if (this.country && highRiskCountries.includes(this.country.alpha2)) {
    return 'high';
  }
  
  if (this.country && mediumRiskCountries.includes(this.country.alpha2)) {
    return 'medium';
  }
  
  if (this.prepaid) {
    return 'medium';
  }
  
  return 'low';
});

// Ensure virtuals are included in JSON
binLookupSchema.set('toJSON', { virtuals: true });
binLookupSchema.set('toObject', { virtuals: true });

export default mongoose.model('BinLookup', binLookupSchema);
