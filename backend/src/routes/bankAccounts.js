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
    const { name, provider, accountNumber, currency, address, metadata } = req.body;
    
    // Validation
    if (!name || !provider || !accountNumber || !currency) {
      return res.status(400).json({
        success: false,
        message: 'Name, provider, account number, and currency are required'
      });
    }
    
    // Check if provider exists and supports the currency
    const providerDoc = await BankProvider.findById(provider);
    if (!providerDoc) {
      return res.status(400).json({
        success: false,
        message: 'Bank provider not found'
      });
    }
    
    if (!providerDoc.supportedCurrencies.includes(currency.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: `Currency ${currency} tidak didukung oleh provider ${providerDoc.name}`
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
      currency: currency.toUpperCase(),
      address: address || {},
      metadata: metadata || {}
    });
    
    const savedAccount = await account.save();
    
    const populatedAccount = await BankAccount.findById(savedAccount._id)
      .populate('provider', 'name code');
    
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
    const { name, accountNumber, currency, address, metadata, isActive } = req.body;
    
    const updateData = {};
    if (name) updateData.name = name;
    if (accountNumber) updateData.accountNumber = accountNumber;
    if (currency) updateData.currency = currency.toUpperCase();
    if (address) updateData.address = address;
    if (metadata) updateData.metadata = metadata;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    const account = await BankAccount.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('provider', 'name code');
    
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

// DELETE bank account (soft delete)
router.delete('/bank-accounts/:id', async (req, res) => {
  try {
    const account = await BankAccount.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    ).populate('provider', 'name code');
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Bank account not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Bank account deactivated successfully',
      data: account
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deactivating bank account',
      error: error.message
    });
  }
});

// GET account balance
router.get('/bank-accounts/:id/balance', async (req, res) => {
  try {
    const account = await BankAccount.findById(req.params.id)
      .select('name balance currency provider')
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
        balance: account.balance,
        currency: account.currency,
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

export default router;
