import express from 'express';
import Card from '../models/Card.js';
import BankAccount from '../models/BankAccount.js';
import CardReplacementTracker from '../models/CardReplacementTracker.js';
import AuditTrail from '../models/AuditTrail.js';

const router = express.Router();

// GET all cards
router.get('/cards', async (req, res) => {
  try {
    const { bankAccount, status, isActive } = req.query;
    let filter = {};
    
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
    
    const cards = await Card.find(filter)
      .populate('bankAccount', 'name accountNumber currency')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: cards,
      count: cards.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching cards',
      error: error.message
    });
  }
});

// GET single card by ID
router.get('/cards/:id', async (req, res) => {
  try {
    const card = await Card.findById(req.params.id)
      .populate('bankAccount', 'name accountNumber currency address');
    
    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Card not found'
      });
    }
    
    res.json({
      success: true,
      data: card
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching card',
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
    
    const card = new Card({
      cardNumber,
      cardName,
      expiredDate: expDate,
      cvv,
      bankAccount,
      address: cardAddress,
      useAccountAddress: useAccountAddress !== undefined ? useAccountAddress : true
    });
    
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
