import express from 'express';
import Card from '../models/Card.js';
import BankAccount from '../models/BankAccount.js';
import CardReplacementTracker from '../models/CardReplacementTracker.js';
import AuditTrail from '../models/AuditTrail.js';
import binLookupService from '../services/binLookupService.js';

const router = express.Router();

// GET all cards with search, filter, and pagination
router.get('/cards', async (req, res) => {
  try {
    const { 
      bankAccount, 
      status, 
      isActive, 
      search, 
      page = 1, 
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      provider,
      currency
    } = req.query;
    
    let filter = {};
    
    // Build base filters
    if (bankAccount) {
      filter.bankAccount = bankAccount;
    }
    
    if (status) {
      filter.status = status;
    }
    
    // Filter by active bank accounts if isActive is specified
    if (isActive !== undefined) {
      const accountFilter = { isActive: isActive === 'true' };
      const activeAccounts = await BankAccount.find(accountFilter).select('_id');
      filter.bankAccount = { $in: activeAccounts.map(acc => acc._id) };
    }
    
    // Search functionality
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { cardNumber: searchRegex },
        { cardName: searchRegex }
      ];
    }
    
    // Build aggregation pipeline for complex filters
    let pipeline = [
      {
        $lookup: {
          from: 'bankaccounts',
          localField: 'bankAccount',
          foreignField: '_id',
          as: 'bankAccountData'
        }
      },
      {
        $lookup: {
          from: 'bankproviders',
          localField: 'bankAccountData.provider',
          foreignField: '_id',
          as: 'providerData'
        }
      }
    ];
    
    // Apply basic filters
    let matchStage = { ...filter };
    
    // Provider filter
    if (provider) {
      matchStage['providerData.code'] = provider;
    }
    
    // Currency filter
    if (currency) {
      matchStage['bankAccountData.currency'] = currency;
    }
    
    pipeline.push({ $match: matchStage });
    
    // Add pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Sort
    const sortStage = {};
    sortStage[sortBy] = sortOrder === 'desc' ? -1 : 1;
    pipeline.push({ $sort: sortStage });
    
    // Get total count for pagination
    const totalPipeline = [...pipeline, { $count: 'total' }];
    const totalResult = await Card.aggregate(totalPipeline);
    const total = totalResult.length > 0 ? totalResult[0].total : 0;
    
    // Add pagination to main pipeline
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limitNum });
    
    // Execute aggregation
    const cards = await Card.aggregate(pipeline);
    
    // Populate the results manually (since aggregate doesn't support populate)
    const populatedCards = await Card.populate(cards, [
      { path: 'bankAccount', select: 'name accountNumber currency provider isActive' },
      { path: 'bankAccount.provider', select: 'name code' }
    ]);
    
    const totalPages = Math.ceil(total / limitNum);
    
    res.json({
      success: true,
      data: populatedCards,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems: total,
        itemsPerPage: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      },
      filters: {
        bankAccount,
        status,
        isActive,
        search,
        provider,
        currency,
        sortBy,
        sortOrder
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching cards',
      error: error.message
    });
  }
});

