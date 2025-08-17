import mongoose from 'mongoose';

const cardReplacementTrackerSchema = new mongoose.Schema({
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankProvider',
    required: true
  },
  bankAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankAccount',
    required: true
  },
  date: {
    type: Date,
    default: Date.now,
    required: true
  },
  activityType: {
    type: String,
    enum: ['card_creation', 'card_replacement', 'card_activation', 'card_blocking'],
    required: true
  },
  cardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Card'
  },
  details: {
    previousCardNumber: String,
    newCardNumber: String,
    reason: {
      type: String,
      enum: ['expired', 'lost', 'compromised', 'damaged', 'upgrade', 'suspicious_activity', 'other']
    },
    initiatedBy: {
      type: String,
      enum: ['user', 'system', 'provider'],
      default: 'user'
    },
    processingTime: Number, // in minutes
    success: {
      type: Boolean,
      default: true
    },
    failureReason: String
  },
  // Fraud Detection Metrics
  dailyStats: {
    creationsToday: {
      type: Number,
      default: 0
    },
    replacementsToday: {
      type: Number,
      default: 0
    },
    activationsToday: {
      type: Number,
      default: 0
    },
    totalActivitiesToday: {
      type: Number,
      default: 0
    }
  },
  weeklyStats: {
    creationsThisWeek: {
      type: Number,
      default: 0
    },
    replacementsThisWeek: {
      type: Number,
      default: 0
    },
    totalActivitiesThisWeek: {
      type: Number,
      default: 0
    }
  },
  riskAssessment: {
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low'
    },
    riskScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    riskFactors: [{
      factor: String,
      weight: Number,
      description: String
    }],
    alertTriggered: {
      type: Boolean,
      default: false
    },
    alertType: {
      type: String,
      enum: ['rate_limit_warning', 'rate_limit_exceeded', 'suspicious_pattern', 'fraud_suspected']
    },
    alertMessage: String,
    reviewRequired: {
      type: Boolean,
      default: false
    }
  },
  // Provider Limits Check
  providerLimits: {
    dailyCreationLimit: Number,
    dailyReplacementLimit: Number,
    remainingCreations: Number,
    remainingReplacements: Number,
    limitResetTime: Date
  },
  // Pattern Analysis
  patterns: {
    timePattern: String, // "business_hours", "off_hours", "weekend", etc.
    frequencyPattern: String, // "normal", "burst", "periodic"
    behaviorPattern: String, // "consistent", "erratic", "suspicious"
    velocityScore: Number // Speed of consecutive activities
  },
  notes: String,
  reviewedBy: String,
  reviewedAt: Date,
  actionTaken: String
}, {
  timestamps: true
});

// Indexes for fraud detection queries
cardReplacementTrackerSchema.index({ provider: 1, bankAccount: 1, date: 1 });
cardReplacementTrackerSchema.index({ date: 1, activityType: 1 });
cardReplacementTrackerSchema.index({ 'riskAssessment.riskLevel': 1, 'riskAssessment.alertTriggered': 1 });
cardReplacementTrackerSchema.index({ 'dailyStats.totalActivitiesToday': 1 });

// Static methods for fraud detection
cardReplacementTrackerSchema.statics.checkDailyLimits = async function(providerId, bankAccountId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const todayActivities = await this.find({
    provider: providerId,
    bankAccount: bankAccountId,
    date: { $gte: today, $lt: tomorrow }
  });
  
  const stats = {
    creations: todayActivities.filter(a => a.activityType === 'card_creation').length,
    replacements: todayActivities.filter(a => a.activityType === 'card_replacement').length,
    total: todayActivities.length
  };
  
  return stats;
};

