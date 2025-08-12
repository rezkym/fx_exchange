import { useState } from 'react';
import { ArrowRightLeft, Calculator } from 'lucide-react';
import SearchableSelect from './SearchableSelect';
import { convert } from '../services/api';
import { formatRate } from '../utils/format';

const Converter = ({ currencies }) => {
  const [amount, setAmount] = useState('');
  const [fromCurrency, setFromCurrency] = useState('');
  const [toCurrency, setToCurrency] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastConversion, setLastConversion] = useState(null);

  const handleConvert = async () => {
    // Validasi input
    if (!amount || !fromCurrency || !toCurrency) {
      setError('Please fill all fields');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      setError('Please enter a valid amount (≥ 0)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await convert({
        source: fromCurrency,
        target: toCurrency,
        amount: numAmount
      });

      setResult({
        amount: numAmount,
        from: fromCurrency,
        to: toCurrency,
        convertedAmount: response.converted,
        rate: response.rate
      });
      setLastConversion(new Date());
    } catch (err) {
      setError('Conversion failed. Please try again.');
      console.error('Conversion error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAmountChange = (e) => {
    const value = e.target.value;
    // Allow only numbers and decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
      setError('');
    }
  };

  const swapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
    setError('');
  };

  return (
    <div className="bg-white/20 backdrop-blur-xl border border-white/40 rounded-2xl shadow-xl p-6 ring-1 ring-white/10 h-fit">
      <div className="flex items-center gap-2 mb-6">
        <Calculator className="w-5 h-5 text-gray-700" />
        <h3 className="text-lg font-semibold text-gray-800">Currency Converter</h3>
      </div>

      <div className="space-y-5">
        {/* Amount Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount
          </label>
          <input
            type="text"
            value={amount}
            onChange={handleAmountChange}
            placeholder="Enter amount"
            className="w-full px-3 py-2 bg-white/40 backdrop-blur-md border border-white/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-300/50 shadow-inner"
            disabled={loading}
          />
        </div>

        {/* Currency Selection */}
        <div className="space-y-4">
          <SearchableSelect
            label="From"
            value={fromCurrency}
            onChange={setFromCurrency}
            options={currencies}
            disabled={loading}
            placeholder="Select currency"
          />
          
          {/* Swap Button */}
          <div className="flex justify-center">
            <button
              onClick={swapCurrencies}
              disabled={loading || !fromCurrency || !toCurrency}
              className="bg-white/60 backdrop-blur-md hover:bg-white/80 disabled:bg-gray-300/40 p-2 rounded-full transition-all duration-200 shadow-lg border border-white/40"
              title="Swap currencies"
            >
              <ArrowRightLeft className="w-4 h-4 text-gray-600" />
            </button>
          </div>
          
          <SearchableSelect
            label="To"
            value={toCurrency}
            onChange={setToCurrency}
            options={currencies}
            disabled={loading}
            placeholder="Select currency"
          />
        </div>

        {/* Convert Button */}
        <button
          onClick={handleConvert}
          disabled={loading || !amount || !fromCurrency || !toCurrency}
          className="w-full px-4 py-3 bg-green-500/70 backdrop-blur-md hover:bg-green-600/80 disabled:bg-gray-400/40 text-white rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg border border-green-400/30 font-medium"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Converting...
            </>
          ) : (
            <>
              <Calculator className="w-4 h-4" />
              Convert
            </>
          )}
        </button>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 backdrop-blur-md border border-red-400/40 rounded-xl p-3 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="bg-green-500/10 backdrop-blur-md border border-green-400/30 rounded-xl p-4 space-y-2">
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-800">
                {formatRate(result.amount, result.from)} {result.from} ≈ {formatRate(result.convertedAmount, result.to)} {result.to}
              </div>
              {result.rate && (
                <div className="text-sm text-gray-600 mt-1">
                  Rate: 1 {result.from} = {formatRate(result.rate, result.to)} {result.to}
                </div>
              )}
            </div>
            {lastConversion && (
              <div className="text-xs text-gray-500 text-center border-t border-green-400/20 pt-2">
                Last conversion: {lastConversion.toLocaleString()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Converter;