import express from 'express';
import TopUp from '../models/TopUp.js';
import BankAccount from '../models/BankAccount.js';
import BankProvider from '../models/BankProvider.js';
import FeeHistory from '../models/FeeHistory.js';
import AuditTrail from '../models/AuditTrail.js';
import RouteOptimization from '../models/RouteOptimization.js';
import CardReplacementTracker from '../models/CardReplacementTracker.js';

const router = express.Router();

// GET all topups with enhanced filtering
router.get('/topups', async (req, res) => {
  try {
    const { 
      bankAccount, 
      status, 
      topUpMethod, 
      currency,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 50,
      startDate, 
      endDate 
    } = req.query;
    
    let filter = {};
    
    // Account filter
    if (bankAccount) {
      filter.bankAccount = bankAccount;
    }
    
    // Status filter
    if (status) {
      filter.status = status;
    }
    
    // Method filter
    if (topUpMethod) {
      filter.topUpMethod = topUpMethod;
    }
    
    // Currency filter
    if (currency) {
      filter.currency = currency.toUpperCase();
    }
    
    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    // Search filter
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { topUpId: searchRegex },
        { description: searchRegex }
      ];
    }
    
    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Sort options
    const sortOptions = {};
    const validSortFields = ['createdAt', 'amount', 'status', 'topUpId', 'currency'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    sortOptions[sortField] = sortDirection;
    
    const topups = await TopUp.find(filter)
      .populate('bankAccount', 'name accountNumber currency balance provider')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const totalCount = await TopUp.countDocuments(filter);
    
    res.json({
      success: true,
      data: topups,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalCount,
        hasNextPage: skip + topups.length < totalCount,
        hasPrevPage: parseInt(page) > 1
      }
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

    // Validate amount is a valid number
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount provided'
      });
    }
    
    let prediction = null;
    try {
      prediction = await FeeHistory.predictFee(
        numericAmount,
        currency.toUpperCase(),
        topUpMethod,
        provider
      );
    } catch (predictionError) {
      console.log('Prediction error:', predictionError.message);
      // Continue with null prediction
    }
    
    if (!prediction) {
      // Return a default prediction if no historical data
      const defaultFeePercent = 0.025; // 2.5%
      const defaultFee = numericAmount * defaultFeePercent;
      
      return res.json({
        success: true,
        data: {
          predictedFee: defaultFee,
          confidence: 50,
          basedOnSamples: 0,
          message: 'Using default fee calculation - insufficient historical data',
          recommendation: 'Please input actual fee for learning'
        }
      });
    }
    
    // Get similar transactions for context
    let similarTransactions = [];
    try {
      similarTransactions = await FeeHistory.find({
        currency: currency.toUpperCase(),
        topUpMethod,
        amount: { $gte: numericAmount * 0.8, $lte: numericAmount * 1.2 }
      }).sort({ createdAt: -1 }).limit(5);
    } catch (similarError) {
      console.log('Error fetching similar transactions:', similarError.message);
      // Continue with empty array
    }
    
    res.json({
      success: true,
      data: {
        predictedFee: prediction.predictedFee || 0,
        confidence: prediction.confidence || 0,
        basedOnSamples: prediction.basedOnSamples || 0,
        prediction,
        similarTransactions: similarTransactions.map(t => ({
          amount: t.amount || 0,
          fee: t.feeAmount || 0,
          feePercentage: t.feePercentage || 0,
          date: t.createdAt || new Date(),
          cardType: t.cardType || 'unknown'
        })),
        recommendations: [
          `Predicted fee: ${(prediction.predictedFee || 0).toFixed(2)} ${currency}`,
          `Confidence: ${prediction.confidence || 0}%`,
          `Based on ${prediction.basedOnSamples || 0} similar transactions`
        ]
      }
    });
    
  } catch (error) {
    console.error('Error in predict-fee endpoint:', error);
    
    // Return a safe fallback response
    const numericAmount = parseFloat(amount) || 0;
    const defaultFeePercent = 0.03; // 3%
    const fallbackFee = numericAmount * defaultFeePercent;
    
    res.json({
      success: true,
      data: {
        predictedFee: fallbackFee,
        confidence: 30,
        basedOnSamples: 0,
        message: 'Error occurred during prediction, using fallback calculation',
        recommendation: 'Please input actual fee manually'
      }
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

// GET topup trends and patterns
router.get('/topups/analytics/trends', async (req, res) => {
  try {
    const { days = 30, currency, method } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    let filter = {
      createdAt: { $gte: startDate }
    };
    
    if (currency) {
      filter.currency = currency.toUpperCase();
    }
    
    if (method) {
      filter.topUpMethod = method;
    }
    
    const topups = await TopUp.find(filter);
    
    // Group by day
    const dailyData = {};
    for (let i = 0; i < parseInt(days); i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayKey = date.toISOString().slice(0, 10); // YYYY-MM-DD
      dailyData[dayKey] = {
        date: dayKey,
        count: 0,
        volume: 0,
        fees: 0,
        successful: 0,
        failed: 0,
        avgAmount: 0
      };
    }
    
    topups.forEach(t => {
      const dayKey = new Date(t.createdAt).toISOString().slice(0, 10);
      if (dailyData[dayKey]) {
        dailyData[dayKey].count += 1;
        dailyData[dayKey].volume += t.amount;
        dailyData[dayKey].fees += t.fee || 0;
        
        if (t.status === 'completed') {
          dailyData[dayKey].successful += 1;
        } else if (t.status === 'failed') {
          dailyData[dayKey].failed += 1;
        }
      }
    });
    
    // Calculate average amounts
    Object.keys(dailyData).forEach(key => {
      if (dailyData[key].count > 0) {
        dailyData[key].avgAmount = dailyData[key].volume / dailyData[key].count;
      }
    });
    
    const trends = Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));
    
    res.json({
      success: true,
      data: trends
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching topup trends',
      error: error.message
    });
  }
});

// GET topup method comparison
router.get('/topups/analytics/methods', async (req, res) => {
  try {
    const { startDate, endDate, currency } = req.query;
    
    let filter = {};
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    if (currency) {
      filter.currency = currency.toUpperCase();
    }
    
    const methodAnalysis = await TopUp.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$topUpMethod',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          avgAmount: { $avg: '$amount' },
          totalFees: { $sum: '$fee' },
          avgFee: { $avg: '$fee' },
          successCount: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          failedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          }
        }
      },
      {
        $addFields: {
          successRate: {
            $multiply: [
              { $divide: ['$successCount', '$count'] },
              100
            ]
          },
          feePercentage: {
            $multiply: [
              { $divide: ['$avgFee', '$avgAmount'] },
              100
            ]
          }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    res.json({
      success: true,
      data: methodAnalysis
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching method analysis',
      error: error.message
    });
  }
});