// GET cards analytics summary
router.get('/cards/analytics/summary', async (req, res) => {
  try {
    const { bankAccount, provider, startDate, endDate } = req.query;
    
    let filter = {};
    
    if (bankAccount) {
      filter.bankAccount = bankAccount;
    }
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    // Build aggregation pipeline
    let pipeline = [
      {
        $lookup: {
          from: 'bankaccounts',
          localField: 'bankAccount',
          foreignField: '_id',
          as: 'bankAccountData'
        }
      },
      {
        $lookup: {
          from: 'bankproviders',
          localField: 'bankAccountData.provider',
          foreignField: '_id',
          as: 'providerData'
        }
      }
    ];
    
    // Apply filters
    let matchStage = { ...filter };
    if (provider) {
      matchStage['providerData.code'] = provider;
    }
    
    pipeline.push({ $match: matchStage });
    
    const cards = await Card.aggregate(pipeline);
    
    // Calculate summary statistics
    const summary = {
      totalCards: cards.length,
      byStatus: {},
      byProvider: {},
      byCurrency: {},
      byCreationSource: {},
      fraudStats: {
        highRiskCards: 0,
        totalReplacements: 0,
        averageRiskScore: 0
      },
      usageStats: {
        totalUsageCount: 0,
        averageUsagePerCard: 0,
        mostUsedCard: null,
        lastActivity: null
      },
      timeline: []
    };
    
    let totalRiskScore = 0;
    let totalUsage = 0;
    let mostUsed = { count: 0, card: null };
    let latestActivity = null;
    
    // Process each card for statistics
    cards.forEach(card => {
      // Status distribution
      summary.byStatus[card.status] = (summary.byStatus[card.status] || 0) + 1;
      
      // Provider distribution
      if (card.providerData && card.providerData[0]) {
        const providerName = card.providerData[0].name;
        summary.byProvider[providerName] = (summary.byProvider[providerName] || 0) + 1;
      }
      
      // Currency distribution
      if (card.bankAccountData && card.bankAccountData[0]) {
        const currency = card.bankAccountData[0].currency;
        summary.byCurrency[currency] = (summary.byCurrency[currency] || 0) + 1;
      }
      
      // Creation source distribution
      summary.byCreationSource[card.creationSource || 'initial'] = 
        (summary.byCreationSource[card.creationSource || 'initial'] || 0) + 1;
      
      // Fraud statistics
      if (card.fraudFlags && card.fraudFlags.isHighRisk) {
        summary.fraudStats.highRiskCards++;
      }
      
      if (card.fraudFlags && card.fraudFlags.riskScore) {
        totalRiskScore += card.fraudFlags.riskScore;
      }
      
      if (card.replacementHistory && card.replacementHistory.length > 0) {
        summary.fraudStats.totalReplacements += card.replacementHistory.length;
      }
      
      // Usage statistics
      const usage = card.usageCount || 0;
      totalUsage += usage;
      
      if (usage > mostUsed.count) {
        mostUsed.count = usage;
        mostUsed.card = {
          _id: card._id,
          cardNumber: card.cardNumber,
          cardName: card.cardName,
          usageCount: usage
        };
      }
      
      // Last activity tracking
      if (card.lastUsedAt && (!latestActivity || new Date(card.lastUsedAt) > new Date(latestActivity))) {
        latestActivity = card.lastUsedAt;
      }
    });
    
    // Calculate averages
    if (cards.length > 0) {
      summary.fraudStats.averageRiskScore = totalRiskScore / cards.length;
      summary.usageStats.averageUsagePerCard = totalUsage / cards.length;
    }
    
    summary.usageStats.totalUsageCount = totalUsage;
    summary.usageStats.mostUsedCard = mostUsed.card;
    summary.usageStats.lastActivity = latestActivity;
    
    // Generate timeline data (cards created over time)
    const timelineMap = {};
    cards.forEach(card => {
      const date = new Date(card.createdAt).toISOString().split('T')[0];
      timelineMap[date] = (timelineMap[date] || 0) + 1;
    });
    
    summary.timeline = Object.entries(timelineMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching cards analytics',
      error: error.message
    });
  }
});

// GET card analytics by provider
router.get('/cards/analytics/providers', async (req, res) => {
  try {
    const pipeline = [
      {
        $lookup: {
          from: 'bankaccounts',
          localField: 'bankAccount',
          foreignField: '_id',
          as: 'bankAccountData'
        }
      },
      {
        $lookup: {
          from: 'bankproviders',
          localField: 'bankAccountData.provider',
          foreignField: '_id',
          as: 'providerData'
        }
      },
      {
        $group: {
          _id: '$providerData.name',
          providerCode: { $first: '$providerData.code' },
          totalCards: { $sum: 1 },
          activeCards: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          usedCards: {
            $sum: { $cond: [{ $eq: ['$status', 'used'] }, 1, 0] }
          },
          expiredCards: {
            $sum: { $cond: [{ $eq: ['$status', 'expired'] }, 1, 0] }
          },
          blockedCards: {
            $sum: { $cond: [{ $eq: ['$status', 'blocked'] }, 1, 0] }
          },
          totalUsage: { $sum: '$usageCount' },
          totalReplacements: { $sum: { $size: { $ifNull: ['$replacementHistory', []] } } },
          averageRiskScore: { $avg: '$fraudFlags.riskScore' }
        }
      },
      {
        $sort: { totalCards: -1 }
      }
    ];
    
    const providerStats = await Card.aggregate(pipeline);
    
    res.json({
      success: true,
      data: providerStats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching provider analytics',
      error: error.message
    });
  }
});

