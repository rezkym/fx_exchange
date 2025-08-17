import express from 'express';
import BankAccount from '../models/BankAccount.js';
import BankProvider from '../models/BankProvider.js';

const router = express.Router();

// GET all bank accounts
router.get('/bank-accounts', async (req, res) => {
  try {
    const { provider, currency, isActive } = req.query;
    let filter = {};
    
    if (provider) {
      filter.provider = provider;
    }
    
    if (currency) {
      filter.currency = currency.toUpperCase();
    }
    
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }
    
    const accounts = await BankAccount.find(filter)
      .populate('provider', 'name code')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: accounts,
      count: accounts.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching bank accounts',
      error: error.message
    });
  }
});

// GET single bank account by ID
router.get('/bank-accounts/:id', async (req, res) => {
  try {
    const account = await BankAccount.findById(req.params.id)
      .populate('provider', 'name code supportedCurrencies');
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Bank account not found'
      });
    }
    
    res.json({
      success: true,
      data: account
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching bank account',
      error: error.message
    });
  }
});

// POST create new bank account
router.post('/bank-accounts', async (req, res) => {
  try {
    const { name, provider, accountNumber, currencies, address, metadata } = req.body;
    
    // Validation
    if (!name || !provider || !accountNumber) {
      return res.status(400).json({
        success: false,
        message: 'Name, provider, and account number are required'
      });
    }
    
    // Check if provider exists
    const providerDoc = await BankProvider.findById(provider);
    if (!providerDoc) {
      return res.status(400).json({
        success: false,
        message: 'Bank provider not found'
      });
    }
    
    // Validate currencies (if provided), otherwise create with USD default
    const walletsToCreate = [];
    const currenciesToValidate = currencies && currencies.length > 0 ? currencies : ['USD'];
    
    for (const currency of currenciesToValidate) {
      if (!providerDoc.supportedCurrencies.includes(currency.toUpperCase())) {
        return res.status(400).json({
          success: false,
          message: `Currency ${currency} tidak didukung oleh provider ${providerDoc.name}`
        });
      }
      
      walletsToCreate.push({
        currency: currency.toUpperCase(),
        balance: 0,
        isActive: true,
        openedAt: new Date()
      });
    }
    
    // Check if account number already exists for this provider
    const existingAccount = await BankAccount.findOne({
      provider,
      accountNumber
    });
    
    if (existingAccount) {
      return res.status(400).json({
        success: false,
        message: 'Account number already exists for this provider'
      });
    }
    
    const account = new BankAccount({
      name,
      provider,
      accountNumber,
      wallets: walletsToCreate,
      address: address || {},
      metadata: metadata || {}
    });
    
    const savedAccount = await account.save();
    
    const populatedAccount = await BankAccount.findById(savedAccount._id)
      .populate('provider', 'name code supportedCurrencies');
    
    res.status(201).json({
      success: true,
      message: 'Bank account created successfully',
      data: populatedAccount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating bank account',
      error: error.message
    });
  }
});

// PUT update bank account
router.put('/bank-accounts/:id', async (req, res) => {
  try {
    const { name, accountNumber, address, metadata, isActive } = req.body;
    
    const updateData = {};
    if (name) updateData.name = name;
    if (accountNumber) updateData.accountNumber = accountNumber;
    if (address) updateData.address = address;
    if (metadata) updateData.metadata = metadata;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    const account = await BankAccount.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('provider', 'name code supportedCurrencies');
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Bank account not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Bank account updated successfully',
      data: account
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating bank account',
      error: error.message
    });
  }
});

