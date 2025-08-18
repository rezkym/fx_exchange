import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatRate } from '../utils/format';

const StatCard = ({ title, value, change, changeType, loading, icon: Icon, currency, formatType = 'currency' }) => {
  if (loading) {
    return (
      <div className="bg-white/20 dark:bg-slate-800/30 backdrop-blur-xl border border-white/40 dark:border-slate-600/40 rounded-2xl shadow-xl dark:shadow-slate-900/20 p-4 ring-1 ring-white/10 dark:ring-slate-700/20 transition-colors duration-300">
        <div className="animate-pulse">
          <div className="h-3 bg-white/30 dark:bg-slate-600/30 backdrop-blur-sm rounded w-3/4 mb-1"></div>
          <div className="h-6 bg-white/30 dark:bg-slate-600/30 backdrop-blur-sm rounded w-1/2 mb-1"></div>
          <div className="h-2 bg-white/30 dark:bg-slate-600/30 backdrop-blur-sm rounded w-1/3"></div>
        </div>
      </div>
    );
  }

  const getChangeColor = () => {
    if (changeType === 'positive') return 'text-green-600 dark:text-green-400';
    if (changeType === 'negative') return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-slate-400';
  };

  const getChangeIcon = () => {
    if (changeType === 'positive') return <TrendingUp className="w-4 h-4" />;
    if (changeType === 'negative') return <TrendingDown className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  const formatValue = (val) => {
    if (formatType === 'datetime') {
      if (!val) return '-';
      const d = new Date(val);
      return isNaN(d.getTime()) ? '-' : d.toLocaleString();
    }
    if (formatType === 'text') {
      return val ?? '-';
    }
    const formattedRate = formatRate(val, currency || 'IDR');
    return `${formattedRate} ${currency || 'IDR'}`;
  };

  const formatChange = (val) => {
    if (typeof val === 'number') {
      const sign = val >= 0 ? '+' : '';
      return `${sign}${val.toFixed(4)}`;
    }
    return val;
  };

  return (
    <div className="bg-white/20 dark:bg-slate-800/30 backdrop-blur-xl border border-white/40 dark:border-slate-600/40 rounded-2xl shadow-xl dark:shadow-slate-900/20 p-4 ring-1 ring-white/10 dark:ring-slate-700/20 hover:bg-white/25 dark:hover:bg-slate-800/40 transition-all duration-300">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-xs font-medium text-gray-600 dark:text-slate-300 transition-colors duration-300">{title}</h3>
        {Icon && <Icon className="w-4 h-4 text-gray-500 dark:text-slate-400 transition-colors duration-300" />}
      </div>
      
      <div className="mb-1">
        <p className="text-xl font-bold text-gray-900 dark:text-slate-100 transition-colors duration-300">
          {formatValue(value)}
        </p>
      </div>
      
      {change !== undefined && (
        <div className={`flex items-center gap-1 text-xs font-medium ${getChangeColor()} transition-colors duration-300`}>
          {getChangeIcon()}
          <span className="bg-white/30 dark:bg-slate-700/40 backdrop-blur-sm px-1.5 py-0.5 rounded-md transition-colors duration-300">
            {formatChange(change)}
          </span>
        </div>
      )}
    </div>
  );
};

export default StatCard;