// GET cards usage analytics
router.get('/cards/analytics/usage', async (req, res) => {
  try {
    const { timeRange = '30d', bankAccount } = req.query;
    
    // Calculate date range
    let startDate = new Date();
    switch (timeRange) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }
    
    let filter = {
      lastUsedAt: { $gte: startDate }
    };
    
    if (bankAccount) {
      filter.bankAccount = bankAccount;
    }
    
    const usageData = await Card.find(filter)
      .populate('bankAccount', 'name accountNumber currency')
      .sort({ usageCount: -1, lastUsedAt: -1 });
    
    // Calculate usage statistics
    const stats = {
      totalCardsUsed: usageData.length,
      totalUsage: usageData.reduce((sum, card) => sum + (card.usageCount || 0), 0),
      averageUsagePerCard: 0,
      topUsedCards: usageData.slice(0, 10).map(card => ({
        _id: card._id,
        cardNumber: card.cardNumber,
        cardName: card.cardName,
        usageCount: card.usageCount,
        lastUsedAt: card.lastUsedAt,
        bankAccount: card.bankAccount
      })),
      usageByStatus: {},
      dailyUsage: []
    };
    
    if (usageData.length > 0) {
      stats.averageUsagePerCard = stats.totalUsage / usageData.length;
    }
    
    // Usage by status
    usageData.forEach(card => {
      stats.usageByStatus[card.status] = (stats.usageByStatus[card.status] || 0) + (card.usageCount || 0);
    });
    
    // Generate daily usage timeline
    const dailyUsageMap = {};
    usageData.forEach(card => {
      if (card.lastUsedAt) {
        const date = new Date(card.lastUsedAt).toISOString().split('T')[0];
        dailyUsageMap[date] = (dailyUsageMap[date] || 0) + (card.usageCount || 0);
      }
    });
    
    stats.dailyUsage = Object.entries(dailyUsageMap)
      .map(([date, usage]) => ({ date, usage }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    res.json({
      success: true,
      data: stats,
      timeRange,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching usage analytics',
      error: error.message
    });
  }
});

// GET single card by ID with detailed analytics
router.get('/cards/:id', async (req, res) => {
  try {
    const card = await Card.findById(req.params.id)
      .populate({
        path: 'bankAccount',
        select: 'name accountNumber currency address provider isActive',
        populate: {
          path: 'provider',
          select: 'name code supportedCurrencies'
        }
      })
      .populate('binLookup');
    
    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Card not found'
      });
    }
    
    // Get card analytics and related data
    const analytics = {
      basicInfo: {
        id: card._id,
        cardNumber: card.cardNumber,
        cardName: card.cardName,
        status: card.status,
        createdAt: card.createdAt,
        expiredDate: card.expiredDate,
        lastUsedAt: card.lastUsedAt,
        usageCount: card.usageCount || 0,
        creationSource: card.creationSource || 'initial'
      },
      bankAccount: card.bankAccount,
      binInformation: {
        bin: card.binInfo?.bin || card.binLookup?.bin,
        scheme: card.binInfo?.scheme || card.binLookup?.scheme,
        type: card.binInfo?.cardType || card.binLookup?.type,
        brand: card.binInfo?.brand || card.binLookup?.brand,
        country: card.binInfo?.country || card.binLookup?.country,
        bank: card.binInfo?.bank || card.binLookup?.bank,
        prepaid: card.binLookup?.prepaid || false,
        riskLevel: card.binLookup?.riskLevel || 'unknown',
        lookupCount: card.binLookup?.lookupCount || 0,
        lastUpdated: card.binInfo?.lastUpdated || card.binLookup?.lastLookupAt
      },
      fraudAnalytics: {
        isHighRisk: card.fraudFlags?.isHighRisk || false,
        riskScore: card.fraudFlags?.riskScore || 0,
        lastRiskAssessment: card.fraudFlags?.lastRiskAssessment,
        flaggedReasons: card.fraudFlags?.flaggedReasons || [],
        replacementCount: card.replacementHistory?.length || 0,
        replacementHistory: card.replacementHistory || []
      },
      usageAnalytics: {
        totalUsage: card.usageCount || 0,
        daysSinceCreation: Math.floor((new Date() - new Date(card.createdAt)) / (1000 * 60 * 60 * 24)),
        daysSinceLastUse: card.lastUsedAt 
          ? Math.floor((new Date() - new Date(card.lastUsedAt)) / (1000 * 60 * 60 * 24))
          : null,
        averageUsagePerDay: 0,
        isExpired: new Date(card.expiredDate) < new Date(),
        daysUntilExpiry: Math.ceil((new Date(card.expiredDate) - new Date()) / (1000 * 60 * 60 * 24))
      }
    };
    
    // Calculate usage per day
    if (analytics.usageAnalytics.daysSinceCreation > 0) {
      analytics.usageAnalytics.averageUsagePerDay = 
        analytics.usageAnalytics.totalUsage / analytics.usageAnalytics.daysSinceCreation;
    }
    
    // Get related transactions using this card
    const Transaction = (await import('../models/Transaction.js')).default;
    const relatedTransactions = await Transaction.find({ card: card._id })
      .populate('fromAccount', 'name currency')
      .populate('toAccount', 'name currency')
      .sort({ createdAt: -1 })
      .limit(10);
    
    // Get fraud detection activities
    const fraudActivities = await CardReplacementTracker.find({
      $or: [
        { cardId: card._id },
        { bankAccount: card.bankAccount._id }
      ]
    }).sort({ createdAt: -1 }).limit(5);
    
    // Get audit trail for this card
    const auditTrail = await AuditTrail.find({
      'entityId': card._id,
      'entityType': 'Card'
    }).sort({ timestamp: -1 }).limit(10);
    
    // Calculate comparison metrics with other cards from same account
    const accountCards = await Card.find({
      bankAccount: card.bankAccount._id,
      _id: { $ne: card._id }
    });
    
    const comparisonMetrics = {
      accountTotalCards: accountCards.length + 1,
      rankByUsage: 1,
      usagePercentile: 0,
      riskComparison: 'average'
    };
    
    // Calculate usage ranking
    const higherUsageCards = accountCards.filter(c => (c.usageCount || 0) > (card.usageCount || 0));
    comparisonMetrics.rankByUsage = higherUsageCards.length + 1;
    comparisonMetrics.usagePercentile = accountCards.length > 0 
      ? ((accountCards.length - higherUsageCards.length) / (accountCards.length + 1)) * 100
      : 100;
    
    // Risk comparison
    const accountRiskScores = accountCards
      .map(c => c.fraudFlags?.riskScore || 0)
      .filter(score => score > 0);
    
    if (accountRiskScores.length > 0) {
      const averageRisk = accountRiskScores.reduce((sum, score) => sum + score, 0) / accountRiskScores.length;
      const cardRisk = card.fraudFlags?.riskScore || 0;
      
      if (cardRisk > averageRisk * 1.2) {
        comparisonMetrics.riskComparison = 'above_average';
      } else if (cardRisk < averageRisk * 0.8) {
        comparisonMetrics.riskComparison = 'below_average';
      } else {
        comparisonMetrics.riskComparison = 'average';
      }
    }
    
    res.json({
      success: true,
      data: {
        card: analytics,
        relatedTransactions,
        fraudActivities,
        auditTrail,
        comparisonMetrics
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching card details',
      error: error.message
    });
  }
});