// GET topup health metrics
router.get('/topups/analytics/health', async (req, res) => {
  try {
    const { timeframe = '24h' } = req.query;
    
    let timeFilter = {};
    const now = new Date();
    
    switch (timeframe) {
      case '1h':
        timeFilter.createdAt = { $gte: new Date(now.getTime() - 60 * 60 * 1000) };
        break;
      case '24h':
        timeFilter.createdAt = { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) };
        break;
      case '7d':
        timeFilter.createdAt = { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
        break;
      default:
        timeFilter.createdAt = { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) };
    }
    
    const [healthMetrics] = await TopUp.aggregate([
      { $match: timeFilter },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          successfulTransactions: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          failedTransactions: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          },
          pendingTransactions: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          totalVolume: { $sum: '$amount' },
          avgProcessingTime: { $avg: '$processingTimeMinutes' }
        }
      },
      {
        $addFields: {
          successRate: {
            $multiply: [
              { $divide: ['$successfulTransactions', '$totalTransactions'] },
              100
            ]
          },
          failureRate: {
            $multiply: [
              { $divide: ['$failedTransactions', '$totalTransactions'] },
              100
            ]
          },
          pendingRate: {
            $multiply: [
              { $divide: ['$pendingTransactions', '$totalTransactions'] },
              100
            ]
          }
        }
      }
    ]);
    
    // Get system alerts based on metrics
    const alerts = [];
    if (healthMetrics) {
      if (healthMetrics.failureRate > 10) {
        alerts.push({
          level: 'critical',
          message: `High failure rate: ${healthMetrics.failureRate.toFixed(1)}%`,
          recommendation: 'Investigate failed transactions and provider connectivity'
        });
      }
      
      if (healthMetrics.pendingRate > 20) {
        alerts.push({
          level: 'warning',
          message: `High pending rate: ${healthMetrics.pendingRate.toFixed(1)}%`,
          recommendation: 'Check processing delays and queue status'
        });
      }
      
      if (healthMetrics.avgProcessingTime > 30) {
        alerts.push({
          level: 'warning',
          message: `Slow processing: ${healthMetrics.avgProcessingTime.toFixed(1)} minutes average`,
          recommendation: 'Optimize processing workflows'
        });
      }
    }
    
    res.json({
      success: true,
      data: {
        metrics: healthMetrics || {
          totalTransactions: 0,
          successfulTransactions: 0,
          failedTransactions: 0,
          pendingTransactions: 0,
          totalVolume: 0,
          successRate: 0,
          failureRate: 0,
          pendingRate: 0,
          avgProcessingTime: 0
        },
        alerts,
        timeframe
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching health metrics',
      error: error.message
    });
  }
});

// POST bulk update topup statuses
router.post('/topups/bulk-update', async (req, res) => {
  try {
    const { topupIds, status, notes } = req.body;
    
    if (!topupIds || !Array.isArray(topupIds) || topupIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'TopUp IDs array is required'
      });
    }
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }
    
    const updateData = { status };
    
    if (status === 'completed') {
      updateData.completedAt = new Date();
    } else if (status === 'failed') {
      updateData.failedAt = new Date();
      updateData.failureReason = notes || 'Bulk update';
    }
    
    const result = await TopUp.updateMany(
      { _id: { $in: topupIds } },
      updateData
    );
    
    // Log audit trail for bulk operation
    const auditPromises = topupIds.map(topupId => 
      AuditTrail.logTopUpEvent(
        topupId,
        `topup_bulk_${status}`,
        `bulk_update_status_to_${status}`,
        [{ field: 'status', newValue: status }],
        {
          ipAddress: req.ip,
          method: 'POST',
          endpoint: '/api/topups/bulk-update',
          bulkOperation: true,
          affectedCount: result.modifiedCount
        }
      )
    );
    
    await Promise.all(auditPromises);
    
    res.json({
      success: true,
      message: `${result.modifiedCount} topups updated successfully`,
      data: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error performing bulk update',
      error: error.message
    });
  }
});

export default router;