// DELETE bank account (smart delete dengan validasi saldo dan kartu)
router.delete('/bank-accounts/:id', async (req, res) => {
  try {
    const { action = 'check', deleteCards = false, freezeCards = false } = req.body;
    
    const account = await BankAccount.findById(req.params.id);
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Bank account not found'
      });
    }

    // Check balance - apakah ada saldo di wallets
    const hasBalance = account.wallets.some(wallet => wallet.balance > 0);
    
    // Check for related cards
    let relatedCards = [];
    try {
      const Card = (await import('../models/Card.js')).default;
      relatedCards = await Card.find({ 
        bankAccount: req.params.id, 
        status: { $in: ['active', 'blocked'] } 
      });
    } catch (cardError) {
      console.log('Card check skipped:', cardError.message);
    }

    const hasCards = relatedCards.length > 0;

    // Logic berdasarkan kondisi saldo dan kartu
    if (action === 'check') {
      // First call untuk check kondisi
      if (hasBalance && hasCards) {
        return res.status(400).json({
          success: false,
          message: 'Akun tidak dapat dihapus karena masih memiliki saldo aktif',
          reason: 'has_balance_and_cards',
          data: {
            totalBalance: account.wallets.reduce((sum, w) => sum + w.balance, 0),
            activeCards: relatedCards.length,
            wallets: account.wallets.filter(w => w.balance > 0)
          },
          suggestion: 'Akun akan di-deactivate dan dapat diaktifkan kembali'
        });
      } else if (!hasBalance && hasCards) {
        return res.status(400).json({
          success: false,
          message: 'Akun memiliki kartu aktif',
          reason: 'has_cards_only',
          data: {
            activeCards: relatedCards.length,
            cards: relatedCards.map(c => ({ id: c._id, cardNumber: c.cardNumber, status: c.status }))
          },
          suggestion: 'Pilih: hapus semua kartu atau freeze semua kartu?',
          actions: {
            deleteCards: 'Hapus semua kartu dan akun',
            freezeCards: 'Freeze semua kartu dan deactivate akun'
          }
        });
      } else {
        // Tidak ada saldo dan tidak ada kartu - bisa permanent delete
        const deletedAccount = await BankAccount.findByIdAndDelete(req.params.id);
        return res.json({
          success: true,
          message: 'Bank account permanently deleted',
          action: 'permanent_delete',
          data: deletedAccount
        });
      }
    }

    // Execute action berdasarkan user choice
    if (action === 'force_deactivate' || (hasBalance && hasCards)) {
      // Deactivate account
      const updatedAccount = await BankAccount.findByIdAndUpdate(
        req.params.id,
        { isActive: false },
        { new: true }
      ).populate('provider', 'name code supportedCurrencies');
      
      return res.json({
        success: true,
        message: 'Bank account deactivated (dapat diaktifkan kembali)',
        action: 'deactivated',
        data: updatedAccount
      });
    }

    if (action === 'delete_cards' && deleteCards && hasCards) {
      // Delete semua kartu dan account
      try {
        const Card = (await import('../models/Card.js')).default;
        await Card.deleteMany({ bankAccount: req.params.id });
        const deletedAccount = await BankAccount.findByIdAndDelete(req.params.id);
        
        return res.json({
          success: true,
          message: `Bank account dan ${relatedCards.length} kartu berhasil dihapus`,
          action: 'permanent_delete_with_cards',
          data: deletedAccount
        });
      } catch (cardError) {
        console.error('Error deleting cards:', cardError);
      }
    }

    if (action === 'freeze_cards' && freezeCards && hasCards) {
      // Freeze semua kartu dan deactivate account
      try {
        const Card = (await import('../models/Card.js')).default;
        await Card.updateMany(
          { bankAccount: req.params.id },
          { status: 'blocked' }
        );
        
        const updatedAccount = await BankAccount.findByIdAndUpdate(
          req.params.id,
          { isActive: false },
          { new: true }
        ).populate('provider', 'name code supportedCurrencies');
        
        return res.json({
          success: true,
          message: `${relatedCards.length} kartu di-freeze dan akun di-deactivate`,
          action: 'deactivated_with_frozen_cards',
          data: updatedAccount
        });
      } catch (cardError) {
        console.error('Error freezing cards:', cardError);
      }
    }

    // Default fallback
    return res.status(400).json({
      success: false,
      message: 'Invalid action or missing parameters'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error processing bank account deletion',
      error: error.message
    });
  }
});

