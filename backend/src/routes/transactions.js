import express from 'express';
import Transaction from '../models/Transaction.js';
import BankAccount from '../models/BankAccount.js';
import Card from '../models/Card.js';

const router = express.Router();

// GET all transactions with enhanced filtering
router.get('/transactions', async (req, res) => {
  try {
    const { 
      fromAccount, 
      toAccount, 
      status, 
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
    
    // Account filters
    if (fromAccount) {
      filter.fromAccount = fromAccount;
    }
    
    if (toAccount) {
      filter.toAccount = toAccount;
    }
    
    // Status filter
    if (status) {
      filter.status = status;
    }
    
    // Currency filter
    if (currency) {
      filter.$or = [
        { fromCurrency: currency.toUpperCase() },
        { toCurrency: currency.toUpperCase() }
      ];
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
        { transactionId: searchRegex },
        { description: searchRegex },
        ...(filter.$or || [])
      ];
    }
    
    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Sort options
    const sortOptions = {};
    const validSortFields = ['createdAt', 'amount', 'status', 'transactionId'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    sortOptions[sortField] = sortDirection;
    
    const transactions = await Transaction.find(filter)
      .populate('fromAccount', 'name accountNumber currency balance')
      .populate('toAccount', 'name accountNumber currency balance')
      .populate('card', 'cardNumber cardName cardType status')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const totalCount = await Transaction.countDocuments(filter);
    
    res.json({
      success: true,
      data: transactions,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalCount,
        hasNextPage: skip + transactions.length < totalCount,
        hasPrevPage: parseInt(page) > 1
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching transactions',
      error: error.message
    });
  }
});

// GET transaction summary (MUST BE BEFORE /:id route)
router.get('/transactions/summary', async (req, res) => {
  try {
    const { fromAccount, toAccount, startDate, endDate } = req.query;
    
    let filter = {};
    
    if (fromAccount) {
      filter.fromAccount = fromAccount;
    }
    
    if (toAccount) {
      filter.toAccount = toAccount;
    }
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    const transactions = await Transaction.find(filter);
    
    const summary = {
      totalTransactions: transactions.length,
      totalAmount: transactions.reduce((sum, t) => sum + t.amount, 0),
      totalFees: transactions.reduce((sum, t) => sum + t.fee, 0),
      byStatus: {},
      byCurrency: {}
    };
    
    // Group by status
    transactions.forEach(t => {
      summary.byStatus[t.status] = (summary.byStatus[t.status] || 0) + 1;
    });
    
    // Group by currency pair
    transactions.forEach(t => {
      const pair = `${t.fromCurrency}-${t.toCurrency}`;
      if (!summary.byCurrency[pair]) {
        summary.byCurrency[pair] = {
          count: 0,
          totalAmount: 0,
          totalConverted: 0
        };
      }
      summary.byCurrency[pair].count += 1;
      summary.byCurrency[pair].totalAmount += t.amount;
      summary.byCurrency[pair].totalConverted += t.convertedAmount;
    });
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching transaction summary',
      error: error.message
    });
  }
});

// GET single transaction by ID
router.get('/transactions/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('fromAccount', 'name accountNumber currency address')
      .populate('toAccount', 'name accountNumber currency address')
      .populate('card', 'cardNumber cardName expiredDate cvv address');
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching transaction',
      error: error.message
    });
  }
});

// POST create new transfer transaction
router.post('/transactions/transfer', async (req, res) => {
  try {
    const { 
      fromAccount, 
      toAccount, 
      amount, 
      cardId, 
      description 
    } = req.body;
    
    // Validation
    if (!fromAccount || !toAccount || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'From account, to account, and valid amount are required'
      });
    }
    
    // Check if accounts exist and are active
    const fromAccountDoc = await BankAccount.findById(fromAccount);
    const toAccountDoc = await BankAccount.findById(toAccount);
    
    if (!fromAccountDoc || !toAccountDoc) {
      return res.status(400).json({
        success: false,
        message: 'One or both accounts not found'
      });
    }
    
    if (!fromAccountDoc.isActive || !toAccountDoc.isActive) {
      return res.status(400).json({
        success: false,
        message: 'One or both accounts are not active'
      });
    }
    
    // Check if accounts are different
    if (fromAccount === toAccount) {
      return res.status(400).json({
        success: false,
        message: 'Cannot transfer to the same account'
      });
    }
    
    // Check if from account has sufficient balance
    if (fromAccountDoc.balance < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance in source account'
      });
    }
    
    // Validate card if provided
    let card = null;
    if (cardId) {
      card = await Card.findById(cardId);
      if (!card) {
        return res.status(400).json({
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
      
      if (card.bankAccount.toString() !== fromAccount) {
        return res.status(400).json({
          success: false,
          message: 'Card does not belong to source account'
        });
      }
    }
    
    // Get exchange rate from existing rates API
    // For now, we'll use a simple 1:1 rate for same currency
    // In real implementation, this should call the rates API
    let exchangeRate = 1;
    let convertedAmount = amount;
    
    if (fromAccountDoc.currency !== toAccountDoc.currency) {
      // TODO: Integrate with rates API
      // For now, use placeholder rate
      exchangeRate = 1.5; // Placeholder rate
      convertedAmount = amount * exchangeRate;
    }
    
    // Calculate fees (placeholder for now)
    const fee = 0; // TODO: Implement fee calculation
    const totalAmount = amount + fee;
    
    // Create transaction
    const transaction = new Transaction({
      fromAccount,
      toAccount,
      amount,
      fromCurrency: fromAccountDoc.currency,
      toCurrency: toAccountDoc.currency,
      exchangeRate,
      convertedAmount,
      fee,
      totalAmount,
      card: cardId,
      description: description || `Transfer from ${fromAccountDoc.name} to ${toAccountDoc.name}`
    });
    
    const savedTransaction = await transaction.save();
    
    // Mark card as used if provided
    if (card) {
      await card.markAsUsed();
    }
    
    // Update account balances
    fromAccountDoc.balance -= amount;
    toAccountDoc.balance += convertedAmount;
    
    await fromAccountDoc.save();
    await toAccountDoc.save();
    
    // Populate transaction data
    const populatedTransaction = await Transaction.findById(savedTransaction._id)
      .populate('fromAccount', 'name accountNumber currency')
      .populate('toAccount', 'name accountNumber currency')
      .populate('card', 'cardNumber cardName');
    
    res.status(201).json({
      success: true,
      message: 'Transfer transaction created successfully',
      data: populatedTransaction
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating transfer transaction',
      error: error.message
    });
  }
});

