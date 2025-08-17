import express from 'express';
import BankProvider from '../models/BankProvider.js';

const router = express.Router();

// GET currency limits configuration
router.get('/config/currency-limits', async (req, res) => {
  try {
    const { provider } = req.query;
    
    let filter = { isActive: true };
    if (provider) {
      filter._id = provider;
    }
    
    const providers = await BankProvider.find(filter).select('name code topUpMethods');
    
    const currencyLimits = {};
    
    providers.forEach(prov => {
      if (prov.topUpMethods) {
        prov.topUpMethods.forEach(method => {
          if (method.minimumAmounts) {
            const methodKey = `${prov.code}_${method.method}`;
            currencyLimits[methodKey] = {
              provider: prov.name,
              providerCode: prov.code,
              method: method.method,
              minimumAmounts: Object.fromEntries(method.minimumAmounts),
              isActive: method.isActive
            };
          }
        });
      }
    });
    
    // Default minimums dari requirements
    const defaultLimits = {
      'EUR': 2,
      'AUD': 5,
      'USD': 0,
      'GBP': 0,
      'IDR': 0,
      'SGD': 0
    };
    
    res.json({
      success: true,
      data: {
        currencyLimits,
        defaultLimits,
        globalRules: {
          'EUR': { min: 2, reason: 'European banking regulations' },
          'AUD': { min: 5, reason: 'Australian payment processing limits' },
          'others': { min: 0, reason: 'No specific restrictions' }
        }
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching currency limits',
      error: error.message
    });
  }
});

// PUT update currency limits for provider
router.put('/config/currency-limits/:providerId', async (req, res) => {
  try {
    const { method, minimumAmounts } = req.body;
    
    if (!method || !minimumAmounts) {
      return res.status(400).json({
        success: false,
        message: 'Method and minimum amounts are required'
      });
    }
    
    const provider = await BankProvider.findById(req.params.providerId);
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found'
      });
    }
    
    // Find existing method or create new one
    let methodIndex = provider.topUpMethods.findIndex(m => m.method === method);
    
    if (methodIndex === -1) {
      // Create new method
      provider.topUpMethods.push({
        method,
        isActive: true,
        minimumAmounts: new Map(Object.entries(minimumAmounts)),
        processingTime: 'unknown'
      });
    } else {
      // Update existing method
      provider.topUpMethods[methodIndex].minimumAmounts = new Map(Object.entries(minimumAmounts));
    }
    
    await provider.save();
    
    res.json({
      success: true,
      message: 'Currency limits updated successfully',
      data: {
        provider: provider.name,
        method,
        minimumAmounts
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating currency limits',
      error: error.message
    });
  }
});

// GET provider configuration
router.get('/config/providers', async (req, res) => {
  try {
    const providers = await BankProvider.find({ isActive: true });
    
    const config = providers.map(provider => ({
      id: provider._id,
      name: provider.name,
      code: provider.code,
      supportedCurrencies: provider.supportedCurrencies,
      topUpMethods: provider.topUpMethods?.map(method => ({
        method: method.method,
        isActive: method.isActive,
        minimumAmounts: Object.fromEntries(method.minimumAmounts || new Map()),
        processingTime: method.processingTime
      })) || [],
      cardLimits: provider.cardLimits || {
        maxActiveCards: 3,
        maxReplacementsPerDay: 3,
        maxCreationsPerDay: 3
      },
      transferRoutes: provider.transferRoutes || []
    }));
    
    res.json({
      success: true,
      data: config,
      count: config.length
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching provider configuration',
      error: error.message
    });
  }
});

// PUT update provider card limits
router.put('/config/providers/:providerId/card-limits', async (req, res) => {
  try {
    const { maxActiveCards, maxReplacementsPerDay, maxCreationsPerDay } = req.body;
    
    const updateData = {};
    if (maxActiveCards !== undefined) updateData['cardLimits.maxActiveCards'] = maxActiveCards;
    if (maxReplacementsPerDay !== undefined) updateData['cardLimits.maxReplacementsPerDay'] = maxReplacementsPerDay;
    if (maxCreationsPerDay !== undefined) updateData['cardLimits.maxCreationsPerDay'] = maxCreationsPerDay;
    
    const provider = await BankProvider.findByIdAndUpdate(
      req.params.providerId,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Card limits updated successfully',
      data: {
        provider: provider.name,
        cardLimits: provider.cardLimits
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating card limits',
      error: error.message
    });
  }
});

// POST setup default configurations
router.post('/config/setup-defaults', async (req, res) => {
  try {
    // Setup Wise with default configuration
    const wiseProvider = await BankProvider.findOne({ code: 'WISE' });
    if (wiseProvider) {
      wiseProvider.topUpMethods = [
        {
          method: 'debit_card',
          isActive: true,
          minimumAmounts: new Map([
            ['EUR', 2],
            ['AUD', 5],
            ['USD', 0],
            ['GBP', 0],
            ['IDR', 0],
            ['SGD', 0]
          ]),
          processingTime: 'instant'
        },
        {
          method: 'bank_transfer',
          isActive: true,
          minimumAmounts: new Map([
            ['EUR', 1],
            ['AUD', 1],
            ['USD', 1],
            ['GBP', 1],
            ['IDR', 10000],
            ['SGD', 1]
          ]),
          processingTime: '1-3 hours'
        }
      ];
      
      wiseProvider.cardLimits = {
        maxActiveCards: 3,
        maxReplacementsPerDay: 3,
        maxCreationsPerDay: 3
      };
      
      await wiseProvider.save();
    }
    
    // Setup Revolut/Aspire-like provider
    const aspireProvider = await BankProvider.findOne({ code: 'REV' });
    if (aspireProvider) {
      aspireProvider.topUpMethods = [
        {
          method: 'debit_card',
          isActive: true,
          minimumAmounts: new Map([
            ['EUR', 2],
            ['USD', 1],
            ['GBP', 1]
          ]),
          processingTime: 'instant'
        }
      ];
      
      aspireProvider.cardLimits = {
        maxActiveCards: 50,
        maxReplacementsPerDay: 999, // No limit for Aspire
        maxCreationsPerDay: 10
      };
      
      await aspireProvider.save();
    }
    
    res.json({
      success: true,
      message: 'Default configurations applied successfully',
      data: {
        wise: wiseProvider ? 'Updated' : 'Not found',
        aspire: aspireProvider ? 'Updated' : 'Not found'
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error setting up default configurations',
      error: error.message
    });
  }
});

export default router;

