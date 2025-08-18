import { AlertCircle, X } from 'lucide-react';

const Alert = ({ message, onClose, type = 'error' }) => {
  if (!message) return null;

  const getAlertStyles = () => {
    switch (type) {
      case 'error':
        return 'bg-red-100/60 backdrop-blur-xl border-red-300/60 text-red-900 ring-1 ring-red-200/30';
      case 'warning':
        return 'bg-yellow-100/60 backdrop-blur-xl border-yellow-300/60 text-yellow-900 ring-1 ring-yellow-200/30';
      case 'success':
        return 'bg-green-100/60 backdrop-blur-xl border-green-300/60 text-green-900 ring-1 ring-green-200/30';
      default:
        return 'bg-blue-100/60 backdrop-blur-xl border-blue-300/60 text-blue-900 ring-1 ring-blue-200/30';
    }
  };

  return (
    <div className={`border rounded-2xl shadow-xl p-4 mb-6 ${getAlertStyles()}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{message}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-current hover:opacity-70 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default Alert;