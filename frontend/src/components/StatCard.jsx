import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatRate } from '../utils/format';

const StatCard = ({ title, value, change, changeType, loading, icon: Icon, currency, formatType = 'currency' }) => {
  if (loading) {
    return (
      <div className="bg-white/20 backdrop-blur-xl border border-white/40 rounded-2xl shadow-xl p-6 ring-1 ring-white/10">
        <div className="animate-pulse">
          <div className="h-4 bg-white/30 backdrop-blur-sm rounded w-3/4 mb-2"></div>
          <div className="h-8 bg-white/30 backdrop-blur-sm rounded w-1/2 mb-2"></div>
          <div className="h-3 bg-white/30 backdrop-blur-sm rounded w-1/3"></div>
        </div>
      </div>
    );
  }

  const getChangeColor = () => {
    if (changeType === 'positive') return 'text-green-600';
    if (changeType === 'negative') return 'text-red-600';
    return 'text-gray-600';
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
    return formatRate(val, currency || 'IDR');
  };

  const formatChange = (val) => {
    if (typeof val === 'number') {
      const sign = val >= 0 ? '+' : '';
      return `${sign}${val.toFixed(4)}`;
    }
    return val;
  };

  return (
    <div className="bg-white/20 backdrop-blur-xl border border-white/40 rounded-2xl shadow-xl p-6 ring-1 ring-white/10 hover:bg-white/25 transition-all duration-300">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        {Icon && <Icon className="w-5 h-5 text-gray-500" />}
      </div>
      
      <div className="mb-2">
        <p className="text-2xl font-bold text-gray-900">
          {formatValue(value)}
        </p>
      </div>
      
      {change !== undefined && (
        <div className={`flex items-center gap-1 text-sm ${getChangeColor()}`}>
          {getChangeIcon()}
          <span>{formatChange(change)}</span>
        </div>
      )}
    </div>
  );
};

export default StatCard;