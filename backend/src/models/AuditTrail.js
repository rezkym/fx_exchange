import mongoose from 'mongoose';

const auditTrailSchema = new mongoose.Schema({
  auditId: {
    type: String,
    required: true,
    unique: true
  },
  eventType: {
    type: String,
    enum: [
      'topup_created', 'topup_updated', 'topup_completed', 'topup_failed',
      'card_created', 'card_replaced', 'card_blocked', 'card_activated',
      'transaction_initiated', 'transaction_completed', 'transaction_failed',
      'route_suggested', 'route_selected', 'route_custom',
      'fraud_detected', 'risk_assessed', 'alert_triggered',
      'provider_added', 'provider_updated', 'account_created',
      'fee_recorded', 'exchange_rate_updated', 'system_error'
    ],
    required: true
  },
  entityType: {
    type: String,
    enum: ['TopUp', 'Card', 'Transaction', 'BankProvider', 'BankAccount', 'Route', 'System'],
    required: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  userId: String, // If user-initiated
  sessionId: String,
  
  // Event Details
  action: {
    type: String,
    required: true
  },
  description: String,
  
  // Before/After State for tracking changes
  beforeState: {
    type: mongoose.Schema.Types.Mixed
  },
  afterState: {
    type: mongoose.Schema.Types.Mixed
  },
  changes: [{
    field: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed
  }],
  
  // Context Information
  context: {
    ipAddress: String,
    userAgent: String,
    source: {
      type: String,
      enum: ['web', 'mobile', 'api', 'system', 'admin'],
      default: 'api'
    },
    method: String, // HTTP method or system method
    endpoint: String,
    referrer: String
  },
  
  // Financial Impact
  financialImpact: {
    currency: String,
    amount: Number,
    balanceChange: Number,
    feeAmount: Number,
    exchangeRate: Number
  },
  
  // Risk and Compliance
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  },
  complianceFlags: [{
    type: String,
    description: String,
    severity: {
      type: String,
      enum: ['info', 'warning', 'error', 'critical']
    }
  }],
  
  // Performance Metrics
  performance: {
    executionTime: Number, // in milliseconds
    databaseQueries: Number,
    externalApiCalls: Number,
    memoryUsage: Number
  },
  
  // Error Information
  error: {
    hasError: {
      type: Boolean,
      default: false
    },
    errorCode: String,
    errorMessage: String,
    stackTrace: String,
    errorType: {
      type: String,
      enum: ['validation', 'business_logic', 'system', 'network', 'timeout']
    }
  },
  
  // Additional Metadata
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  
  // Retention and Archival
  retentionPolicy: {
    category: {
      type: String,
      enum: ['financial', 'security', 'operational', 'debug'],
      default: 'operational'
    },
    retentionPeriod: {
      type: Number, // days
      default: 365
    },
    isArchived: {
      type: Boolean,
      default: false
    },
    archiveDate: Date,
    canBeDeleted: {
      type: Boolean,
      default: true
    }
  },
  
  // Review and Investigation
  investigation: {
    isUnderReview: {
      type: Boolean,
      default: false
    },
    reviewedBy: String,
    reviewedAt: Date,
    reviewNotes: String,
    investigationStatus: {
      type: String,
      enum: ['pending', 'in_progress', 'resolved', 'escalated'],
      default: 'pending'
    }
  }
}, {
  timestamps: true
});

// Indexes for audit queries
auditTrailSchema.index({ auditId: 1 });
auditTrailSchema.index({ eventType: 1, createdAt: -1 });
auditTrailSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
auditTrailSchema.index({ userId: 1, createdAt: -1 });
auditTrailSchema.index({ riskLevel: 1, 'error.hasError': 1 });
auditTrailSchema.index({ 'complianceFlags.severity': 1, createdAt: -1 });
auditTrailSchema.index({ 'retentionPolicy.category': 1, 'retentionPolicy.isArchived': 1 });

