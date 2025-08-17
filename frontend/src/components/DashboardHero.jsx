import { useState } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Minus, Clock, ArrowRightLeft } from 'lucide-react';
import { formatRate } from '../utils/format';

const DashboardHero = ({ 
  liveData, 
  loading, 
  currencies,
  sourceCurrency, 
  targetCurrency, 
  timeRange,
  change, 
  changeType,
  change24h,
  changeType24h,
  onSourceChange, 
  onTargetChange,
  onTimeRangeChange,
  onRefresh 
}) => {
  const [isSwapping, setIsSwapping] = useState(false);

  const timeRangeOptions = [
    { value: 1, label: '24h' },
    { value: 2, label: '48h' },
    { value: 7, label: '7W' },
    { value: 14, label: '14W' },
    { value: 30, label: '30D' }
  ];

  const getChangeColor = (type) => {
    if (type === 'positive') return 'text-green-600 dark:text-green-400';
    if (type === 'negative') return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-slate-400';
  };

  const getChangeIcon = (type) => {
    if (type === 'positive') return <TrendingUp className="w-3 h-3" />;
    if (type === 'negative') return <TrendingDown className="w-3 h-3" />;
    return <Minus className="w-3 h-3" />;
  };

  const formatChange = (val) => {
    if (typeof val === 'number') {
      const sign = val >= 0 ? '+' : '';
      return `${sign}${val.toFixed(4)}`;
    }
    return val;
  };

  const swapCurrencies = () => {
    setIsSwapping(true);
    onSourceChange(targetCurrency);
    onTargetChange(sourceCurrency);
    setTimeout(() => setIsSwapping(false), 300);
  };

  const handleTimeRangeChange = (newTimeRange) => {
    onTimeRangeChange(newTimeRange);
    onRefresh();
  };

  if (loading) {
    return (
      <div className="bg-white/20 dark:bg-slate-800/30 backdrop-blur-xl border border-white/40 dark:border-slate-600/40 rounded-2xl shadow-xl dark:shadow-slate-900/20 p-6 ring-1 ring-white/10 dark:ring-slate-700/20 transition-colors duration-300">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-white/30 dark:bg-slate-600/30 rounded w-3/4"></div>
          <div className="h-12 bg-white/30 dark:bg-slate-600/30 rounded w-1/2"></div>
          <div className="flex gap-2">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-8 w-12 bg-white/30 dark:bg-slate-600/30 rounded-full"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/20 dark:bg-slate-800/30 backdrop-blur-xl border border-white/40 dark:border-slate-600/40 rounded-2xl shadow-xl dark:shadow-slate-900/20 p-6 ring-1 ring-white/10 dark:ring-slate-700/20 transition-colors duration-300 hover:bg-white/25 dark:hover:bg-slate-800/40">
      {/* Header Row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-slate-200">
            <select
              value={sourceCurrency}
              onChange={(e) => onSourceChange(e.target.value)}
              className="bg-transparent border-0 text-lg font-semibold text-gray-800 dark:text-slate-200 focus:outline-none cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
            >
              {currencies.map(currency => (
                <option key={currency} value={currency} className="bg-white dark:bg-slate-800">
                  {currency}
                </option>
              ))}
            </select>
            
            <button
              onClick={swapCurrencies}
              className="bg-gradient-to-r from-indigo-400 to-purple-500 dark:from-indigo-500 dark:to-purple-600 hover:from-indigo-500 hover:to-purple-600 dark:hover:from-indigo-400 dark:hover:to-purple-500 p-1.5 rounded-full transition-all duration-200 shadow-lg border border-indigo-300/40 dark:border-indigo-400/40 hover:scale-110"
              title="Swap currencies"
            >
              <ArrowRightLeft 
                className={`w-3 h-3 text-white transition-transform duration-300 ${
                  isSwapping ? 'rotate-180' : ''
                }`} 
              />
            </button>
            
            <select
              value={targetCurrency}
              onChange={(e) => onTargetChange(e.target.value)}
              className="bg-transparent border-0 text-lg font-semibold text-gray-800 dark:text-slate-200 focus:outline-none cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
            >
              {currencies.map(currency => (
                <option key={currency} value={currency} className="bg-white dark:bg-slate-800">
                  {currency}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <BarChart3 className="w-6 h-6 text-gray-500 dark:text-slate-400" />
      </div>

      {/* Main Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        {/* Current Rate */}
        <div className="md:col-span-2">
          <div className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-1">
            {formatRate(liveData?.value, targetCurrency)} {targetCurrency}
          </div>
          <div className={`flex items-center gap-1 text-sm font-medium ${getChangeColor(changeType)}`}>
            {getChangeIcon(changeType)}
            <span className="bg-white/30 dark:bg-slate-700/40 backdrop-blur-sm px-2 py-0.5 rounded-md">
              {formatChange(change)}
            </span>
            <span className="text-xs text-gray-500 dark:text-slate-400">current</span>
          </div>
        </div>

        {/* 24h Change */}
        <div>
          <div className="text-sm text-gray-600 dark:text-slate-400 mb-1">24h Change</div>
          <div className={`flex items-center gap-1 text-sm font-medium ${getChangeColor(changeType24h)}`}>
            {getChangeIcon(changeType24h)}
            <span className="bg-white/30 dark:bg-slate-700/40 backdrop-blur-sm px-2 py-0.5 rounded-md">
              {formatChange(change24h)}
            </span>
          </div>
        </div>

        {/* Last Update */}
        <div>
          <div className="text-sm text-gray-600 dark:text-slate-400 mb-1">Last Update</div>
          <div className="flex items-center gap-1 text-sm text-gray-700 dark:text-slate-300">
            <Clock className="w-3 h-3" />
            <span>
              {liveData?.time ? new Date(liveData.time).toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
              }) : '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Time Range Pills */}
      <div className="flex flex-wrap gap-2">
        {timeRangeOptions.map(option => (
          <button
            key={option.value}
            onClick={() => handleTimeRangeChange(option.value)}
            disabled={loading}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
              timeRange === option.value
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 dark:from-indigo-500 dark:to-purple-500 text-white shadow-lg border border-blue-400/30 dark:border-indigo-400/30 scale-105'
                : 'bg-white/40 dark:bg-slate-700/40 backdrop-blur-md hover:bg-white/60 dark:hover:bg-slate-700/60 text-gray-700 dark:text-slate-300 border border-white/50 dark:border-slate-600/50 hover:scale-105'
            } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default DashboardHero;