// POST create new card
router.post('/cards', async (req, res) => {
  try {
    const { 
      cardNumber, 
      cardName, 
      expiredDate, 
      cvv, 
      bankAccount, 
      address, 
      useAccountAddress 
    } = req.body;
    
    // Validation
    if (!cardNumber || !cardName || !expiredDate || !cvv || !bankAccount) {
      return res.status(400).json({
        success: false,
        message: 'Card number, name, expired date, CVV, and bank account are required'
      });
    }
    
    // Check if bank account exists and is active
    const account = await BankAccount.findById(bankAccount);
    if (!account) {
      return res.status(400).json({
        success: false,
        message: 'Bank account not found'
      });
    }
    
    if (!account.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Bank account is not active'
      });
    }
    
    // Check if card number already exists
    const existingCard = await Card.findOne({ cardNumber });
    if (existingCard) {
      return res.status(400).json({
        success: false,
        message: 'Card number already exists'
      });
    }
    
    // Validate expired date
    const expDate = new Date(expiredDate);
    if (expDate <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Expired date must be in the future'
      });
    }
    
    // Determine address to use
    let cardAddress = {};
    if (useAccountAddress) {
      cardAddress = account.address || {};
    } else {
      cardAddress = address || {};
    }
    
    // Perform BIN lookup
    let binLookup = null;
    let binInfo = {};
    try {
      binLookup = await binLookupService.getBinInfo(cardNumber);
      
      console.log(`🔍 BIN lookup raw result:`, JSON.stringify(binLookup, null, 2));
      
      // Extract relevant BIN info for card with proper null handling
      binInfo = {
        bin: binLookup.bin || binLookupService.extractBin(cardNumber),
        scheme: binLookup.scheme || 'unknown',
        cardType: binLookup.type || 'unknown',
        brand: binLookup.brand || 'unknown',
        country: {
          name: binLookup.country?.name || 'Unknown',
          alpha2: binLookup.country?.alpha2 || null,
          emoji: binLookup.country?.emoji || null,
          currency: binLookup.country?.currency || null
        },
        bank: {
          name: binLookup.bank?.name || 'Unknown',
          city: binLookup.bank?.city || null
        },
        lastUpdated: new Date()
      };
      
      console.log(`📋 Prepared binInfo for card:`, JSON.stringify(binInfo, null, 2));
      console.log(`✅ BIN lookup successful for card: ${binLookup.scheme} from ${binLookup.country?.name}`);
      
    } catch (error) {
      console.warn(`⚠️ BIN lookup failed for card ${cardNumber}:`, error.message);
      // Continue card creation even if BIN lookup fails with basic structure
      binInfo = {
        bin: binLookupService.extractBin(cardNumber),
        scheme: 'unknown',
        cardType: 'unknown',
        brand: 'unknown',
        country: {
          name: 'Unknown',
          alpha2: null,
          emoji: null,
          currency: null
        },
        bank: {
          name: 'Unknown',
          city: null
        },
        lastUpdated: new Date()
      };
      
      console.log(`📋 Fallback binInfo for card:`, JSON.stringify(binInfo, null, 2));
    }
    
    // Create card data object with explicit type checking
    const cardData = {
      cardNumber,
      cardName,
      expiredDate: expDate,
      cvv,
      bankAccount,
      address: cardAddress,
      useAccountAddress: useAccountAddress !== undefined ? useAccountAddress : true,
      binLookup: binLookup?._id || null,
      binInfo: binInfo // Ensure binInfo is an object, not string
    };
    
    console.log(`🏗️ Creating card with data:`, JSON.stringify(cardData, null, 2));
    
    const card = new Card(cardData);
    
    const savedCard = await card.save();
    
    const populatedCard = await Card.findById(savedCard._id)
      .populate('bankAccount', 'name accountNumber currency');
    
    res.status(201).json({
      success: true,
      message: 'Card created successfully',
      data: populatedCard
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating card',
      error: error.message
    });
  }
});

