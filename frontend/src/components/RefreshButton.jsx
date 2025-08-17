import { useState } from 'react';
import { RefreshCw } from 'lucide-react';

const RefreshButton = ({ onRefresh, loading = false }) => {
  const [isSpinning, setIsSpinning] = useState(false);

  const handleRefresh = () => {
    if (loading) return;
    
    setIsSpinning(true);
    onRefresh?.();
    
    // Reset spin animation after 1 second
    setTimeout(() => setIsSpinning(false), 1000);
  };

  return (
    <button
      onClick={handleRefresh}
      disabled={loading}
      className={`
        w-8 h-8 rounded-full 
        bg-white/20 dark:bg-slate-700/30 backdrop-blur-md
        border border-white/40 dark:border-slate-600/40
        hover:bg-white/30 dark:hover:bg-slate-700/40
        transition-all duration-200
        flex items-center justify-center
        ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}
        shadow-lg dark:shadow-slate-900/20
      `}
      title="Refresh data"
    >
      <RefreshCw 
        className={`
          w-4 h-4 text-gray-700 dark:text-slate-300
          transition-transform duration-500
          ${(isSpinning || loading) ? 'animate-spin' : ''}
        `} 
      />
    </button>
  );
};

export default RefreshButton;
