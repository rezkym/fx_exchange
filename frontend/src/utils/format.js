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


