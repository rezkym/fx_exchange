import { useState, useEffect } from 'react';

const StatusIndicator = ({ 
  isOnline = true, 
  lastUpdate = null, 
  error = false,
  updateInterval = 60000 // 1 minute in milliseconds
}) => {
  const [timeAgo, setTimeAgo] = useState('');

  // Function to calculate human readable time difference
  const getTimeAgo = (timestamp) => {
    if (!timestamp) return '';
    
    const now = new Date();
    const updateTime = new Date(timestamp);
    const diffMs = now - updateTime;
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMinutes < 1) return 'just now';
    if (diffMinutes === 1) return '1 minute ago';
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  };

  // Update time ago display every minute
  useEffect(() => {
    const updateTimeAgo = () => {
      if (lastUpdate) {
        setTimeAgo(getTimeAgo(lastUpdate));
      }
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [lastUpdate]);

  const getStatus = () => {
    if (error) {
      return {
        color: 'bg-red-500',
        text: `Failed to fetch data${timeAgo ? ` • ${timeAgo}` : ''}`,
        animate: false
      };
    }
    
    if (isOnline) {
      return {
        color: 'bg-green-500',
        text: `Live data from Wise API • Updates every minute${timeAgo ? ` • Last updated ${timeAgo}` : ''}`,
        animate: true
      };
    }
    
    return {
      color: 'bg-yellow-500',
      text: `Connecting to API${timeAgo ? ` • Last update ${timeAgo}` : ''}`,
      animate: true
    };
  };

  const status = getStatus();

  return (
    <div className="inline-flex items-center gap-2 bg-white/20 dark:bg-slate-800/30 backdrop-blur-md border border-white/30 dark:border-slate-600/40 rounded-full px-3 py-1.5 text-xs text-gray-700 dark:text-slate-300 shadow-lg dark:shadow-slate-900/20 w-fit transition-colors duration-300">
      {/* Status LED */}
      <div className="relative">
        <div 
          className={`w-2 h-2 rounded-full ${status.color} ${
            status.animate ? 'animate-pulse' : ''
          }`}
        />
        {status.animate && (
          <div 
            className={`absolute inset-0 w-2 h-2 rounded-full ${status.color} animate-ping opacity-75`}
          />
        )}
      </div>
      
      {/* Status Text */}
      <span className="transition-colors duration-300">
        {status.text}
      </span>
    </div>
  );
};

export default StatusIndicator;