// Static methods for audit logging
auditTrailSchema.statics.logEvent = async function(eventData) {
  const auditEntry = new this({
    auditId: `AUD${Date.now()}${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
    ...eventData,
    metadata: eventData.metadata || new Map()
  });
  
  return auditEntry.save();
};

auditTrailSchema.statics.logTopUpEvent = async function(topUpId, eventType, action, changes = null, context = {}) {
  return this.logEvent({
    eventType,
    entityType: 'TopUp',
    entityId: topUpId,
    action,
    changes,
    context,
    riskLevel: eventType.includes('failed') ? 'medium' : 'low'
  });
};

auditTrailSchema.statics.logCardEvent = async function(cardId, eventType, action, beforeState = null, afterState = null, context = {}) {
  return this.logEvent({
    eventType,
    entityType: 'Card',
    entityId: cardId,
    action,
    beforeState,
    afterState,
    context,
    riskLevel: eventType.includes('fraud') || eventType.includes('blocked') ? 'high' : 'low'
  });
};

auditTrailSchema.statics.logFraudAlert = async function(entityId, entityType, alertDetails, context = {}) {
  return this.logEvent({
    eventType: 'fraud_detected',
    entityType,
    entityId,
    action: 'fraud_alert_triggered',
    description: alertDetails.message,
    riskLevel: alertDetails.level || 'high',
    context,
    metadata: new Map(Object.entries(alertDetails))
  });
};

auditTrailSchema.statics.logError = async function(entityId, entityType, error, context = {}) {
  return this.logEvent({
    eventType: 'system_error',
    entityType,
    entityId,
    action: 'error_occurred',
    error: {
      hasError: true,
      errorMessage: error.message,
      errorCode: error.code,
      stackTrace: error.stack,
      errorType: error.type || 'system'
    },
    riskLevel: 'medium',
    context
  });
};

// Query helpers
auditTrailSchema.statics.getEventsByEntity = async function(entityType, entityId, limit = 50) {
  return this.find({ entityType, entityId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

auditTrailSchema.statics.getFinancialEvents = async function(startDate, endDate, currency = null) {
  const filter = {
    createdAt: { $gte: startDate, $lte: endDate },
    'financialImpact.amount': { $exists: true, $ne: null }
  };
  
  if (currency) {
    filter['financialImpact.currency'] = currency;
  }
  
  return this.find(filter)
    .sort({ createdAt: -1 })
    .lean();
};

auditTrailSchema.statics.getComplianceReport = async function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          eventType: '$eventType',
          riskLevel: '$riskLevel'
        },
        count: { $sum: 1 },
        totalFinancialImpact: { $sum: '$financialImpact.amount' },
        errorCount: {
          $sum: { $cond: ['$error.hasError', 1, 0] }
        }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

// Method to archive old entries
auditTrailSchema.statics.archiveOldEntries = async function(daysOld = 365) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  return this.updateMany(
    {
      createdAt: { $lt: cutoffDate },
      'retentionPolicy.isArchived': false,
      'retentionPolicy.canBeDeleted': true
    },
    {
      $set: {
        'retentionPolicy.isArchived': true,
        'retentionPolicy.archiveDate': new Date()
      }
    }
  );
};

// Instance methods
auditTrailSchema.methods.addComplianceFlag = function(type, description, severity = 'warning') {
  this.complianceFlags.push({ type, description, severity });
  return this.save();
};

auditTrailSchema.methods.startInvestigation = function(reviewedBy) {
  this.investigation.isUnderReview = true;
  this.investigation.reviewedBy = reviewedBy;
  this.investigation.reviewedAt = new Date();
  this.investigation.investigationStatus = 'in_progress';
  return this.save();
};

auditTrailSchema.methods.closeInvestigation = function(resolution, notes) {
  this.investigation.investigationStatus = resolution;
  this.investigation.reviewNotes = notes;
  return this.save();
};

export default mongoose.model('AuditTrail', auditTrailSchema);
