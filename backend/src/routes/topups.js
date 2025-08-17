import express from 'express';
import TopUp from '../models/TopUp.js';
import BankAccount from '../models/BankAccount.js';
import BankProvider from '../models/BankProvider.js';
import FeeHistory from '../models/FeeHistory.js';
import AuditTrail from '../models/AuditTrail.js';
import RouteOptimization from '../models/RouteOptimization.js';
import CardReplacementTracker from '../models/CardReplacementTracker.js';

const router = express.Router();

// GET all topups
router.get('/topups', async (req, res) => {
  try {
    const { bankAccount, status, topUpMethod, startDate, endDate } = req.query;
    let filter = {};
    
    if (bankAccount) {
      filter.bankAccount = bankAccount;
    }
    
    if (status) {
      filter.status = status;
    }
    
    if (topUpMethod) {
      filter.topUpMethod = topUpMethod;
    }
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    const topups = await TopUp.find(filter)
      .populate('bankAccount', 'name accountNumber currency balance')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: topups,
      count: topups.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching topups',
      error: error.message
    });
  }
});

// GET single topup by ID
router.get('/topups/:id', async (req, res) => {
  try {
    const topup = await TopUp.findById(req.params.id)
      .populate('bankAccount', 'name accountNumber currency balance address');
    
    if (!topup) {
      return res.status(404).json({
        success: false,
        message: 'TopUp not found'
      });
    }
    
    res.json({
      success: true,
      data: topup
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching topup',
      error: error.message
    });
  }
});

// POST create new topup with route suggestions
router.post('/topups', async (req, res) => {
  try {
    const { 
      bankAccount, 
      amount, 
      currency, 
      topUpMethod,
      sourceDetails,
      feeDetails,
      description,
      useSystemSuggestion = true
    } = req.body;
    
    // Validation
    if (!bankAccount || !amount || !currency || !topUpMethod) {
      return res.status(400).json({
        success: false,
        message: 'Bank account, amount, currency, and top up method are required'
      });
    }
    
    // Check if bank account exists
    const account = await BankAccount.findById(bankAccount)
      .populate('provider', 'name code cardLimits topUpMethods');
    
    if (!account) {
      return res.status(400).json({
        success: false,
        message: 'Bank account not found'
      });
    }
    
    // Check currency minimum limits
    const provider = account.provider;
    const supportedMethod = provider.topUpMethods?.find(m => 
      m.method === topUpMethod || 
      (topUpMethod === 'debit_card_idr' && m.method === 'debit_card')
    );
    
    if (supportedMethod?.minimumAmounts?.get(currency)) {
      const minAmount = supportedMethod.minimumAmounts.get(currency);
      if (amount < minAmount) {
        return res.status(400).json({
          success: false,
          message: `Minimum amount for ${currency} is ${minAmount}`
        });
      }
    }
    
    // Get route suggestions if requested
    let routeOptimization = null;
    if (useSystemSuggestion) {
      try {
        const suggestions = await RouteOptimization.suggestRoutes(
          amount, 'IDR', currency, account.provider._id
        );
        
        if (suggestions.length > 0) {
          routeOptimization = {
            isSystemSuggested: true,
            suggestedRoutes: suggestions.map(s => ({
              routeId: s.routeId,
              totalFee: s.actualEstimates.totalFee,
              estimatedTime: s.timing.estimatedTotalTime,
              steps: s.steps.length,
              riskLevel: s.steps.reduce((maxRisk, step) => 
                step.riskLevel === 'high' ? 'high' : maxRisk, 'low')
            })),
            selectedRoute: suggestions[0].routeId,
            selectionReason: 'system_recommended_best_score'
          };
        }
      } catch (routeError) {
        console.log('Route suggestion failed:', routeError.message);
        // Continue without route optimization
      }
    }
    
    // Calculate exchange rate if different currencies
    let exchangeRate = 1;
    if (currency !== 'IDR') {
      // Get rate from existing rates API
      try {
        const response = await fetch(`http://localhost:4000/api/rates/live?source=IDR&target=${currency}`);
        const rateData = await response.json();
        exchangeRate = rateData.value || 1;
      } catch (rateError) {
        console.log('Exchange rate fetch failed, using default:', rateError.message);
      }
    }
    
    // Create topup
    const topup = new TopUp({
      bankAccount,
      amount,
      currency,
      topUpMethod,
      sourceDetails: sourceDetails || {},
      fee: feeDetails?.userInputFee || 0,
      feeDetails: {
        ...feeDetails,
        feeCalculationMethod: feeDetails?.userInputFee ? 'manual_input' : 'calculated'
      },
      totalAmount: amount + (feeDetails?.userInputFee || 0),
      routeOptimization,
      description: description || `Top up ${currency} ${amount} via ${topUpMethod}`,
      metadata: new Map([
        ['exchangeRate', exchangeRate],
        ['createdVia', 'api'],
        ['userAgent', req.headers['user-agent'] || 'unknown']
      ])
    });
    
    const savedTopUp = await topup.save();
    
    // Log audit trail
    await AuditTrail.logTopUpEvent(
      savedTopUp._id,
      'topup_created',
      'create_topup_request',
      null,
      {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        method: 'POST',
        endpoint: '/api/topups'
      }
    );
    
    // Record fee history for learning
    if (feeDetails?.userInputFee) {
      await FeeHistory.create({
        topUpId: savedTopUp._id,
        provider: account.provider._id,
        topUpMethod,
        currency,
        amount,
        feeAmount: feeDetails.userInputFee,
        cardType: sourceDetails?.cardType || 'not_applicable',
        exchangeRate,
        feeBreakdown: {
          userInputFee: feeDetails.userInputFee,
          providerFee: feeDetails.providerFee || 0,
          exchangeFee: feeDetails.exchangeFee || 0
        }
      });
    }
    
    const populatedTopUp = await TopUp.findById(savedTopUp._id)
      .populate('bankAccount', 'name accountNumber currency');
    
    res.status(201).json({
      success: true,
      message: 'TopUp created successfully',
      data: populatedTopUp
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating topup',
      error: error.message
    });
  }
});

