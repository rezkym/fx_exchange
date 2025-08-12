const BASE_URL = import.meta.env.VITE_API_BASE || '/api';

// Helper function untuk fetch dengan error handling
const fetchWithErrorHandling = async (url) => {
  try {
    const response = await fetch(url);
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