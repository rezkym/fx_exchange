import express from 'express';
import BankProvider from '../models/BankProvider.js';

const router = express.Router();

// GET all bank providers
router.get('/bank-providers', async (req, res) => {
  try {
    const { isActive, currency } = req.query;
    let filter = {};
    
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }
    
    if (currency) {
      filter.supportedCurrencies = { $in: [currency.toUpperCase()] };
    }
    
    const providers = await BankProvider.find(filter).sort({ name: 1 });
    res.json({
      success: true,
      data: providers,
      count: providers.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching bank providers',
      error: error.message
    });
  }
});

// GET single bank provider by ID
router.get('/bank-providers/:id', async (req, res) => {
  try {
    const provider = await BankProvider.findById(req.params.id);
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Bank provider not found'
      });
    }
    
    res.json({
      success: true,
      data: provider
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching bank provider',
      error: error.message
    });
  }
});

// POST create new bank provider
router.post('/bank-providers', async (req, res) => {
  try {
    const { name, code, description, supportedCurrencies, apiConfig } = req.body;
    
    // Validation
    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: 'Name and code are required'
      });
    }
    
    // Check if code already exists
    const existingProvider = await BankProvider.findOne({ code: code.toUpperCase() });
    if (existingProvider) {
      return res.status(400).json({
        success: false,
        message: 'Provider code already exists'
      });
    }
    
    const provider = new BankProvider({
      name,
      code: code.toUpperCase(),
      description,
      supportedCurrencies: supportedCurrencies || [],
      apiConfig: apiConfig || {}
    });
    
    const savedProvider = await provider.save();
    
    res.status(201).json({
      success: true,
      message: 'Bank provider created successfully',
      data: savedProvider
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating bank provider',
      error: error.message
    });
  }
});

// PUT update bank provider
router.put('/bank-providers/:id', async (req, res) => {
  try {
    const { name, description, supportedCurrencies, apiConfig, isActive } = req.body;
    
    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (supportedCurrencies) updateData.supportedCurrencies = supportedCurrencies;
    if (apiConfig) updateData.apiConfig = apiConfig;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    const provider = await BankProvider.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Bank provider not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Bank provider updated successfully',
      data: provider
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating bank provider',
      error: error.message
    });
  }
});

// DELETE bank provider (soft delete)
router.delete('/bank-providers/:id', async (req, res) => {
  try {
    const provider = await BankProvider.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Bank provider not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Bank provider deactivated successfully',
      data: provider
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deactivating bank provider',
      error: error.message
    });
  }
});

export default router;
