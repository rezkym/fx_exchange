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
  const [isSwapping, setIsSwapping] = useState(false);

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
    setIsSwapping(true);
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
    setError('');
    
    // Reset animation after it completes
    setTimeout(() => setIsSwapping(false), 300);
  };

  return (
    <div className="bg-white/20 dark:bg-slate-800/30 backdrop-blur-xl border border-white/40 dark:border-slate-600/40 rounded-2xl shadow-xl dark:shadow-slate-900/20 p-6 ring-1 ring-white/10 dark:ring-slate-700/20 h-fit transition-colors duration-300">
      <div className="flex items-center gap-2 mb-6">
        <Calculator className="w-5 h-5 text-gray-700 dark:text-slate-300 transition-colors duration-300" />
        <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-200 transition-colors duration-300">Currency Converter</h3>
      </div>

      <div className="space-y-5">
        {/* Amount Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 transition-colors duration-300">
            Amount
          </label>
          <input
            type="text"
            value={amount}
            onChange={handleAmountChange}
            placeholder="Enter amount"
            className="w-full px-3 py-2 bg-white/40 dark:bg-slate-700/40 backdrop-blur-md border border-white/50 dark:border-slate-600/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/60 dark:focus:ring-indigo-400/60 focus:border-blue-300/50 dark:focus:border-indigo-400/50 shadow-inner text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 transition-colors duration-300"
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
              className="bg-gradient-to-r from-indigo-400 to-purple-500 dark:from-indigo-500 dark:to-purple-600 hover:from-indigo-500 hover:to-purple-600 dark:hover:from-indigo-400 dark:hover:to-purple-500 disabled:bg-gray-300/40 dark:disabled:bg-slate-600/40 p-2 rounded-full transition-all duration-200 shadow-lg border border-indigo-300/40 dark:border-indigo-400/40 hover:scale-110 disabled:opacity-50"
              title="Swap currencies"
            >
              <ArrowRightLeft 
                className={`w-4 h-4 text-white transition-transform duration-300 ${
                  isSwapping ? 'rotate-180' : ''
                }`} 
              />
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
          className="w-full px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 dark:from-emerald-600 dark:to-teal-700 hover:from-emerald-600 hover:to-teal-700 dark:hover:from-emerald-500 dark:hover:to-teal-600 disabled:bg-gray-400/40 dark:disabled:bg-slate-600/40 text-white rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg border border-emerald-400/30 dark:border-emerald-500/30 font-medium disabled:opacity-50"
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
          <div className="bg-red-500/20 dark:bg-red-500/30 backdrop-blur-md border border-red-400/40 dark:border-red-400/50 rounded-xl p-3 text-red-700 dark:text-red-300 text-sm transition-colors duration-300">
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="bg-green-500/10 dark:bg-green-500/20 backdrop-blur-md border border-green-400/30 dark:border-green-400/40 rounded-xl p-4 space-y-2 transition-colors duration-300">
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-800 dark:text-slate-200 transition-colors duration-300">
                {formatRate(result.amount, result.from)} {result.from} ≈ {formatRate(result.convertedAmount, result.to)} {result.to}
              </div>
              {result.rate && (
                <div className="text-sm text-gray-600 dark:text-slate-400 mt-1 transition-colors duration-300">
                  Rate: 1 {result.from} = {formatRate(result.rate, result.to)} {result.to}
                </div>
              )}
            </div>
            {lastConversion && (
              <div className="text-xs text-gray-500 dark:text-slate-500 text-center border-t border-green-400/20 dark:border-green-400/30 pt-2 transition-colors duration-300">
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