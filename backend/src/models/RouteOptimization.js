import mongoose from 'mongoose';

const routeOptimizationSchema = new mongoose.Schema({
  routeId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  sourceDetails: {
    method: {
      type: String,
      enum: ['bank_transfer_idr', 'debit_card_idr', 'third_party_purchase', 'multi_step_routing'],
      required: true
    },
    sourceCurrency: {
      type: String,
      default: 'IDR'
    },
    amount: Number
  },
  targetDetails: {
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BankProvider',
      required: true
    },
    targetCurrency: {
      type: String,
      required: true
    },
    estimatedAmount: Number
  },
  steps: [{
    stepNumber: {
      type: Number,
      required: true
    },
    description: String,
    fromProvider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BankProvider'
    },
    toProvider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BankProvider'
    },
    fromCurrency: String,
    toCurrency: String,
    method: {
      type: String,
      enum: ['bank_transfer', 'debit_card', 'wire_transfer', 'internal_transfer', 'third_party']
    },
    estimatedTime: String, // "instant", "1-3 hours", "1 day"
    estimatedFee: Number,
    exchangeRate: Number,
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'low'
    }
  }],
  totalCost: {
    totalFees: {
      type: Number,
      required: true
    },
    exchangeCosts: Number,
    opportunityCost: Number,
    totalCostIDR: Number
  },
  timing: {
    estimatedTotalTime: {
      type: String,
      required: true
    },
    timeInMinutes: Number,
    businessDaysRequired: Number,
    urgencyLevel: {
      type: String,
      enum: ['immediate', 'same_day', 'next_day', 'standard'],
      default: 'standard'
    }
  },
  scoring: {
    costScore: {
      type: Number,
      min: 0,
      max: 100
    },
    speedScore: {
      type: Number,
      min: 0,
      max: 100
    },
    riskScore: {
      type: Number,
      min: 0,
      max: 100
    },
    reliabilityScore: {
      type: Number,
      min: 0,
      max: 100
    },
    overallScore: {
      type: Number,
      min: 0,
      max: 100
    },
    rankPosition: Number
  },
  constraints: {
    minimumAmount: Number,
    maximumAmount: Number,
    supportedCurrencies: [String],
    requiredCards: [String],
    businessHoursOnly: Boolean,
    requiresManualApproval: Boolean
  },
  availability: {
    isActive: {
      type: Boolean,
      default: true
    },
    lastTested: Date,
    successRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 100
    },
    averageActualTime: String,
    averageActualFee: Number
  },
  analytics: {
    usageCount: {
      type: Number,
      default: 0
    },
    lastUsed: Date,
    userPreference: {
      systemSuggested: {
        type: Number,
        default: 0
      },
      userSelected: {
        type: Number,
        default: 0
      },
      userCustom: {
        type: Number,
        default: 0
      }
    },
    performanceMetrics: {
      averageSatisfaction: Number,
      completionRate: Number,
      averageDeviation: Number // How much actual differs from estimated
    }
  },
  tags: [String],
  notes: String,
  createdBy: String,
  isSystemGenerated: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for optimization queries
routeOptimizationSchema.index({ 'sourceDetails.method': 1, 'targetDetails.provider': 1 });
routeOptimizationSchema.index({ 'targetDetails.targetCurrency': 1, 'scoring.overallScore': -1 });
routeOptimizationSchema.index({ 'availability.isActive': 1, 'scoring.rankPosition': 1 });
routeOptimizationSchema.index({ 'totalCost.totalFees': 1, 'timing.timeInMinutes': 1 });