// PUT update topup status
router.put('/topups/:id/status', async (req, res) => {
  try {
    const { status, failureReason, actualFee, actualProcessingTime } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }
    
    const topup = await TopUp.findById(req.params.id);
    if (!topup) {
      return res.status(404).json({
        success: false,
        message: 'TopUp not found'
      });
    }
    
    const oldStatus = topup.status;
    let updateData = { status };
    
    if (status === 'completed') {
      updateData.completedAt = new Date();
      
      // Update balance if completed
      if (topup.bankAccount) {
        await BankAccount.findByIdAndUpdate(
          topup.bankAccount,
          { $inc: { balance: topup.amount } }
        );
      }
      
      // Record fee history with actual values
      if (actualFee !== undefined) {
        await FeeHistory.findOneAndUpdate(
          { topUpId: topup._id },
          { 
            actualFee,
            predictionAccuracy: actualFee ? Math.abs(topup.fee - actualFee) / topup.fee : null
          },
          { upsert: true }
        );
      }
      
    } else if (status === 'failed') {
      updateData.failedAt = new Date();
      updateData.failureReason = failureReason || 'Unknown error';
    }
    
    const updatedTopUp = await TopUp.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('bankAccount', 'name accountNumber currency');
    
    // Log audit trail
    await AuditTrail.logTopUpEvent(
      updatedTopUp._id,
      `topup_${status}`,
      `update_status_to_${status}`,
      [{ field: 'status', oldValue: oldStatus, newValue: status }],
      {
        ipAddress: req.ip,
        method: 'PUT',
        endpoint: `/api/topups/${req.params.id}/status`
      }
    );
    
    res.json({
      success: true,
      message: 'TopUp status updated successfully',
      data: updatedTopUp
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating topup status',
      error: error.message
    });
  }
});

// GET topup analytics
router.get('/topups/analytics/summary', async (req, res) => {
  try {
    const { startDate, endDate, currency, topUpMethod } = req.query;
    
    let filter = {};
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    if (currency) filter.currency = currency;
    if (topUpMethod) filter.topUpMethod = topUpMethod;
    
    const topups = await TopUp.find(filter);
    
    const summary = {
      totalTopUps: topups.length,
      totalAmount: topups.reduce((sum, t) => sum + t.amount, 0),
      totalFees: topups.reduce((sum, t) => sum + t.fee, 0),
      averageFee: topups.length > 0 ? topups.reduce((sum, t) => sum + t.fee, 0) / topups.length : 0,
      byStatus: {},
      byMethod: {},
      byCurrency: {},
      routeUsage: {
        systemSuggested: 0,
        userCustom: 0
      }
    };
    
    // Group by status
    topups.forEach(t => {
      summary.byStatus[t.status] = (summary.byStatus[t.status] || 0) + 1;
      summary.byMethod[t.topUpMethod] = (summary.byMethod[t.topUpMethod] || 0) + 1;
      summary.byCurrency[t.currency] = (summary.byCurrency[t.currency] || 0) + 1;
      
      if (t.routeOptimization?.isSystemSuggested) summary.routeUsage.systemSuggested++;
      if (t.routeOptimization?.isUserCustom) summary.routeUsage.userCustom++;
    });
    
    res.json({
      success: true,
      data: summary
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching topup analytics',
      error: error.message
    });
  }
});

