import BinLookup from '../models/BinLookup.js';

class BinLookupService {
  constructor() {
    this.baseUrl = 'https://lookup.binlist.net';
    this.headers = {
      'Accept-Version': '3',
      'Accept': 'application/json',
      'User-Agent': 'FX-Exchange-System/1.0'
    };
  }

  /**
   * Extract BIN from card number
   * @param {string} cardNumber - Full card number
   * @returns {string} - BIN (first 6-8 digits)
   */
  extractBin(cardNumber) {
    if (!cardNumber) return null;
    
    // Remove spaces and non-numeric characters
    const cleanCardNumber = cardNumber.replace(/\D/g, '');
    
    // Extract first 6-8 digits as BIN
    if (cleanCardNumber.length >= 6) {
      // Try 8 digits first (more specific), fallback to 6
      return cleanCardNumber.length >= 8 ? cleanCardNumber.substring(0, 8) : cleanCardNumber.substring(0, 6);
    }
    
    return null;
  }

  /**
   * Call binlist.net API to lookup BIN information
   * @param {string} bin - BIN to lookup
   * @returns {Promise<Object>} - BIN information
   */
  async lookupBinFromAPI(bin) {
    try {
      console.log(`🔍 Looking up BIN: ${bin} from binlist.net`);
      
      const response = await fetch(`${this.baseUrl}/${bin}`, {
        method: 'GET',
        headers: this.headers
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`BIN ${bin} not found in binlist.net`);
        }
        if (response.status === 429) {
          throw new Error('Rate limit exceeded for binlist.net API');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Transform API response to our schema format
      const transformedData = {
        bin,
        number: data.number || { length: 16, luhn: true },
        scheme: data.scheme || null,
        type: data.type || null,
        brand: data.brand || null,
        prepaid: data.prepaid || false,
        country: data.country ? {
          numeric: data.country.numeric || null,
          alpha2: data.country.alpha2 || null,
          name: data.country.name || null,
          emoji: data.country.emoji || null,
          currency: data.country.currency || null,
          latitude: data.country.latitude || null,
          longitude: data.country.longitude || null
        } : {},
        bank: data.bank ? {
          name: data.bank.name || null,
          url: data.bank.url || null,
          phone: data.bank.phone || null,
          city: data.bank.city || null
        } : {}
      };

      console.log(`✅ BIN lookup successful for ${bin}:`, transformedData.scheme, transformedData.country?.name);
      return transformedData;
      
    } catch (error) {
      console.error(`❌ BIN lookup failed for ${bin}:`, error.message);
      throw error;
    }
  }

  /**
   * Get BIN information from database or API
   * @param {string} cardNumber - Card number to lookup
   * @returns {Promise<Object>} - BIN information
   */
  async getBinInfo(cardNumber) {
    try {
      const bin = this.extractBin(cardNumber);
      if (!bin) {
        throw new Error('Invalid card number format');
      }

      // Check if BIN exists in database
      let binLookup = await BinLookup.findOne({ bin });
      
      if (binLookup) {
        // Update lookup count and return existing data
        await binLookup.incrementLookup();
        console.log(`📋 BIN ${bin} found in database (lookup count: ${binLookup.lookupCount})`);
        return binLookup;
      }

      // BIN not in database, fetch from API
      const binData = await this.lookupBinFromAPI(bin);
      
      // Save to database
      binLookup = await BinLookup.findOrCreate(binData);
      console.log(`💾 BIN ${bin} saved to database`);
      
      return binLookup;
      
    } catch (error) {
      console.error('BIN lookup service error:', error.message);
      
      // Return minimal data if lookup fails
      const bin = this.extractBin(cardNumber);
      return {
        bin,
        error: error.message,
        scheme: 'unknown',
        type: 'unknown',
        country: { name: 'Unknown' },
        bank: { name: 'Unknown' },
        lookupCount: 0,
        isActive: false
      };
    }
  }

  /**
   * Batch lookup multiple BINs
   * @param {Array<string>} cardNumbers - Array of card numbers
   * @returns {Promise<Array>} - Array of BIN information
   */
  async batchLookup(cardNumbers) {
    const results = [];
    
    for (const cardNumber of cardNumbers) {
      try {
        const binInfo = await this.getBinInfo(cardNumber);
        results.push({
          cardNumber,
          success: true,
          data: binInfo
        });
        
        // Add delay to respect API rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        results.push({
          cardNumber,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }

  /**
   * Get BIN statistics from database
   * @returns {Promise<Object>} - BIN statistics
   */
  async getBinStatistics() {
    try {
      const totalBins = await BinLookup.countDocuments({ isActive: true });
      const totalLookups = await BinLookup.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: null, total: { $sum: '$lookupCount' } } }
      ]);

      // Group by scheme
      const byScheme = await BinLookup.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$scheme', count: { $sum: 1 }, lookups: { $sum: '$lookupCount' } } },
        { $sort: { count: -1 } }
      ]);

      // Group by country
      const byCountry = await BinLookup.aggregate([
        { $match: { isActive: true, 'country.name': { $exists: true, $ne: null } } },
        { $group: { _id: '$country.name', count: { $sum: 1 }, lookups: { $sum: '$lookupCount' } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);

      // Group by type
      const byType = await BinLookup.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$type', count: { $sum: 1 }, lookups: { $sum: '$lookupCount' } } },
        { $sort: { count: -1 } }
      ]);

      // Most popular BINs
      const popularBins = await BinLookup.find({ isActive: true })
        .sort({ lookupCount: -1 })
        .limit(10)
        .select('bin scheme type country.name bank.name lookupCount');

      // Recent lookups
      const recentLookups = await BinLookup.find({ isActive: true })
        .sort({ lastLookupAt: -1 })
        .limit(10)
        .select('bin scheme type country.name bank.name lastLookupAt lookupCount');

      return {
        summary: {
          totalBins,
          totalLookups: totalLookups[0]?.total || 0,
          averageLookupsPerBin: totalBins > 0 ? (totalLookups[0]?.total || 0) / totalBins : 0
        },
        byScheme: byScheme.map(item => ({
          scheme: item._id || 'unknown',
          count: item.count,
          lookups: item.lookups
        })),
        byCountry: byCountry.map(item => ({
          country: item._id,
          count: item.count,
          lookups: item.lookups
        })),
        byType: byType.map(item => ({
          type: item._id || 'unknown',
          count: item.count,
          lookups: item.lookups
        })),
        popularBins,
        recentLookups
      };
      
    } catch (error) {
      console.error('Error getting BIN statistics:', error);
      throw error;
    }
  }

  /**
   * Search BINs by criteria
   * @param {Object} criteria - Search criteria
   * @returns {Promise<Array>} - Array of matching BINs
   */
  async searchBins(criteria = {}) {
    const {
      scheme,
      type,
      country,
      bankName,
      prepaid,
      riskLevel,
      limit = 20,
      offset = 0
    } = criteria;

    let filter = { isActive: true };

    if (scheme) filter.scheme = new RegExp(scheme, 'i');
    if (type) filter.type = new RegExp(type, 'i');
    if (country) filter['country.name'] = new RegExp(country, 'i');
    if (bankName) filter['bank.name'] = new RegExp(bankName, 'i');
    if (prepaid !== undefined) filter.prepaid = prepaid;

    const bins = await BinLookup.find(filter)
      .sort({ lookupCount: -1, lastLookupAt: -1 })
      .skip(offset)
      .limit(limit);

    // Filter by risk level if specified (virtual field)
    if (riskLevel) {
      return bins.filter(bin => bin.riskLevel === riskLevel);
    }

    return bins;
  }
}

export default new BinLookupService();