// Static methods for route suggestion
routeOptimizationSchema.statics.suggestRoutes = async function(sourceAmount, sourceCurrency, targetCurrency, targetProvider, preferences = {}) {
  const {
    prioritizeCost = true,
    prioritizeSpeed = false,
    maxAcceptableFee = null,
    maxAcceptableTime = null,
    riskTolerance = 'medium'
  } = preferences;
  
  // Build query filter
  const filter = {
    'availability.isActive': true,
    'targetDetails.targetCurrency': targetCurrency
  };
  
  if (targetProvider) {
    filter['targetDetails.provider'] = targetProvider;
  }
  
  if (sourceAmount) {
    filter['constraints.minimumAmount'] = { $lte: sourceAmount };
    filter['constraints.maximumAmount'] = { $gte: sourceAmount };
  }
  
  // Risk tolerance filter
  const riskMap = { low: ['low'], medium: ['low', 'medium'], high: ['low', 'medium', 'high'] };
  filter['steps.riskLevel'] = { $in: riskMap[riskTolerance] || ['low', 'medium'] };
  
  let routes = await this.find(filter)
    .populate('targetDetails.provider', 'name code')
    .populate('steps.fromProvider', 'name code')
    .populate('steps.toProvider', 'name code')
    .lean();
  
  // Calculate actual costs and times for given amount
  routes = routes.map(route => {
    const actualFee = this._calculateActualFee(route, sourceAmount);
    const actualTime = this._calculateActualTime(route);
    const actualScore = this._calculateScore(route, actualFee, actualTime, preferences);
    
    return {
      ...route,
      actualEstimates: {
        totalFee: actualFee,
        totalTime: actualTime,
        finalAmount: sourceAmount - actualFee,
        score: actualScore
      }
    };
  });
  
  // Apply additional filters
  if (maxAcceptableFee) {
    routes = routes.filter(r => r.actualEstimates.totalFee <= maxAcceptableFee);
  }
  
  if (maxAcceptableTime) {
    routes = routes.filter(r => r.timing.timeInMinutes <= maxAcceptableTime);
  }
  
  // Sort by score (considering user preferences)
  routes.sort((a, b) => b.actualEstimates.score - a.actualEstimates.score);
  
  return routes.slice(0, 5); // Return top 5 routes
};

routeOptimizationSchema.statics._calculateActualFee = function(route, amount) {
  // Simple calculation - in real implementation, this would be more sophisticated
  const baseFee = route.totalCost.totalFees || 0;
  const feePercentage = baseFee / (route.sourceDetails.amount || 1000); // Assume base calculation
  return amount * feePercentage;
};

routeOptimizationSchema.statics._calculateActualTime = function(route) {
  return route.timing.timeInMinutes || 60; // Default 1 hour
};

routeOptimizationSchema.statics._calculateScore = function(route, actualFee, actualTime, preferences) {
  const { prioritizeCost, prioritizeSpeed } = preferences;
  
  // Normalize scores (lower fee = higher score, lower time = higher score)
  const costScore = Math.max(0, 100 - (actualFee / 10)); // Adjust scaling as needed
  const speedScore = Math.max(0, 100 - (actualTime / 60)); // Adjust scaling as needed
  
  let weight_cost = 0.5;
  let weight_speed = 0.3;
  let weight_reliability = 0.2;
  
  if (prioritizeCost) {
    weight_cost = 0.7;
    weight_speed = 0.2;
  }
  
  if (prioritizeSpeed) {
    weight_speed = 0.7;
    weight_cost = 0.2;
  }
  
  return (costScore * weight_cost) + 
         (speedScore * weight_speed) + 
         (route.scoring.reliabilityScore * weight_reliability);
};

// Method to update usage statistics
routeOptimizationSchema.methods.recordUsage = function(selectionType = 'systemSuggested') {
  this.analytics.usageCount += 1;
  this.analytics.lastUsed = new Date();
  this.analytics.userPreference[selectionType] += 1;
  return this.save();
};

// Method to update performance metrics
routeOptimizationSchema.methods.updatePerformance = function(actualFee, actualTime, satisfaction) {
  const estimatedFee = this.totalCost.totalFees;
  const estimatedTime = this.timing.timeInMinutes;
  
  // Calculate deviation
  const feeDeviation = Math.abs(actualFee - estimatedFee) / estimatedFee;
  const timeDeviation = Math.abs(actualTime - estimatedTime) / estimatedTime;
  
  this.analytics.performanceMetrics.averageDeviation = 
    (this.analytics.performanceMetrics.averageDeviation + feeDeviation + timeDeviation) / 2;
  
  if (satisfaction) {
    this.analytics.performanceMetrics.averageSatisfaction = satisfaction;
  }
  
  this.availability.averageActualFee = actualFee;
  this.availability.averageActualTime = `${actualTime} minutes`;
  this.availability.lastTested = new Date();
  
  return this.save();
};

// Pre-save hook to auto-generate routeId
routeOptimizationSchema.pre('save', function(next) {
  if (this.isNew && !this.routeId) {
    this.routeId = `ROUTE${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  }
  next();
});

export default mongoose.model('RouteOptimization', routeOptimizationSchema);

