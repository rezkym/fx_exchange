import { RefreshCw } from 'lucide-react';
import SearchableSelect from './SearchableSelect';

const Controls = ({ 
  currencies, 
  sourceCurrency, 
  targetCurrency, 
  timeRange, 
  onSourceChange, 
  onTargetChange, 
  onTimeRangeChange, 
  onRefresh,
  loading 
}) => {
  const timeRangeOptions = [
    { value: 1, label: '1 Day' },
    { value: 7, label: '7 Days' },
    { value: 14, label: '14 Days' },
    { value: 30, label: '30 Days' }
  ];

  return (
    <div className="bg-white/20 backdrop-blur-xl border border-white/40 rounded-2xl shadow-xl p-6 ring-1 ring-white/10 h-fit">
      <h3 className="text-lg font-semibold text-gray-800 mb-6">Currency Settings</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Source Currency */}
        <SearchableSelect
          label="Source Currency"
          value={sourceCurrency}
          onChange={onSourceChange}
          options={currencies}
          disabled={loading}
          placeholder="Type to search..."
        />

        {/* Target Currency */}
        <SearchableSelect
          label="Target Currency"
          value={targetCurrency}
          onChange={onTargetChange}
          options={currencies}
          disabled={loading}
          placeholder="Type to search..."
        />

        {/* Time Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Time Range
          </label>
          <select
            value={timeRange}
            onChange={(e) => onTimeRangeChange(Number(e.target.value))}
            className="w-full px-3 py-2 bg-white/40 backdrop-blur-md border border-white/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-300/50 shadow-inner"
            disabled={loading}
          >
            {timeRangeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Refresh Button */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Actions
          </label>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-500/70 backdrop-blur-md hover:bg-blue-600/80 disabled:bg-gray-400/40 text-white rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg border border-blue-400/30"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
};

export default Controls;