const zeroDecimalCurrencies = new Set(['IDR', 'JPY', 'KRW', 'VND']);

export function getRateFractionDigits(currency) {
  if (zeroDecimalCurrencies.has(String(currency).toUpperCase())) return 0;
  return 2;
}

export function formatRate(value, currency) {
  if (value == null || Number.isNaN(Number(value))) return '-';
  const fractionDigits = getRateFractionDigits(currency);
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(Number(value));
}

export function formatCurrency(value, currency) {
  if (value == null || Number.isNaN(Number(value))) return '-';
  const fractionDigits = getRateFractionDigits(currency);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(Number(value));
}

export function formatDate(dateString, format = 'full') {
  if (!dateString) return '-';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';
  
  const options = {
    full: {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    },
    short: {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    },
    'month-year': {
      year: 'numeric',
      month: '2-digit'
    },
    time: {
      hour: '2-digit',
      minute: '2-digit'
    }
  };
  
  return new Intl.DateTimeFormat('en-US', options[format] || options.full).format(date);
}


