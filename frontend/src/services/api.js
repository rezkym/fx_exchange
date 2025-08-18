const BASE_URL = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

// Helper function untuk fetch dengan error handling
const fetchWithErrorHandling = async (url, options = {}) => {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      // Throw error dengan data untuk handling di frontend
      const error = new Error(data.message || `HTTP error! status: ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Mendapatkan daftar currencies
export const getCurrencies = async () => {
  return fetchWithErrorHandling(`${BASE_URL}/currencies`);
};

// Mendapatkan nilai live rate
export const getLive = async ({ source, target }) => {
  const params = new URLSearchParams({ source, target });
  return fetchWithErrorHandling(`${BASE_URL}/rates/live?${params}`);
};

// Mendapatkan data history
export const getHistory = async ({ source, target, length, unit = 'day', resolution = 'hourly' }) => {
  const params = new URLSearchParams({ 
    source, 
    target, 
    length: length.toString(), 
    unit, 
    resolution 
  });
  return fetchWithErrorHandling(`${BASE_URL}/rates/history?${params}`);
};

// Konversi mata uang
export const convert = async ({ source, target, amount }) => {
  const params = new URLSearchParams({ source, target, amount: amount.toString() });
  return fetchWithErrorHandling(`${BASE_URL}/convert?${params}`);
};

// ============================================
// BANK PROVIDERS API
// ============================================

export const getBankProviders = async () => {
  return fetchWithErrorHandling(`${BASE_URL}/bank-providers?isActive=true`);
};

export const createBankProvider = async (providerData) => {
  return fetchWithErrorHandling(`${BASE_URL}/bank-providers`, {
    method: 'POST',
    body: JSON.stringify(providerData)
  });
};

export const getBankProvider = async (providerId) => {
  return fetchWithErrorHandling(`${BASE_URL}/bank-providers/${providerId}`);
};

export const updateBankProvider = async (providerId, providerData) => {
  return fetchWithErrorHandling(`${BASE_URL}/bank-providers/${providerId}`, {
    method: 'PUT',
    body: JSON.stringify(providerData)
  });
};

export const deleteBankProvider = async (providerId) => {
  return fetchWithErrorHandling(`${BASE_URL}/bank-providers/${providerId}`, {
    method: 'DELETE'
  });
};

// ============================================
// BANK ACCOUNTS API
// ============================================

export const getBankAccounts = async () => {
  return fetchWithErrorHandling(`${BASE_URL}/bank-accounts`);
};

export const createBankAccount = async (accountData) => {
  return fetchWithErrorHandling(`${BASE_URL}/bank-accounts`, {
    method: 'POST',
    body: JSON.stringify(accountData)
  });
};

export const getBankAccountBalance = async (accountId) => {
  return fetchWithErrorHandling(`${BASE_URL}/bank-accounts/${accountId}/balance`);
};

export const addCurrencyToAccount = async (accountId, currency) => {
  return fetchWithErrorHandling(`${BASE_URL}/bank-accounts/${accountId}/currencies`, {
    method: 'POST',
    body: JSON.stringify({ currency })
  });
};

export const updateWalletBalance = async (accountId, currency, amount, operation = 'add') => {
  return fetchWithErrorHandling(`${BASE_URL}/bank-accounts/${accountId}/wallets/${currency}/balance`, {
    method: 'PUT',
    body: JSON.stringify({ amount, operation })
  });
};

export const updateBankAccount = async (accountId, accountData) => {
  return fetchWithErrorHandling(`${BASE_URL}/bank-accounts/${accountId}`, {
    method: 'PUT',
    body: JSON.stringify(accountData)
  });
};

export const deleteBankAccount = async (accountId, options = {}) => {
  return fetchWithErrorHandling(`${BASE_URL}/bank-accounts/${accountId}`, {
    method: 'DELETE',
    body: JSON.stringify(options)
  });
};

export const getBankAccountDetails = async (accountId, timeRange = 30) => {
  return fetchWithErrorHandling(`${BASE_URL}/bank-accounts/${accountId}/details?timeRange=${timeRange}`);
};

// ============================================
// VIRTUAL CARDS API
// ============================================

export const getCards = async (params = {}) => {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      queryParams.append(key, value);
    }
  });
  const queryString = queryParams.toString();
  return fetchWithErrorHandling(`${BASE_URL}/cards${queryString ? `?${queryString}` : ''}`);
};

export const getCard = async (cardId) => {
  return fetchWithErrorHandling(`${BASE_URL}/cards/${cardId}`);
};

export const createCard = async (cardData) => {
  return fetchWithErrorHandling(`${BASE_URL}/cards`, {
    method: 'POST',
    body: JSON.stringify(cardData)
  });
};

export const updateCard = async (cardId, updateData) => {
  return fetchWithErrorHandling(`${BASE_URL}/cards/${cardId}`, {
    method: 'PUT',
    body: JSON.stringify(updateData)
  });
};

export const deleteCard = async (cardId) => {
  return fetchWithErrorHandling(`${BASE_URL}/cards/${cardId}`, {
    method: 'DELETE'
  });
};

export const replaceCard = async (cardId, replaceData) => {
  return fetchWithErrorHandling(`${BASE_URL}/cards/${cardId}/replace`, {
    method: 'POST',
    body: JSON.stringify(replaceData)
  });
};

export const markCardAsUsed = async (cardId) => {
  return fetchWithErrorHandling(`${BASE_URL}/cards/${cardId}/mark-used`, {
    method: 'POST'
  });
};

export const getAvailableCards = async (bankAccountId) => {
  return fetchWithErrorHandling(`${BASE_URL}/cards/available/${bankAccountId}`);
};

// Cards Analytics API
export const getCardsAnalyticsSummary = async (params = {}) => {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      queryParams.append(key, value);
    }
  });
  const queryString = queryParams.toString();
  return fetchWithErrorHandling(`${BASE_URL}/cards/analytics/summary${queryString ? `?${queryString}` : ''}`);
};

export const getCardsAnalyticsByProvider = async () => {
  return fetchWithErrorHandling(`${BASE_URL}/cards/analytics/providers`);
};

export const getCardsUsageAnalytics = async (params = {}) => {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      queryParams.append(key, value);
    }
  });
  const queryString = queryParams.toString();
  return fetchWithErrorHandling(`${BASE_URL}/cards/analytics/usage${queryString ? `?${queryString}` : ''}`);
};

// Fraud Detection API
export const getFraudDetectionStatus = async (params = {}) => {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      queryParams.append(key, value);
    }
  });
  const queryString = queryParams.toString();
  return fetchWithErrorHandling(`${BASE_URL}/cards/fraud-detection/status${queryString ? `?${queryString}` : ''}`);
};

export const getFraudDetectionAlerts = async (params = {}) => {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      queryParams.append(key, value);
    }
  });
  const queryString = queryParams.toString();
  return fetchWithErrorHandling(`${BASE_URL}/cards/fraud-detection/alerts${queryString ? `?${queryString}` : ''}`);
};

// ============================================
// TOPUP SYSTEM API
// ============================================

export const getTopUps = async (params = {}) => {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && value !== 'all') {
      queryParams.append(key, value);
    }
  });
  const query = queryParams.toString();
  return fetchWithErrorHandling(`${BASE_URL}/topups${query ? `?${query}` : ''}`);
};

export const getTopUp = async (topupId) => {
  return fetchWithErrorHandling(`${BASE_URL}/topups/${topupId}`);
};

export const createTopUp = async (topUpData) => {
  return fetchWithErrorHandling(`${BASE_URL}/topups`, {
    method: 'POST',
    body: JSON.stringify(topUpData)
  });
};

export const updateTopUpStatus = async (topUpId, statusData) => {
  return fetchWithErrorHandling(`${BASE_URL}/topups/${topUpId}/status`, {
    method: 'PUT',
    body: JSON.stringify(statusData)
  });
};

export const getTopUpAnalyticsSummary = async () => {
  return fetchWithErrorHandling(`${BASE_URL}/topups/analytics/summary`);
};

export const getTopUpAnalyticsFees = async () => {
  return fetchWithErrorHandling(`${BASE_URL}/topups/analytics/fees`);
};

export const predictTopUpFee = async (params) => {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      queryParams.append(key, value);
    }
  });
  return fetchWithErrorHandling(`${BASE_URL}/topups/analytics/predict-fee?${queryParams}`);
};

export const getTopUpOptimization = async () => {
  return fetchWithErrorHandling(`${BASE_URL}/topups/analytics/optimization`);
};

export const getTopUpTrends = async (params = {}) => {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      queryParams.append(key, value);
    }
  });
  const queryString = queryParams.toString();
  return fetchWithErrorHandling(`${BASE_URL}/topups/analytics/trends${queryString ? `?${queryString}` : ''}`);
};

export const getTopUpMethodsAnalysis = async (params = {}) => {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      queryParams.append(key, value);
    }
  });
  const queryString = queryParams.toString();
  return fetchWithErrorHandling(`${BASE_URL}/topups/analytics/methods${queryString ? `?${queryString}` : ''}`);
};

export const getTopUpHealthMetrics = async (params = {}) => {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      queryParams.append(key, value);
    }
  });
  const queryString = queryParams.toString();
  return fetchWithErrorHandling(`${BASE_URL}/topups/analytics/health${queryString ? `?${queryString}` : ''}`);
};

export const bulkUpdateTopUps = async (topupIds, status, notes) => {
  return fetchWithErrorHandling(`${BASE_URL}/topups/bulk-update`, {
    method: 'POST',
    body: JSON.stringify({ topupIds, status, notes })
  });
};

// ============================================
// TRANSACTIONS API
// ============================================

export const getTransactions = async (params = {}) => {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && value !== 'all') {
      queryParams.append(key, value);
    }
  });
  const queryString = queryParams.toString();
  return fetchWithErrorHandling(`${BASE_URL}/transactions${queryString ? `?${queryString}` : ''}`);
};

export const getTransaction = async (transactionId) => {
  return fetchWithErrorHandling(`${BASE_URL}/transactions/${transactionId}`);
};

export const getTransactionSummary = async (params = {}) => {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      queryParams.append(key, value);
    }
  });
  const queryString = queryParams.toString();
  return fetchWithErrorHandling(`${BASE_URL}/transactions/summary${queryString ? `?${queryString}` : ''}`);
};

export const getTransactionAnalytics = async (params = {}) => {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      queryParams.append(key, value);
    }
  });
  const queryString = queryParams.toString();
  return fetchWithErrorHandling(`${BASE_URL}/transactions/analytics${queryString ? `?${queryString}` : ''}`);
};

export const getTransactionTrends = async (params = {}) => {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      queryParams.append(key, value);
    }
  });
  const queryString = queryParams.toString();
  return fetchWithErrorHandling(`${BASE_URL}/transactions/trends${queryString ? `?${queryString}` : ''}`);
};

export const transferBetweenBanks = async (transferData) => {
  return fetchWithErrorHandling(`${BASE_URL}/transactions/transfer`, {
    method: 'POST',
    body: JSON.stringify(transferData)
  });
};

export const updateTransactionStatus = async (transactionId, statusData) => {
  return fetchWithErrorHandling(`${BASE_URL}/transactions/${transactionId}/status`, {
    method: 'PUT',
    body: JSON.stringify(statusData)
  });
};

// ============================================
// MULTI-STEP TRANSACTIONS API
// ============================================

export const createMultiStepTransaction = async (transactionData) => {
  return fetchWithErrorHandling(`${BASE_URL}/multi-step-transactions`, {
    method: 'POST',
    body: JSON.stringify(transactionData)
  });
};

export const executeMultiStepTransactionStep = async (transactionId, stepData) => {
  return fetchWithErrorHandling(`${BASE_URL}/multi-step-transactions/${transactionId}/execute-step`, {
    method: 'PUT',
    body: JSON.stringify(stepData)
  });
};

export const getMultiStepTransactionStatus = async (transactionId) => {
  return fetchWithErrorHandling(`${BASE_URL}/multi-step-transactions/${transactionId}/status`);
};

// ============================================
// FRAUD DETECTION API
// ============================================



// ============================================
// BIN LOOKUP API
// ============================================

export const lookupBin = async (cardNumber) => {
  return fetchWithErrorHandling(`${BASE_URL}/bin-lookup/lookup/${cardNumber}`);
};

export const batchLookupBins = async (cardNumbers) => {
  return fetchWithErrorHandling(`${BASE_URL}/bin-lookup/batch`, {
    method: 'POST',
    body: JSON.stringify({ cardNumbers })
  });
};

export const getBinStatistics = async () => {
  return fetchWithErrorHandling(`${BASE_URL}/bin-lookup/statistics`);
};

export const searchBins = async (params = {}) => {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      queryParams.append(key, value);
    }
  });
  const queryString = queryParams.toString();
  return fetchWithErrorHandling(`${BASE_URL}/bin-lookup/search${queryString ? `?${queryString}` : ''}`);
};

export const getBinLookups = async (params = {}) => {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      queryParams.append(key, value);
    }
  });
  const queryString = queryParams.toString();
  return fetchWithErrorHandling(`${BASE_URL}/bin-lookup${queryString ? `?${queryString}` : ''}`);
};

export const getBinLookup = async (id) => {
  return fetchWithErrorHandling(`${BASE_URL}/bin-lookup/${id}`);
};

export const deleteBinLookup = async (id) => {
  return fetchWithErrorHandling(`${BASE_URL}/bin-lookup/${id}`, {
    method: 'DELETE'
  });
};

export const refreshBinData = async (id) => {
  return fetchWithErrorHandling(`${BASE_URL}/bin-lookup/${id}/refresh`, {
    method: 'PUT'
  });
};

// ============================================
// CONFIGURATION API
// ============================================

export const getCurrencyLimits = async () => {
  return fetchWithErrorHandling(`${BASE_URL}/config/currency-limits`);
};

export const getProviderConfigs = async () => {
  return fetchWithErrorHandling(`${BASE_URL}/config/providers`);
};