// PUT update card
router.put('/cards/:id', async (req, res) => {
  try {
    const { 
      cardName, 
      expiredDate, 
      cvv, 
      address, 
      useAccountAddress,
      status 
    } = req.body;
    
    const updateData = {};
    if (cardName) updateData.cardName = cardName;
    if (expiredDate) updateData.expiredDate = new Date(expiredDate);
    if (cvv) updateData.cvv = cvv;
    if (address) updateData.address = address;
    if (useAccountAddress !== undefined) updateData.useAccountAddress = useAccountAddress;
    if (status) updateData.status = status;
    
    const card = await Card.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('bankAccount', 'name accountNumber currency');
    
    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Card not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Card updated successfully',
      data: card
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating card',
      error: error.message
    });
  }
});

// DELETE card (soft delete by setting status to blocked)
router.delete('/cards/:id', async (req, res) => {
  try {
    const card = await Card.findByIdAndUpdate(
      req.params.id,
      { status: 'blocked' },
      { new: true }
    ).populate('bankAccount', 'name accountNumber currency');
    
    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Card not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Card blocked successfully',
      data: card
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error blocking card',
      error: error.message
    });
  }
});

// POST mark card as used
router.post('/cards/:id/mark-used', async (req, res) => {
  try {
    const card = await Card.findById(req.params.id);
    
    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Card not found'
      });
    }
    
    if (card.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Card is not active'
      });
    }
    
    await card.markAsUsed();
    
    const updatedCard = await Card.findById(card._id)
      .populate('bankAccount', 'name accountNumber currency');
    
    res.json({
      success: true,
      message: 'Card marked as used successfully',
      data: updatedCard
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error marking card as used',
      error: error.message
    });
  }
});

