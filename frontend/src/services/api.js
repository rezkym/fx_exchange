const BASE_URL = import.meta.env.VITE_API_BASE || '/api';

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
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
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
  return fetchWithErrorHandling(`${BASE_URL}/bank-providers`);
};

export const createBankProvider = async (providerData) => {
  return fetchWithErrorHandling(`${BASE_URL}/bank-providers`, {
    method: 'POST',
    body: JSON.stringify(providerData)
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

// ============================================
// VIRTUAL CARDS API
// ============================================

export const getCards = async () => {
  return fetchWithErrorHandling(`${BASE_URL}/cards`);
};

export const createCard = async (cardData) => {
  return fetchWithErrorHandling(`${BASE_URL}/cards`, {
    method: 'POST',
    body: JSON.stringify(cardData)
  });
};

export const replaceCard = async (cardId, replaceData) => {
  return fetchWithErrorHandling(`${BASE_URL}/cards/${cardId}/replace`, {
    method: 'POST',
    body: JSON.stringify(replaceData)
  });
};

// ============================================
// TOPUP SYSTEM API
// ============================================

export const getTopUps = async (params = {}) => {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      queryParams.append(key, value);
    }
  });
  const query = queryParams.toString();
  return fetchWithErrorHandling(`${BASE_URL}/topups${query ? `?${query}` : ''}`);
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

// ============================================
// TRANSACTIONS API
// ============================================

export const getTransactions = async () => {
  return fetchWithErrorHandling(`${BASE_URL}/transactions`);
};

export const transferBetweenBanks = async (transferData) => {
  return fetchWithErrorHandling(`${BASE_URL}/transactions/transfer`, {
    method: 'POST',
    body: JSON.stringify(transferData)
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

export const getFraudDetectionStatus = async (bankAccountId) => {
  const params = new URLSearchParams({ bankAccount: bankAccountId });
  return fetchWithErrorHandling(`${BASE_URL}/cards/fraud-detection/status?${params}`);
};

export const getFraudDetectionAlerts = async () => {
  return fetchWithErrorHandling(`${BASE_URL}/cards/fraud-detection/alerts`);
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