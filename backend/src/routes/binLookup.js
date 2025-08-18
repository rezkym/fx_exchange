import express from 'express';
import BinLookup from '../models/BinLookup.js';
import binLookupService from '../services/binLookupService.js';

const router = express.Router();

// GET /api/bin-lookup/lookup/:cardNumber - Lookup BIN for card number
router.get('/bin-lookup/lookup/:cardNumber', async (req, res) => {
  try {
    const { cardNumber } = req.params;
    
    if (!cardNumber) {
      return res.status(400).json({
        success: false,
        message: 'Card number is required'
      });
    }

    const binInfo = await binLookupService.getBinInfo(cardNumber);
    
    res.json({
      success: true,
      data: binInfo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error performing BIN lookup',
      error: error.message
    });
  }
});

// POST /api/bin-lookup/batch - Batch lookup multiple card numbers
router.post('/bin-lookup/batch', async (req, res) => {
  try {
    const { cardNumbers } = req.body;
    
    if (!cardNumbers || !Array.isArray(cardNumbers)) {
      return res.status(400).json({
        success: false,
        message: 'cardNumbers array is required'
      });
    }

    if (cardNumbers.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 50 card numbers allowed per batch'
      });
    }

    const results = await binLookupService.batchLookup(cardNumbers);
    
    res.json({
      success: true,
      data: results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error performing batch BIN lookup',
      error: error.message
    });
  }
});

// GET /api/bin-lookup/statistics - Get BIN lookup statistics
router.get('/bin-lookup/statistics', async (req, res) => {
  try {
    const statistics = await binLookupService.getBinStatistics();
    
    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching BIN statistics',
      error: error.message
    });
  }
});

// GET /api/bin-lookup/search - Search BINs with filters
router.get('/bin-lookup/search', async (req, res) => {
  try {
    const {
      scheme,
      type,
      country,
      bankName,
      prepaid,
      riskLevel,
      page = 1,
      limit = 20
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const criteria = {
      scheme,
      type,
      country,
      bankName,
      prepaid: prepaid !== undefined ? prepaid === 'true' : undefined,
      riskLevel,
      limit: parseInt(limit),
      offset
    };

    const bins = await binLookupService.searchBins(criteria);
    
    // Get total count for pagination
    let countFilter = { isActive: true };
    if (scheme) countFilter.scheme = new RegExp(scheme, 'i');
    if (type) countFilter.type = new RegExp(type, 'i');
    if (country) countFilter['country.name'] = new RegExp(country, 'i');
    if (bankName) countFilter['bank.name'] = new RegExp(bankName, 'i');
    if (prepaid !== undefined) countFilter.prepaid = prepaid === 'true';

    const total = await BinLookup.countDocuments(countFilter);
    const totalPages = Math.ceil(total / parseInt(limit));
    
    res.json({
      success: true,
      data: bins,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        itemsPerPage: parseInt(limit),
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error searching BINs',
      error: error.message
    });
  }
});

// GET /api/bin-lookup/:id - Get specific BIN by ID
router.get('/bin-lookup/:id', async (req, res) => {
  try {
    const binLookup = await BinLookup.findById(req.params.id);
    
    if (!binLookup) {
      return res.status(404).json({
        success: false,
        message: 'BIN lookup not found'
      });
    }
    
    res.json({
      success: true,
      data: binLookup
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching BIN lookup',
      error: error.message
    });
  }
});

// GET /api/bin-lookup - Get all BINs with pagination
router.get('/bin-lookup', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sortBy = 'lastLookupAt',
      sortOrder = 'desc'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const bins = await BinLookup.find({ isActive: true })
      .sort(sort)
      .skip(offset)
      .limit(parseInt(limit));

    const total = await BinLookup.countDocuments({ isActive: true });
    const totalPages = Math.ceil(total / parseInt(limit));
    
    res.json({
      success: true,
      data: bins,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        itemsPerPage: parseInt(limit),
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching BIN lookups',
      error: error.message
    });
  }
});

// DELETE /api/bin-lookup/:id - Delete BIN lookup (soft delete)
router.delete('/bin-lookup/:id', async (req, res) => {
  try {
    const binLookup = await BinLookup.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    
    if (!binLookup) {
      return res.status(404).json({
        success: false,
        message: 'BIN lookup not found'
      });
    }
    
    res.json({
      success: true,
      message: 'BIN lookup deleted successfully',
      data: binLookup
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting BIN lookup',
      error: error.message
    });
  }
});

// PUT /api/bin-lookup/:id/refresh - Refresh BIN data from API
router.put('/bin-lookup/:id/refresh', async (req, res) => {
  try {
    const binLookup = await BinLookup.findById(req.params.id);
    
    if (!binLookup) {
      return res.status(404).json({
        success: false,
        message: 'BIN lookup not found'
      });
    }

    // Force refresh from API
    const updatedData = await binLookupService.lookupBinFromAPI(binLookup.bin);
    
    // Update the existing record
    Object.assign(binLookup, updatedData);
    binLookup.lastLookupAt = new Date();
    
    const savedBinLookup = await binLookup.save();
    
    res.json({
      success: true,
      message: 'BIN data refreshed successfully',
      data: savedBinLookup
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error refreshing BIN data',
      error: error.message
    });
  }
});

export default router;
