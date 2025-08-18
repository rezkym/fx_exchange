import { useState } from 'react';
import { Calculator, ArrowRightLeft, Zap, RefreshCw } from 'lucide-react';
import { convert } from '../services/api';
import { formatRate } from '../utils/format';

const QuickTools = ({ currencies, onRefresh, loading }) => {
  const [amount, setAmount] = useState('100');
  const [fromCurrency, setFromCurrency] = useState('EUR');
  const [toCurrency, setToCurrency] = useState('IDR');
  const [result, setResult] = useState(null);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState('');
  const [isSwapping, setIsSwapping] = useState(false);

  const handleConvert = async () => {
    if (!amount || !fromCurrency || !toCurrency) {
      setError('Please fill all fields');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      setError('Please enter a valid amount');
      return;
    }

    setConverting(true);
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
    } catch (err) {
      setError('Conversion failed');
    } finally {
      setConverting(false);
    }
  };

  const handleAmountChange = (e) => {
    const value = e.target.value;
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
    setTimeout(() => setIsSwapping(false), 300);
  };

  return (
    <div className="space-y-4">
      {/* Quick Converter Card */}
      <div className="bg-white/20 dark:bg-slate-800/30 backdrop-blur-xl border border-white/40 dark:border-slate-600/40 rounded-2xl shadow-xl dark:shadow-slate-900/20 p-4 ring-1 ring-white/10 dark:ring-slate-700/20 transition-colors duration-300">
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="w-4 h-4 text-gray-700 dark:text-slate-300" />
          <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-200">Quick Convert</h3>
        </div>

        <div className="space-y-3">
          {/* Amount Input */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={amount}
              onChange={handleAmountChange}
              placeholder="Amount"
              className="w-20 px-3 py-2 bg-white/40 dark:bg-slate-700/40 border border-white/50 dark:border-slate-600/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/60 dark:focus:ring-indigo-400/60 text-sm text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400"
              disabled={converting}
            />
            <select
              value={fromCurrency}
              onChange={(e) => setFromCurrency(e.target.value)}
              className="w-16 px-2 py-2 bg-white/40 dark:bg-slate-700/40 border border-white/50 dark:border-slate-600/50 rounded-xl focus:outline-none text-sm text-gray-900 dark:text-slate-100"
              disabled={converting}
            >
              {currencies.map(currency => (
                <option key={currency} value={currency} className="bg-white dark:bg-slate-800">
                  {currency}
                </option>
              ))}
            </select>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center">
            <button
              onClick={swapCurrencies}
              disabled={converting}
              className="bg-gradient-to-r from-indigo-400 to-purple-500 dark:from-indigo-500 dark:to-purple-600 hover:from-indigo-500 hover:to-purple-600 dark:hover:from-indigo-400 dark:hover:to-purple-500 disabled:bg-gray-300/40 dark:disabled:bg-slate-600/40 p-2 rounded-full transition-all duration-200 shadow-lg border border-indigo-300/40 dark:border-indigo-400/40 hover:scale-110 disabled:opacity-50"
              title="Swap currencies"
            >
              <ArrowRightLeft 
                className={`w-3 h-3 text-white transition-transform duration-300 ${
                  isSwapping ? 'rotate-180' : ''
                }`} 
              />
            </button>
          </div>

          {/* To Currency */}
          <div className="flex items-center gap-2">
            <div className="w-20 px-3 py-2 bg-white/40 dark:bg-slate-700/40 border border-white/50 dark:border-slate-600/50 rounded-xl text-sm text-gray-900 dark:text-slate-100 text-center">
              {result ? formatRate(result.convertedAmount, result.to) : '0'}
            </div>
            <select
              value={toCurrency}
              onChange={(e) => setToCurrency(e.target.value)}
              className="w-16 px-2 py-2 bg-white/40 dark:bg-slate-700/40 border border-white/50 dark:border-slate-600/50 rounded-xl focus:outline-none text-sm text-gray-900 dark:text-slate-100"
              disabled={converting}
            >
              {currencies.map(currency => (
                <option key={currency} value={currency} className="bg-white dark:bg-slate-800">
                  {currency}
                </option>
              ))}
            </select>
          </div>

          {/* Convert Button */}
          <button
            onClick={handleConvert}
            disabled={converting || !amount || !fromCurrency || !toCurrency}
            className="w-full px-3 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 dark:from-emerald-600 dark:to-teal-700 hover:from-emerald-600 hover:to-teal-700 dark:hover:from-emerald-500 dark:hover:to-teal-600 disabled:bg-gray-400/40 dark:disabled:bg-slate-600/40 text-white rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg border border-emerald-400/30 dark:border-emerald-500/30 font-medium disabled:opacity-50 text-sm"
          >
            {converting ? (
              <>
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Converting...
              </>
            ) : (
              <>
                <Zap className="w-3 h-3" />
                Convert
              </>
            )}
          </button>

          {/* Error */}
          {error && (
            <div className="bg-red-500/20 dark:bg-red-500/30 border border-red-400/40 dark:border-red-400/50 rounded-xl p-2 text-red-700 dark:text-red-300 text-xs">
              {error}
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="bg-green-500/10 dark:bg-green-500/20 border border-green-400/30 dark:border-green-400/40 rounded-xl p-3 text-xs">
              <div className="text-center font-medium text-gray-800 dark:text-slate-200">
                {formatRate(result.amount, result.from)} {result.from} = {formatRate(result.convertedAmount, result.to)} {result.to}
              </div>
              {result.rate && (
                <div className="text-center text-gray-600 dark:text-slate-400 mt-1">
                  Rate: 1 {result.from} = {formatRate(result.rate, result.to)} {result.to}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white/20 dark:bg-slate-800/30 backdrop-blur-xl border border-white/40 dark:border-slate-600/40 rounded-2xl shadow-xl dark:shadow-slate-900/20 p-4 ring-1 ring-white/10 dark:ring-slate-700/20 transition-colors duration-300">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-200 mb-3">Quick Actions</h3>
        
        <div className="space-y-2">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="w-full px-3 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 hover:from-blue-600 hover:to-indigo-700 dark:hover:from-blue-500 dark:hover:to-indigo-600 disabled:bg-gray-400/40 dark:disabled:bg-slate-600/40 text-white rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg border border-blue-400/30 dark:border-blue-500/30 font-medium disabled:opacity-50 text-sm"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
        </div>

        <div className="mt-3 text-xs text-gray-500 dark:text-slate-400 text-center">
          Last refresh: {new Date().toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
      </div>
    </div>
  );
};

export default QuickTools;