// GET account balance
router.get('/bank-accounts/:id/balance', async (req, res) => {
  try {
    const account = await BankAccount.findById(req.params.id)
      .select('name wallets provider')
      .populate('provider', 'name code');
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Bank account not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        accountId: account._id,
        accountName: account.name,
        wallets: account.wallets,
        totalBalanceUSD: account.getTotalBalanceUSD(),
        provider: account.provider
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching account balance',
      error: error.message
    });
  }
});

// POST add new currency to bank account
router.post('/bank-accounts/:id/currencies', async (req, res) => {
  try {
    const { currency } = req.body;
    
    if (!currency) {
      return res.status(400).json({
        success: false,
        message: 'Currency is required'
      });
    }
    
    const account = await BankAccount.findById(req.params.id)
      .populate('provider', 'name code supportedCurrencies');
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Bank account not found'
      });
    }
    
    // Check if provider supports the currency
    if (!account.provider.supportedCurrencies.includes(currency.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: `Currency ${currency} tidak didukung oleh provider ${account.provider.name}`
      });
    }
    
    // Check if currency already exists
    const existingWallet = account.wallets.find(w => w.currency === currency.toUpperCase());
    if (existingWallet) {
      return res.status(400).json({
        success: false,
        message: `Currency ${currency} sudah ada di account ini`
      });
    }
    
    await account.addCurrency(currency);
    
    const updatedAccount = await BankAccount.findById(account._id)
      .populate('provider', 'name code');
    
    res.status(201).json({
      success: true,
      message: `Currency ${currency.toUpperCase()} berhasil ditambahkan`,
      data: updatedAccount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding currency',
      error: error.message
    });
  }
});