cardReplacementTrackerSchema.statics.assessRisk = async function(providerId, bankAccountId, activityType) {
  const dailyStats = await this.checkDailyLimits(providerId, bankAccountId);
  
  let riskScore = 0;
  let riskFactors = [];
  let alertType = null;
  
  // Check daily limits
  if (dailyStats.creations >= 5) {
    riskScore += 30;
    riskFactors.push({
      factor: 'high_daily_creations',
      weight: 30,
      description: `${dailyStats.creations} card creations today`
    });
  }
  
  if (dailyStats.replacements >= 3) {
    riskScore += 40;
    riskFactors.push({
      factor: 'high_daily_replacements',
      weight: 40,
      description: `${dailyStats.replacements} card replacements today`
    });
  }
  
  if (dailyStats.total >= 8) {
    riskScore += 50;
    riskFactors.push({
      factor: 'excessive_daily_activity',
      weight: 50,
      description: `${dailyStats.total} total activities today`
    });
    alertType = 'rate_limit_exceeded';
  }
  
  // Check time patterns (suspicious if outside business hours)
  const currentHour = new Date().getHours();
  if (currentHour < 6 || currentHour > 22) {
    riskScore += 15;
    riskFactors.push({
      factor: 'off_hours_activity',
      weight: 15,
      description: `Activity at ${currentHour}:00`
    });
  }
  
  // Determine risk level
  let riskLevel = 'low';
  if (riskScore >= 70) riskLevel = 'critical';
  else if (riskScore >= 50) riskLevel = 'high';
  else if (riskScore >= 30) riskLevel = 'medium';
  
  // Determine alert type
  if (!alertType) {
    if (riskScore >= 70) alertType = 'fraud_suspected';
    else if (riskScore >= 50) alertType = 'suspicious_pattern';
    else if (riskScore >= 40) alertType = 'rate_limit_warning';
  }
  
  return {
    riskLevel,
    riskScore: Math.min(riskScore, 100),
    riskFactors,
    alertTriggered: riskScore >= 40,
    alertType,
    reviewRequired: riskScore >= 60,
    dailyStats
  };
};

cardReplacementTrackerSchema.statics.createActivity = async function(data) {
  const riskAssessment = await this.assessRisk(
    data.provider,
    data.bankAccount,
    data.activityType
  );
  
  const activity = new this({
    ...data,
    dailyStats: {
      creationsToday: riskAssessment.dailyStats.creations + (data.activityType === 'card_creation' ? 1 : 0),
      replacementsToday: riskAssessment.dailyStats.replacements + (data.activityType === 'card_replacement' ? 1 : 0),
      totalActivitiesToday: riskAssessment.dailyStats.total + 1
    },
    riskAssessment: {
      ...riskAssessment,
      alertMessage: riskAssessment.alertTriggered ? 
        `${riskAssessment.alertType}: Risk score ${riskAssessment.riskScore}` : null
    }
  });
  
  return activity.save();
};

// Method to generate fraud alert
cardReplacementTrackerSchema.methods.generateAlert = function() {
  if (!this.riskAssessment.alertTriggered) return null;
  
  return {
    type: this.riskAssessment.alertType,
    level: this.riskAssessment.riskLevel,
    message: this.riskAssessment.alertMessage,
    riskScore: this.riskAssessment.riskScore,
    recommendations: this._getRecommendations(),
    timestamp: new Date(),
    requiresAction: this.riskAssessment.reviewRequired
  };
};

cardReplacementTrackerSchema.methods._getRecommendations = function() {
  const recommendations = [];
  
  if (this.dailyStats.totalActivitiesToday >= 8) {
    recommendations.push('Consider temporary account suspension pending review');
  }
  
  if (this.riskAssessment.riskScore >= 70) {
    recommendations.push('Immediate manual review required');
    recommendations.push('Verify user identity before allowing further activities');
  }
  
  if (this.patterns?.timePattern === 'off_hours') {
    recommendations.push('Additional verification for off-hours activities');
  }
  
  return recommendations;
};

export default mongoose.model('CardReplacementTracker', cardReplacementTrackerSchema);

