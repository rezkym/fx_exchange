import { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle = () => {
  const { isDark, toggleTheme } = useTheme();
  const [isAnimating, setIsAnimating] = useState(false);

  const handleToggle = () => {
    setIsAnimating(true);
    toggleTheme();
    
    // Reset animation after it completes
    setTimeout(() => setIsAnimating(false), 600);
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      <button
        onClick={handleToggle}
        className={`
          relative overflow-hidden
          w-16 h-8 rounded-full 
          transition-all duration-300 ease-in-out
          ${isDark 
            ? 'bg-gradient-to-r from-indigo-900 to-purple-900 shadow-lg shadow-purple-500/25' 
            : 'bg-gradient-to-r from-yellow-400 to-orange-400 shadow-lg shadow-yellow-500/25'
          }
          hover:scale-105 active:scale-95
          border-2 ${isDark ? 'border-purple-400/30' : 'border-yellow-300/50'}
        `}
        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        {/* Toggle slider */}
        <div
          className={`
            absolute top-0.5 w-7 h-7 rounded-full
            transition-all duration-500 ease-in-out
            ${isDark 
              ? 'left-8 bg-gradient-to-br from-slate-200 to-slate-300' 
              : 'left-0.5 bg-gradient-to-br from-white to-yellow-100'
            }
            shadow-md flex items-center justify-center
            ${isAnimating ? 'animate-pulse scale-110' : ''}
          `}
        >
          {/* Emoji with rotation animation */}
          <span 
            className={`
              text-sm transition-all duration-500 ease-in-out
              ${isAnimating ? 'rotate-180 scale-125' : ''}
            `}
          >
            {isDark ? '🌙' : '☀️'}
          </span>
        </div>
        
        {/* Background stars for dark mode */}
        {isDark && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="absolute left-2 top-1">
              <span className={`text-xs text-yellow-300 ${isAnimating ? 'animate-ping' : ''}`}>
                ✨
              </span>
            </div>
            <div className="absolute right-2 bottom-1">
              <span className={`text-xs text-blue-300 ${isAnimating ? 'animate-ping' : ''}`}>
                ⭐
              </span>
            </div>
          </div>
        )}
        
        {/* Background clouds for light mode */}
        {!isDark && (
          <div className="absolute inset-0 flex items-center justify-center opacity-30">
            <div className="absolute right-1 top-0.5">
              <span className={`text-xs text-white ${isAnimating ? 'animate-bounce' : ''}`}>
                ☁️
              </span>
            </div>
          </div>
        )}
      </button>
    </div>
  );
};

export default ThemeToggle;