// GET detailed bank account information with cards, transactions, and analytics
router.get('/bank-accounts/:id/details', async (req, res) => {
  try {
    const { timeRange = '30' } = req.query; // days
    
    // Get bank account with provider info
    const account = await BankAccount.findById(req.params.id)
      .populate('provider', 'name code supportedCurrencies');
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Bank account tidak ditemukan'
      });
    }

    // Get cards associated with this account
    let cards = [];
    try {
      const Card = (await import('../models/Card.js')).default;
      cards = await Card.find({ bankAccount: req.params.id }).sort({ createdAt: -1 });
    } catch (cardError) {
      console.log('Card data unavailable:', cardError.message);
    }

    // Get transactions (both from and to this account)
    let transactions = [];
    try {
      const Transaction = (await import('../models/Transaction.js')).default;
      const dateFilter = new Date();
      dateFilter.setDate(dateFilter.getDate() - parseInt(timeRange));
      
      transactions = await Transaction.find({
        $or: [
          { fromAccount: req.params.id },
          { toAccount: req.params.id }
        ],
        createdAt: { $gte: dateFilter }
      })
      .populate('fromAccount', 'name accountNumber')
      .populate('toAccount', 'name accountNumber')
      .populate('card', 'cardNumber')
      .sort({ createdAt: -1 })
      .limit(50); // Limit untuk performance
    } catch (transactionError) {
      console.log('Transaction data unavailable:', transactionError.message);
    }

    // Calculate analytics
    const analytics = {
      totalCards: cards.length,
      activeCards: cards.filter(card => card.status === 'active').length,
      totalTransactions: transactions.length,
      totalVolume: {
        incoming: 0,
        outgoing: 0,
        net: 0
      },
      transactionsByStatus: {
        completed: 0,
        pending: 0,
        failed: 0
      },
      transactionsByCurrency: {},
      recentActivity: [],
      balanceHistory: [], // Ini bisa dikembangkan lebih lanjut
      cardUsage: {},
      riskMetrics: {
        highRiskCards: cards.filter(card => card.fraudFlags?.isHighRisk).length,
        averageRiskScore: cards.length > 0 
          ? cards.reduce((sum, card) => sum + (card.fraudFlags?.riskScore || 0), 0) / cards.length 
          : 0
      }
    };

    // Process transactions for analytics
    transactions.forEach(transaction => {
      // Volume calculations
      if (transaction.toAccount._id.toString() === req.params.id) {
        analytics.totalVolume.incoming += transaction.convertedAmount;
      } else {
        analytics.totalVolume.outgoing += transaction.totalAmount;
      }

      // Status breakdown
      analytics.transactionsByStatus[transaction.status] = 
        (analytics.transactionsByStatus[transaction.status] || 0) + 1;

      // Currency breakdown
      const currency = transaction.fromAccount._id.toString() === req.params.id 
        ? transaction.fromCurrency 
        : transaction.toCurrency;
      analytics.transactionsByCurrency[currency] = 
        (analytics.transactionsByCurrency[currency] || 0) + 1;

      // Recent activity (last 10)
      if (analytics.recentActivity.length < 10) {
        analytics.recentActivity.push({
          id: transaction._id,
          type: transaction.toAccount._id.toString() === req.params.id ? 'incoming' : 'outgoing',
          amount: transaction.toAccount._id.toString() === req.params.id 
            ? transaction.convertedAmount 
            : transaction.amount,
          currency: transaction.toAccount._id.toString() === req.params.id 
            ? transaction.toCurrency 
            : transaction.fromCurrency,
          description: transaction.description,
          status: transaction.status,
          createdAt: transaction.createdAt,
          card: transaction.card
        });
      }

      // Card usage analytics
      if (transaction.card) {
        const cardId = transaction.card._id.toString();
        analytics.cardUsage[cardId] = (analytics.cardUsage[cardId] || 0) + 1;
      }
    });

    analytics.totalVolume.net = analytics.totalVolume.incoming - analytics.totalVolume.outgoing;

    // Balance breakdown by currency
    const balanceBreakdown = account.wallets.map(wallet => ({
      currency: wallet.currency,
      balance: wallet.balance,
      isActive: wallet.isActive,
      openedAt: wallet.openedAt,
      percentage: account.wallets.reduce((sum, w) => sum + w.balance, 0) > 0 
        ? (wallet.balance / account.wallets.reduce((sum, w) => sum + w.balance, 0)) * 100 
        : 0
    }));

    // Monthly transaction trends (simplified - bisa dikembangkan)
    const monthlyTrends = {};
    transactions.forEach(transaction => {
      const monthKey = transaction.createdAt.toISOString().substr(0, 7); // YYYY-MM
      if (!monthlyTrends[monthKey]) {
        monthlyTrends[monthKey] = { incoming: 0, outgoing: 0, count: 0 };
      }
      monthlyTrends[monthKey].count++;
      if (transaction.toAccount._id.toString() === req.params.id) {
        monthlyTrends[monthKey].incoming += transaction.convertedAmount;
      } else {
        monthlyTrends[monthKey].outgoing += transaction.totalAmount;
      }
    });

    res.json({
      success: true,
      data: {
        account,
        cards,
        transactions,
        analytics,
        balanceBreakdown,
        monthlyTrends,
        metadata: {
          timeRange: parseInt(timeRange),
          generatedAt: new Date(),
          totalWalletBalance: account.wallets.reduce((sum, w) => sum + w.balance, 0)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error mengambil detail bank account',
      error: error.message
    });
  }
});

// PUT update wallet balance
router.put('/bank-accounts/:id/wallets/:currency/balance', async (req, res) => {
  try {
    const { amount, operation = 'add' } = req.body; // operation: 'add' or 'subtract' or 'set'
    const { currency } = req.params;
    
    if (amount === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Amount is required'
      });
    }
    
    const account = await BankAccount.findById(req.params.id)
      .populate('provider', 'name code');
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Bank account not found'
      });
    }
    
    const wallet = account.wallets.find(w => w.currency === currency.toUpperCase() && w.isActive);
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: `Currency ${currency} tidak ditemukan atau tidak aktif`
      });
    }
    
    let amountToAdd = 0;
    if (operation === 'add') {
      amountToAdd = Number(amount);
    } else if (operation === 'subtract') {
      amountToAdd = -Number(amount);
    } else if (operation === 'set') {
      amountToAdd = Number(amount) - wallet.balance;
    }
    
    await account.updateWalletBalance(currency, amountToAdd);
    
    const updatedAccount = await BankAccount.findById(account._id)
      .populate('provider', 'name code');
    
    res.json({
      success: true,
      message: 'Balance updated successfully',
      data: updatedAccount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating balance',
      error: error.message
    });
  }
});

export default router;
