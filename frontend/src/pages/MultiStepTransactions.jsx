import { useState, useEffect } from 'react';
import { Plus, Route, Play, Eye, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { 
  createMultiStepTransaction, 
  executeMultiStepTransactionStep, 
  getMultiStepTransactionStatus,
  getBankProviders 
} from '../services/api';
import { showToast, showAlert } from '../utils/notifications';
import { formatRate } from '../utils/format';
import StatCard from '../components/StatCard';
import Alert from '../components/Alert';

const MultiStepTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    sourceAmount: '',
    sourceCurrency: 'IDR',
    intermediateProvider: '',
    targetProvider: '',
    targetCurrency: 'EUR'
  });
  const [formLoading, setFormLoading] = useState(false);

  const currencies = ['IDR', 'USD', 'EUR', 'GBP', 'SGD', 'AUD', 'JPY'];

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      const response = await getBankProviders();
      if (response.success) {
        setProviders(response.data);
      }
      setError(null);
    } catch (err) {
      setError(err.message);
      showToast.error('Failed to load providers');
    } finally {
      setLoading(false);
    }
  };

  // Note: Transaction listing feature is under maintenance
  // Only create functionality is available

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.sourceAmount || !formData.intermediateProvider || !formData.targetProvider) {
      showToast.warning('Please fill all required fields');
      return;
    }

    if (formData.intermediateProvider === formData.targetProvider) {
      showToast.warning('Intermediate and target providers must be different');
      return;
    }

    const confirmResult = await showAlert.confirm(
      'Create Multi-Step Transaction?',
      `Create routing: ${formatRate(formData.sourceAmount, formData.sourceCurrency)} → ${formData.targetCurrency} via ${providers.find(p => p._id === formData.intermediateProvider)?.name} → ${providers.find(p => p._id === formData.targetProvider)?.name}?`,
      'Create',
      'Cancel'
    );

    if (confirmResult.isConfirmed) {
      try {
        setFormLoading(true);
        const transactionPayload = {
          sourceAmount: parseFloat(formData.sourceAmount),
          sourceCurrency: formData.sourceCurrency,
          intermediateProvider: formData.intermediateProvider,
          targetProvider: formData.targetProvider,
          targetCurrency: formData.targetCurrency
        };

        const response = await createMultiStepTransaction(transactionPayload);
        
        if (response.success) {
          showToast.success('Multi-step transaction created successfully');
          setFormData({
            sourceAmount: '',
            sourceCurrency: 'IDR',
            intermediateProvider: '',
            targetProvider: '',
            targetCurrency: 'EUR'
          });
          setShowForm(false);
        } else {
          throw new Error(response.message || 'Failed to create transaction');
        }
      } catch (err) {
        showToast.error(err.message);
      } finally {
        setFormLoading(false);
      }
    }
  };

  const handleExecuteStep = async (transactionId, stepNumber) => {
    const confirmResult = await showAlert.confirm(
      'Execute Step?',
      `Are you sure you want to execute step ${stepNumber} of this transaction?`,
      'Execute',
      'Cancel'
    );

    if (confirmResult.isConfirmed) {
      try {
        const stepData = { step: stepNumber };
        const response = await executeMultiStepTransactionStep(transactionId, stepData);
        
        if (response.success) {
          showToast.success(`Step ${stepNumber} executed successfully`);
        } else {
          throw new Error(response.message || 'Failed to execute step');
        }
      } catch (err) {
        showToast.error(err.message);
      }
    }
  };

  const handleViewStatus = async (transactionId) => {
    try {
      const response = await getMultiStepTransactionStatus(transactionId);
      
      if (response.success) {
        const statusInfo = response.data;
        showAlert.success(
          'Transaction Status',
          `Status: ${statusInfo.status}\nProgress: ${statusInfo.completedSteps}/${statusInfo.totalSteps} steps\nEstimated completion: ${statusInfo.estimatedCompletion || 'N/A'}`
        );
      } else {
        throw new Error(response.message || 'Failed to get status');
      }
    } catch (err) {
      showToast.error(err.message);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'green';
      case 'failed': return 'red';
      case 'pending': return 'yellow';
      case 'processing': return 'blue';
      default: return 'gray';
    }
  };

  const getStepIcon = (status) => {
    switch (status) {
      case 'completed': return CheckCircle;
      case 'failed': return AlertCircle;
      case 'pending': return Clock;
      default: return Clock;
    }
  };

  const getTransactionStats = () => {
    // Transaction listing is under maintenance, showing zero values
    return { 
      totalTransactions: 0, 
      completedTransactions: 0, 
      pendingTransactions: 0, 
      totalVolume: 0 
    };
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Multi-Step Transactions</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white/20 backdrop-blur-xl border border-white/40 rounded-2xl shadow-xl p-6 ring-1 ring-white/10">
              <div className="animate-pulse">
                <div className="h-4 bg-white/30 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-white/30 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const stats = getTransactionStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Multi-Step Transactions</h1>
          <p className="text-gray-600 mt-1">Complex routing: IDR → Wise → Target Provider</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-xl border border-white/40 rounded-xl px-4 py-2 text-gray-900 hover:bg-white/30 transition-all duration-300 shadow-lg"
        >
          <Plus className="w-4 h-4" />
          Create Multi-Step
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert 
          message={error} 
          onClose={() => setError(null)} 
          type="error" 
        />
      )}

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <StatCard
          title="Total Transactions"
          value={stats.totalTransactions}
          icon={Route}
          formatType="text"
        />
        <StatCard
          title="Completed"
          value={stats.completedTransactions}
          icon={CheckCircle}
          formatType="text"
        />
        <StatCard
          title="Pending"
          value={stats.pendingTransactions}
          icon={Clock}
          formatType="text"
        />
        <StatCard
          title="Total Volume"
          value={stats.totalVolume}
          icon={Route}
          currency="IDR"
        />
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white/20 backdrop-blur-xl border border-white/40 rounded-2xl shadow-xl p-6 ring-1 ring-white/10">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Create Multi-Step Transaction</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Source Amount *
                </label>
                <input
                  type="number"
                  name="sourceAmount"
                  value={formData.sourceAmount}
                  onChange={handleInputChange}
                  className="w-full bg-white/30 backdrop-blur-md border border-white/40 rounded-xl px-4 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  placeholder="1000000"
                  step="1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Source Currency *
                </label>
                <select
                  name="sourceCurrency"
                  value={formData.sourceCurrency}
                  onChange={handleInputChange}
                  className="w-full bg-white/30 backdrop-blur-md border border-white/40 rounded-xl px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  required
                >
                  {currencies.map(currency => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Currency *
                </label>
                <select
                  name="targetCurrency"
                  value={formData.targetCurrency}
                  onChange={handleInputChange}
                  className="w-full bg-white/30 backdrop-blur-md border border-white/40 rounded-xl px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  required
                >
                  {currencies.filter(c => c !== formData.sourceCurrency).map(currency => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Intermediate Provider (e.g., Wise) *
                </label>
                <select
                  name="intermediateProvider"
                  value={formData.intermediateProvider}
                  onChange={handleInputChange}
                  className="w-full bg-white/30 backdrop-blur-md border border-white/40 rounded-xl px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  required
                >
                  <option value="">Select Intermediate Provider</option>
                  {providers.map(provider => (
                    <option key={provider._id} value={provider._id}>
                      {provider.name} ({provider.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Provider *
                </label>
                <select
                  name="targetProvider"
                  value={formData.targetProvider}
                  onChange={handleInputChange}
                  className="w-full bg-white/30 backdrop-blur-md border border-white/40 rounded-xl px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  required
                >
                  <option value="">Select Target Provider</option>
                  {providers
                    .filter(provider => provider._id !== formData.intermediateProvider)
                    .map(provider => (
                    <option key={provider._id} value={provider._id}>
                      {provider.name} ({provider.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-blue-50/50 backdrop-blur-md border border-blue-200/50 rounded-xl p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Transaction Flow Preview:</h3>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <span>{formatRate(formData.sourceAmount || 0, formData.sourceCurrency)}</span>
                <span>→</span>
                <span>{providers.find(p => p._id === formData.intermediateProvider)?.name || 'Intermediate'}</span>
                <span>→</span>
                <span>{providers.find(p => p._id === formData.targetProvider)?.name || 'Target'}</span>
                <span>({formData.targetCurrency})</span>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="submit"
                disabled={formLoading}
                className="bg-blue-500/80 backdrop-blur-md border border-blue-400/50 text-white px-4 py-2 rounded-xl hover:bg-blue-600/80 transition-all duration-300 disabled:opacity-50"
              >
                {formLoading ? 'Creating...' : 'Create Transaction'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="bg-gray-500/80 backdrop-blur-md border border-gray-400/50 text-white px-4 py-2 rounded-xl hover:bg-gray-600/80 transition-all duration-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Transactions List - Under Maintenance */}
      <div className="bg-white/20 backdrop-blur-xl border border-white/40 rounded-2xl shadow-xl p-12 ring-1 ring-white/10 text-center">
        <div className="max-w-md mx-auto">
          <Route className="w-16 h-16 text-gray-400 mx-auto mb-6" />
          <h3 className="text-xl font-semibold text-gray-900 mb-3">Transaction History Under Maintenance</h3>
          <p className="text-gray-600 mb-6">
            The transaction listing feature is currently under maintenance. You can still create new multi-step transactions, 
            but viewing transaction history is temporarily unavailable.
          </p>
          <div className="bg-yellow-100/60 backdrop-blur-md border border-yellow-200/50 rounded-xl p-4">
            <p className="text-sm text-yellow-800">
              <strong>Available features:</strong><br />
              • Create new multi-step transactions<br />
              • Execute transaction steps (via transaction ID)<br />
              • Check transaction status (via transaction ID)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiStepTransactions;
