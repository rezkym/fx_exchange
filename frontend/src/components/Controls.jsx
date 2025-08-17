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
    { value: 1, label: '24h', unit: 'day' },
    { value: 2, label: '48h', unit: 'day' },
    { value: 7, label: '7W', unit: 'day' },
    { value: 14, label: '14W', unit: 'day' },
    { value: 30, label: '30D', unit: 'day' }
  ];

  const handleTimeRangeChange = (newTimeRange) => {
    onTimeRangeChange(newTimeRange);
    // Auto-refresh when time range changes
    onRefresh();
  };

  return (
    <div className="bg-white/20 dark:bg-slate-800/30 backdrop-blur-xl border border-white/40 dark:border-slate-600/40 rounded-2xl shadow-xl dark:shadow-slate-900/20 p-6 ring-1 ring-white/10 dark:ring-slate-700/20 h-fit transition-colors duration-300">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-200 mb-6 transition-colors duration-300">Currency Settings</h3>
      
      <div className="space-y-4">
        {/* Currency Selection Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>

        {/* Time Range Pills */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-3 transition-colors duration-300">
            Time Range
          </label>
          <div className="flex flex-wrap gap-2">
            {timeRangeOptions.map(option => (
              <button
                key={option.value}
                onClick={() => handleTimeRangeChange(option.value)}
                disabled={loading}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
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
      </div>
    </div>
  );
};

export default Controls;