// GET available cards for a bank account
router.get('/cards/available/:bankAccountId', async (req, res) => {
  try {
    const cards = await Card.find({
      bankAccount: req.params.bankAccountId,
      status: 'active'
    }).populate('bankAccount', 'name accountNumber currency');
    
    res.json({
      success: true,
      data: cards,
      count: cards.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching available cards',
      error: error.message
    });
  }
});

// POST replace card dengan fraud detection
router.post('/cards/:id/replace', async (req, res) => {
  try {
    const { 
      newCardNumber, 
      newCardName, 
      newExpiredDate, 
      newCvv, 
      reason,
      notes,
      address,
      useAccountAddress 
    } = req.body;
    
    const oldCard = await Card.findById(req.params.id)
      .populate('bankAccount');
    
    if (!oldCard) {
      return res.status(404).json({
        success: false,
        message: 'Card not found'
      });
    }
    
    // Fraud detection check
    const riskAssessment = await CardReplacementTracker.assessRisk(
      oldCard.bankAccount.provider,
      oldCard.bankAccount._id,
      'card_replacement'
    );
    
    // Check if replacement should be blocked due to high risk
    if (riskAssessment.riskLevel === 'critical') {
      return res.status(429).json({
        success: false,
        message: 'Card replacement blocked due to high risk activity',
        riskAssessment,
        requiresReview: true
      });
    }
    
    // Create replacement tracking record
    const trackingRecord = await CardReplacementTracker.createActivity({
      provider: oldCard.bankAccount.provider,
      bankAccount: oldCard.bankAccount._id,
      activityType: 'card_replacement',
      cardId: oldCard._id,
      details: {
        previousCardNumber: oldCard.cardNumber,
        newCardNumber: newCardNumber,
        reason: reason || 'other',
        processingTime: 0, // Will be updated when completed
        success: true
      }
    });
    
    // Generate fraud alert if needed
    const fraudAlert = trackingRecord.generateAlert();
    
    // Update old card
    oldCard.status = 'used';
    oldCard.replacementHistory.push({
      reason: reason || 'other',
      previousCardNumber: oldCard.cardNumber,
      notes: notes || 'Card replaced via API'
    });
    
    await oldCard.save();
    
    // Create new card
    const newCard = new Card({
      cardNumber: newCardNumber,
      cardName: newCardName,
      expiredDate: new Date(newExpiredDate),
      cvv: newCvv,
      bankAccount: oldCard.bankAccount._id,
      address: useAccountAddress ? oldCard.bankAccount.address : (address || oldCard.address),
      useAccountAddress: useAccountAddress !== undefined ? useAccountAddress : oldCard.useAccountAddress,
      creationSource: 'replacement',
      fraudFlags: {
        riskScore: riskAssessment.riskScore,
        lastRiskAssessment: new Date(),
        flaggedReasons: riskAssessment.riskFactors.map(f => f.factor)
      }
    });
    
    const savedCard = await newCard.save();
    
    // Log audit trails
    await AuditTrail.logCardEvent(
      oldCard._id,
      'card_replaced',
      'replace_old_card',
      { status: 'active' },
      { status: 'used' },
      {
        ipAddress: req.ip,
        method: 'POST',
        endpoint: `/api/cards/${req.params.id}/replace`
      }
    );
    
    await AuditTrail.logCardEvent(
      savedCard._id,
      'card_created',
      'create_replacement_card',
      null,
      savedCard.toObject(),
      {
        ipAddress: req.ip,
        method: 'POST',
        endpoint: `/api/cards/${req.params.id}/replace`,
        replacementFor: oldCard._id
      }
    );
    
    // Log fraud alert if triggered
    if (fraudAlert) {
      await AuditTrail.logFraudAlert(
        savedCard._id,
        'Card',
        fraudAlert,
        {
          ipAddress: req.ip,
          triggeredBy: 'card_replacement',
          originalCardId: oldCard._id
        }
      );
    }
    
    const populatedCard = await Card.findById(savedCard._id)
      .populate('bankAccount', 'name accountNumber currency');
    
    res.status(201).json({
      success: true,
      message: 'Card replaced successfully',
      data: {
        newCard: populatedCard,
        oldCardId: oldCard._id,
        riskAssessment,
        fraudAlert: fraudAlert || null,
        warnings: riskAssessment.riskLevel !== 'low' ? [
          `Risk level: ${riskAssessment.riskLevel}`,
          `Risk score: ${riskAssessment.riskScore}`,
          ...riskAssessment.riskFactors.map(f => f.description)
        ] : []
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error replacing card',
      error: error.message
    });
  }
});

// GET fraud detection status
router.get('/cards/fraud-detection/status', async (req, res) => {
  try {
    const { bankAccount, provider } = req.query;
    
    if (!bankAccount) {
      return res.status(400).json({
        success: false,
        message: 'Bank account ID is required'
      });
    }
    
    // Get current risk assessment
    const riskAssessment = await CardReplacementTracker.assessRisk(
      provider,
      bankAccount,
      'card_creation' // Check general activity
    );
    
    // Get recent activities
    const recentActivities = await CardReplacementTracker.find({
      bankAccount,
      date: { 
        $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
      }
    }).sort({ date: -1 }).limit(10);
    
    // Get high-risk activities
    const highRiskActivities = await CardReplacementTracker.find({
      bankAccount,
      'riskAssessment.riskLevel': { $in: ['high', 'critical'] }
    }).sort({ date: -1 }).limit(5);
    
    res.json({
      success: true,
      data: {
        currentRiskLevel: riskAssessment.riskLevel,
        currentRiskScore: riskAssessment.riskScore,
        dailyStats: riskAssessment.dailyStats,
        alertStatus: riskAssessment.alertTriggered,
        recentActivities,
        highRiskActivities: highRiskActivities.length,
        recommendations: riskAssessment.riskLevel !== 'low' ? [
          'Monitor account closely',
          'Require additional verification for new activities',
          'Consider temporary activity suspension if risk increases'
        ] : ['Normal activity - no special action required']
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error getting fraud detection status',
      error: error.message
    });
  }
});

// GET fraud alerts
router.get('/cards/fraud-detection/alerts', async (req, res) => {
  try {
    const { bankAccount, riskLevel, limit = 20 } = req.query;
    
    let filter = {
      'riskAssessment.alertTriggered': true
    };
    
    if (bankAccount) {
      filter.bankAccount = bankAccount;
    }
    
    if (riskLevel) {
      filter['riskAssessment.riskLevel'] = riskLevel;
    }
    
    const alerts = await CardReplacementTracker.find(filter)
      .populate('bankAccount', 'name accountNumber')
      .populate('provider', 'name code')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    const alertSummary = alerts.map(alert => ({
      id: alert._id,
      date: alert.createdAt,
      activityType: alert.activityType,
      riskLevel: alert.riskAssessment.riskLevel,
      riskScore: alert.riskAssessment.riskScore,
      alertType: alert.riskAssessment.alertType,
      alertMessage: alert.riskAssessment.alertMessage,
      bankAccount: alert.bankAccount,
      provider: alert.provider,
      requiresReview: alert.riskAssessment.reviewRequired,
      fraudAlert: alert.generateAlert()
    }));
    
    res.json({
      success: true,
      data: alertSummary,
      count: alertSummary.length
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching fraud alerts',
      error: error.message
    });
  }
});

export default router;