// GET route suggestions for amount and currency
router.get('/topups/routes/suggest', async (req, res) => {
  try {
    const { amount, currency, targetProvider, prioritizeCost, prioritizeSpeed } = req.query;
    
    if (!amount || !currency) {
      return res.status(400).json({
        success: false,
        message: 'Amount and currency are required'
      });
    }
    
    const preferences = {
      prioritizeCost: prioritizeCost === 'true',
      prioritizeSpeed: prioritizeSpeed === 'true'
    };
    
    const suggestions = await RouteOptimization.suggestRoutes(
      parseFloat(amount),
      'IDR',
      currency.toUpperCase(),
      targetProvider,
      preferences
    );
    
    res.json({
      success: true,
      data: {
        suggestions,
        count: suggestions.length,
        recommended: suggestions[0] || null
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error getting route suggestions',
      error: error.message
    });
  }
});

// POST record fee for learning
router.post('/topups/:id/record-fee', async (req, res) => {
  try {
    const { actualFee, actualProcessingTime, satisfaction, notes } = req.body;
    
    const topup = await TopUp.findById(req.params.id)
      .populate('bankAccount');
    
    if (!topup) {
      return res.status(404).json({
        success: false,
        message: 'TopUp not found'
      });
    }
    
    // Update fee history
    await FeeHistory.findOneAndUpdate(
      { topUpId: topup._id },
      {
        actualFee,
        predictionAccuracy: actualFee ? Math.abs(topup.fee - actualFee) / Math.max(topup.fee, 1) * 100 : null,
        processingTime: { actual: actualProcessingTime },
        userBehavior: { satisfaction },
        notes
      },
      { upsert: true }
    );
    
    // Update route performance if route was used
    if (topup.routeOptimization?.selectedRoute) {
      const route = await RouteOptimization.findOne({ 
        routeId: topup.routeOptimization.selectedRoute 
      });
      
      if (route) {
        await route.updatePerformance(
          actualFee, 
          actualProcessingTime ? parseInt(actualProcessingTime) : null,
          satisfaction
        );
      }
    }
    
    res.json({
      success: true,
      message: 'Fee data recorded successfully for learning'
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error recording fee data',
      error: error.message
    });
  }
});

// GET fee analytics dan patterns
router.get('/topups/analytics/fees', async (req, res) => {
  try {
    const { currency, topUpMethod, startDate, endDate, groupBy = 'method' } = req.query;
    
    let matchFilter = {};
    
    if (currency) matchFilter.currency = currency.toUpperCase();
    if (topUpMethod) matchFilter.topUpMethod = topUpMethod;
    if (startDate || endDate) {
      matchFilter.createdAt = {};
      if (startDate) matchFilter.createdAt.$gte = new Date(startDate);
      if (endDate) matchFilter.createdAt.$lte = new Date(endDate);
    }
    
    // Get fee analytics from FeeHistory
    const feeAnalytics = await FeeHistory.getFeeAnalytics(matchFilter);
    
    // Get prediction accuracy
    const predictionStats = await FeeHistory.aggregate([
      { $match: { ...matchFilter, predictionAccuracy: { $exists: true } } },
      {
        $group: {
          _id: null,
          avgAccuracy: { $avg: '$predictionAccuracy' },
          totalPredictions: { $sum: 1 },
          bestAccuracy: { $min: '$predictionAccuracy' },
          worstAccuracy: { $max: '$predictionAccuracy' }
        }
      }
    ]);
    
    // Fee trends over time
    const feeTrends = await FeeHistory.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          avgFee: { $avg: '$feeAmount' },
          avgPercentage: { $avg: '$feePercentage' },
          count: { $sum: 1 },
          date: { $first: '$createdAt' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);
    
    // Fee patterns by time of day
    const timePatterns = await FeeHistory.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$hourOfDay',
          avgFee: { $avg: '$feeAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);
    
    // Fee correlation with market conditions
    const marketCorrelation = await FeeHistory.aggregate([
      { 
        $match: { 
          ...matchFilter, 
          'marketConditions.usdIdrRate': { $exists: true } 
        } 
      },
      {
        $group: {
          _id: {
            $round: [{ $divide: ['$marketConditions.usdIdrRate', 100] }, 0]
          },
          avgFee: { $avg: '$feeAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);
    
    res.json({
      success: true,
      data: {
        analytics: feeAnalytics,
        predictionStats: predictionStats[0] || null,
        trends: feeTrends,
        timePatterns,
        marketCorrelation,
        summary: {
          totalRecords: await FeeHistory.countDocuments(matchFilter),
          dateRange: {
            start: startDate || 'all time',
            end: endDate || 'present'
          }
        }
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching fee analytics',
      error: error.message
    });
  }
});

// GET fee predictions
router.get('/topups/analytics/predict-fee', async (req, res) => {
  try {
    const { amount, currency, topUpMethod, provider } = req.query;
    
    if (!amount || !currency || !topUpMethod) {
      return res.status(400).json({
        success: false,
        message: 'Amount, currency, and top up method are required'
      });
    }
    
    const prediction = await FeeHistory.predictFee(
      parseFloat(amount),
      currency.toUpperCase(),
      topUpMethod,
      provider
    );
    
    if (!prediction) {
      return res.json({
        success: true,
        data: {
          prediction: null,
          message: 'Insufficient historical data for prediction',
          recommendation: 'Please input fee manually for learning'
        }
      });
    }
    
    // Get similar transactions for context
    const similarTransactions = await FeeHistory.find({
      currency: currency.toUpperCase(),
      topUpMethod,
      amount: { $gte: amount * 0.8, $lte: amount * 1.2 }
    }).sort({ createdAt: -1 }).limit(5);
    
    res.json({
      success: true,
      data: {
        prediction,
        similarTransactions: similarTransactions.map(t => ({
          amount: t.amount,
          fee: t.feeAmount,
          feePercentage: t.feePercentage,
          date: t.createdAt,
          cardType: t.cardType
        })),
        recommendations: [
          `Predicted fee: ${prediction.predictedFee.toFixed(2)} ${currency}`,
          `Confidence: ${prediction.confidence}%`,
          `Based on ${prediction.basedOnSamples} similar transactions`
        ]
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error predicting fee',
      error: error.message
    });
  }
});

// GET optimization insights
router.get('/topups/analytics/optimization', async (req, res) => {
  try {
    const { currency, targetAmount } = req.query;
    
    // Analyze best methods by cost
    const costAnalysis = await FeeHistory.aggregate([
      { 
        $match: currency ? { currency: currency.toUpperCase() } : {}
      },
      {
        $group: {
          _id: '$topUpMethod',
          avgFeePercentage: { $avg: '$feePercentage' },
          minFee: { $min: '$feeAmount' },
          maxFee: { $max: '$feeAmount' },
          count: { $sum: 1 },
          avgProcessingTime: { $avg: '$processingTime.actual' }
        }
      },
      { $sort: { avgFeePercentage: 1 } }
    ]);
    
    // Best times to transact
    const timeOptimization = await FeeHistory.aggregate([
      {
        $group: {
          _id: {
            hour: '$hourOfDay',
            isWeekend: '$isWeekend'
          },
          avgFeePercentage: { $avg: '$feePercentage' },
          count: { $sum: 1 }
        }
      },
      { $sort: { avgFeePercentage: 1 } }
    ]);
    
    // Route optimization insights
    const routeInsights = await RouteOptimization.aggregate([
      {
        $match: currency ? { 'targetDetails.targetCurrency': currency.toUpperCase() } : {}
      },
      {
        $group: {
          _id: '$sourceDetails.method',
          avgScore: { $avg: '$scoring.overallScore' },
          avgCost: { $avg: '$totalCost.totalFees' },
          avgTime: { $avg: '$timing.timeInMinutes' },
          count: { $sum: 1 },
          usageCount: { $sum: '$analytics.usageCount' }
        }
      },
      { $sort: { avgScore: -1 } }
    ]);
    
    res.json({
      success: true,
      data: {
        costOptimization: {
          bestMethods: costAnalysis,
          recommendation: costAnalysis[0] ? 
            `${costAnalysis[0]._id} has lowest average fee (${costAnalysis[0].avgFeePercentage.toFixed(2)}%)` : 
            'Insufficient data'
        },
        timeOptimization: {
          bestTimes: timeOptimization.slice(0, 5),
          recommendation: timeOptimization[0] ? 
            `Best time: ${timeOptimization[0]._id.hour}:00, ${timeOptimization[0]._id.isWeekend ? 'Weekend' : 'Weekday'}` :
            'Insufficient data'
        },
        routeOptimization: {
          bestRoutes: routeInsights,
          recommendation: routeInsights[0] ? 
            `${routeInsights[0]._id} has best overall score (${routeInsights[0].avgScore.toFixed(1)})` :
            'No route data available'
        },
        insights: [
          'Fees tend to be lower during business hours',
          'Individual cards typically have lower fees than corporate',
          'Larger amounts may have better fee percentages',
          'Weekend transactions may have higher processing times'
        ]
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching optimization insights',
      error: error.message
    });
  }
});

export default router;