// PUT update transaction status
router.put('/transactions/:id/status', async (req, res) => {
  try {
    const { status, failureReason } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }
    
    let updateData = { status };
    
    if (status === 'completed') {
      updateData.completedAt = new Date();
    } else if (status === 'failed') {
      updateData.failedAt = new Date();
      updateData.failureReason = failureReason || 'Unknown error';
    }
    
    const transaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('fromAccount', 'name accountNumber currency')
     .populate('toAccount', 'name accountNumber currency')
     .populate('card', 'cardNumber cardName');
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Transaction status updated successfully',
      data: transaction
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating transaction status',
      error: error.message
    });
  }
});

// GET transaction analytics
router.get('/transactions/analytics', async (req, res) => {
  try {
    const { startDate, endDate, currency } = req.query;
    
    let filter = {};
    
    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    // Currency filter
    if (currency) {
      filter.$or = [
        { fromCurrency: currency.toUpperCase() },
        { toCurrency: currency.toUpperCase() }
      ];
    }
    
    const transactions = await Transaction.find(filter);
    
    // Calculate analytics
    const analytics = {
      totalTransactions: transactions.length,
      totalVolume: transactions.reduce((sum, t) => sum + t.amount, 0),
      totalFees: transactions.reduce((sum, t) => sum + (t.fee || 0), 0),
      averageAmount: transactions.length > 0 ? transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length : 0,
      byStatus: {},
      byCurrency: {},
      byMonth: {},
      successRate: 0
    };
    
    // Group by status
    transactions.forEach(t => {
      analytics.byStatus[t.status] = (analytics.byStatus[t.status] || 0) + 1;
    });
    
    // Calculate success rate
    const completedCount = analytics.byStatus.completed || 0;
    analytics.successRate = transactions.length > 0 ? (completedCount / transactions.length) * 100 : 0;
    
    // Group by currency
    transactions.forEach(t => {
      const fromCurrency = t.fromCurrency;
      const toCurrency = t.toCurrency;
      
      if (!analytics.byCurrency[fromCurrency]) {
        analytics.byCurrency[fromCurrency] = { sent: 0, received: 0 };
      }
      if (!analytics.byCurrency[toCurrency]) {
        analytics.byCurrency[toCurrency] = { sent: 0, received: 0 };
      }
      
      analytics.byCurrency[fromCurrency].sent += t.amount;
      analytics.byCurrency[toCurrency].received += t.convertedAmount || t.amount;
    });
    
    // Group by month
    transactions.forEach(t => {
      const monthKey = new Date(t.createdAt).toISOString().slice(0, 7); // YYYY-MM
      if (!analytics.byMonth[monthKey]) {
        analytics.byMonth[monthKey] = {
          count: 0,
          volume: 0,
          fees: 0
        };
      }
      analytics.byMonth[monthKey].count += 1;
      analytics.byMonth[monthKey].volume += t.amount;
      analytics.byMonth[monthKey].fees += t.fee || 0;
    });
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching transaction analytics',
      error: error.message
    });
  }
});

// GET transaction trends
router.get('/transactions/trends', async (req, res) => {
  try {
    const { days = 30, currency } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    let filter = {
      createdAt: { $gte: startDate }
    };
    
    if (currency) {
      filter.$or = [
        { fromCurrency: currency.toUpperCase() },
        { toCurrency: currency.toUpperCase() }
      ];
    }
    
    const transactions = await Transaction.find(filter);
    
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
        failed: 0
      };
    }
    
    transactions.forEach(t => {
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
    
    const trends = Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));
    
    res.json({
      success: true,
      data: trends
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching transaction trends',
      error: error.message
    });
  }
});

export default router;
