import { useState, useEffect } from 'react';
import { Plus, ArrowUpCircle, TrendingUp, DollarSign, Clock, Filter, RefreshCw } from 'lucide-react';
import { 
  getTopUps, 
  createTopUp, 
  updateTopUpStatus, 
  getBankAccounts, 
  getTopUpAnalyticsSummary,
  predictTopUpFee 
} from '../services/api';
import { showToast, showAlert } from '../utils/notifications';
import { formatRate } from '../utils/format';
import StatCard from '../components/StatCard';
import Alert from '../components/Alert';
import Chart from '../components/Chart';

const TopUps = () => {
  const [topups, setTopups] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    currency: '',
    topUpMethod: ''
  });
  const [formData, setFormData] = useState({
    bankAccount: '',
    amount: '',
    currency: 'USD',
    topUpMethod: 'debit_card_idr',
    userInputFee: '',
    cardType: 'individual'
  });
  const [formLoading, setFormLoading] = useState(false);
  const [predictedFee, setPredictedFee] = useState(null);

  const topUpMethods = [
    { value: 'debit_card_idr', label: 'Debit Card IDR' },
    { value: 'bank_transfer_idr', label: 'Bank Transfer IDR' },
    { value: 'third_party_purchase', label: 'Third Party Purchase' },
    { value: 'multi_step_routing', label: 'Multi-Step Routing' }
  ];

  const currencies = ['USD', 'EUR', 'GBP', 'IDR', 'SGD', 'AUD'];
  const statuses = ['pending', 'completed', 'failed'];

  useEffect(() => {
    Promise.all([fetchTopUps(), fetchAccounts(), fetchAnalytics()]);
  }, []);

  useEffect(() => {
    fetchTopUps();
  }, [filters]);

  useEffect(() => {
    if (formData.amount && formData.currency && formData.topUpMethod) {
      handlePredictFee();
    }
  }, [formData.amount, formData.currency, formData.topUpMethod]);

  const fetchTopUps = async () => {
    try {
      setLoading(true);
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== '')
      );
      const response = await getTopUps(cleanFilters);
      if (response.success) {
        setTopups(response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch topups');
      }
      setError(null);
    } catch (err) {
      setError(err.message);
      showToast.error('Failed to load topups');
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await getBankAccounts();
      if (response.success) {
        setAccounts(response.data);
      }
    } catch (err) {
      console.error('Failed to load accounts:', err);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await getTopUpAnalyticsSummary();
      if (response.success) {
        setAnalytics(response.data);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    }
  };

  const handlePredictFee = async () => {
    try {
      const response = await predictTopUpFee({
        amount: formData.amount,
        currency: formData.currency,
        topUpMethod: formData.topUpMethod
      });
      if (response.success) {
        setPredictedFee(response.data.predictedFee);
        setFormData(prev => ({ ...prev, userInputFee: response.data.predictedFee.toString() }));
      }
    } catch (err) {
      console.error('Failed to predict fee:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.bankAccount || !formData.amount || !formData.userInputFee) {
      showToast.warning('Please fill all required fields');
      return;
    }

    try {
      setFormLoading(true);
      const topUpPayload = {
        bankAccount: formData.bankAccount,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        topUpMethod: formData.topUpMethod,
        feeDetails: {
          userInputFee: parseFloat(formData.userInputFee)
        },
        sourceDetails: {
          cardType: formData.cardType
        }
      };

      const response = await createTopUp(topUpPayload);
      
      if (response.success) {
        showToast.success('TopUp created successfully');
        setFormData({
          bankAccount: '',
          amount: '',
          currency: 'USD',
          topUpMethod: 'debit_card_idr',
          userInputFee: '',
          cardType: 'individual'
        });
        setPredictedFee(null);
        setShowForm(false);
        fetchTopUps();
        fetchAnalytics();
      } else {
        throw new Error(response.message || 'Failed to create topup');
      }
    } catch (err) {
      showToast.error(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateStatus = async (topupId, newStatus) => {
    const confirmResult = await showAlert.confirm(
      'Update Status?',
      `Are you sure you want to mark this topup as ${newStatus}?`,
      'Update',
      'Cancel'
    );

    if (confirmResult.isConfirmed) {
      try {
        const statusData = { status: newStatus };
        if (newStatus === 'completed') {
          const { value: actualFee } = await showAlert.confirm(
            'Actual Fee',
            'Please enter the actual fee charged:',
            'Update',
            'Cancel'
          );
          if (actualFee) {
            statusData.actualFee = parseFloat(actualFee);
          }
        }

        const response = await updateTopUpStatus(topupId, statusData);
        
        if (response.success) {
          showToast.success('TopUp status updated successfully');
          fetchTopUps();
          fetchAnalytics();
        } else {
          throw new Error(response.message || 'Failed to update status');
        }
      } catch (err) {
        showToast.error(err.message);
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'green';
      case 'failed': return 'red';
      case 'pending': return 'yellow';
      default: return 'gray';
    }
  };

  const getTopUpsByStatus = () => {
    const statusCounts = {};
    topups.forEach(topup => {
      statusCounts[topup.status] = (statusCounts[topup.status] || 0) + 1;
    });
    return statusCounts;
  };

  if (loading && topups.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">TopUps</h1>
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

  const statusCounts = getTopUpsByStatus();
  const totalAmount = topups.reduce((sum, topup) => sum + (topup.amount || 0), 0);
  const totalFees = topups.reduce((sum, topup) => sum + (topup.feeDetails?.userInputFee || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">TopUps</h1>
          <p className="text-gray-600 mt-1">Manage and track your account top-ups</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-xl border border-white/40 rounded-xl px-4 py-2 text-gray-900 hover:bg-white/30 transition-all duration-300 shadow-lg"
          >
            <Plus className="w-4 h-4" />
            Create TopUp
          </button>
          <button
            onClick={fetchTopUps}
            className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-xl border border-white/40 rounded-xl px-4 py-2 text-gray-900 hover:bg-white/30 transition-all duration-300 shadow-lg"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
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
          title="Total TopUps"
          value={topups.length}
          icon={ArrowUpCircle}
          formatType="text"
        />
        <StatCard
          title="Total Amount"
          value={totalAmount}
          icon={DollarSign}
          currency="USD"
        />
        <StatCard
          title="Total Fees"
          value={totalFees}
          icon={TrendingUp}
          currency="USD"
        />
        <StatCard
          title="Completed"
          value={statusCounts.completed || 0}
          icon={ArrowUpCircle}
          formatType="text"
        />
      </div>

      {/* Filters */}
      <div className="bg-white/20 backdrop-blur-xl border border-white/40 rounded-2xl shadow-xl p-6 ring-1 ring-white/10">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Filter className="w-5 h-5" />
          Filters
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="w-full bg-white/30 backdrop-blur-md border border-white/40 rounded-xl px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="">All Statuses</option>
              {statuses.map(status => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
            <select
              name="currency"
              value={filters.currency}
              onChange={handleFilterChange}
              className="w-full bg-white/30 backdrop-blur-md border border-white/40 rounded-xl px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="">All Currencies</option>
              {currencies.map(currency => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">TopUp Method</label>
            <select
              name="topUpMethod"
              value={filters.topUpMethod}
              onChange={handleFilterChange}
              className="w-full bg-white/30 backdrop-blur-md border border-white/40 rounded-xl px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="">All Methods</option>
              {topUpMethods.map(method => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white/20 backdrop-blur-xl border border-white/40 rounded-2xl shadow-xl p-6 ring-1 ring-white/10">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New TopUp</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bank Account *
                </label>
                <select
                  name="bankAccount"
                  value={formData.bankAccount}
                  onChange={handleInputChange}
                  className="w-full bg-white/30 backdrop-blur-md border border-white/40 rounded-xl px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  required
                >
                  <option value="">Select Account</option>
                  {accounts.map(account => (
                    <option key={account._id} value={account._id}>
                      {account.name} ({account.currency})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  TopUp Method *
                </label>
                <select
                  name="topUpMethod"
                  value={formData.topUpMethod}
                  onChange={handleInputChange}
                  className="w-full bg-white/30 backdrop-blur-md border border-white/40 rounded-xl px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  required
                >
                  {topUpMethods.map(method => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount *
                </label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  className="w-full bg-white/30 backdrop-blur-md border border-white/40 rounded-xl px-4 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  placeholder="100"
                  step="0.01"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Currency *
                </label>
                <select
                  name="currency"
                  value={formData.currency}
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
                  Fee *
                  {predictedFee && (
                    <span className="text-green-600 text-xs ml-2">
                      (Predicted: {formatRate(predictedFee, formData.currency)})
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  name="userInputFee"
                  value={formData.userInputFee}
                  onChange={handleInputChange}
                  className="w-full bg-white/30 backdrop-blur-md border border-white/40 rounded-xl px-4 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  placeholder="5.26"
                  step="0.01"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Card Type
              </label>
              <select
                name="cardType"
                value={formData.cardType}
                onChange={handleInputChange}
                className="w-full bg-white/30 backdrop-blur-md border border-white/40 rounded-xl px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="individual">Individual</option>
                <option value="business">Business</option>
              </select>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="submit"
                disabled={formLoading}
                className="bg-blue-500/80 backdrop-blur-md border border-blue-400/50 text-white px-4 py-2 rounded-xl hover:bg-blue-600/80 transition-all duration-300 disabled:opacity-50"
              >
                {formLoading ? 'Creating...' : 'Create TopUp'}
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

      {/* TopUps List */}
      <div className="grid grid-cols-1 gap-4">
        {topups.map((topup) => (
          <div
            key={topup._id}
            className="bg-white/20 backdrop-blur-xl border border-white/40 rounded-2xl shadow-xl p-6 ring-1 ring-white/10 hover:bg-white/25 transition-all duration-300"
          >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {formatRate(topup.amount, topup.currency)}
                  </h3>
                  <span className={`px-3 py-1 rounded-lg text-xs font-medium bg-${getStatusColor(topup.status)}-100/60 text-${getStatusColor(topup.status)}-800`}>
                    {topup.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Account:</span>
                    <p className="font-medium text-gray-900">{topup.bankAccount?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Method:</span>
                    <p className="font-medium text-gray-900">
                      {topUpMethods.find(m => m.value === topup.topUpMethod)?.label || topup.topUpMethod}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Fee:</span>
                    <p className="font-medium text-gray-900">
                      {formatRate(topup.feeDetails?.userInputFee, topup.currency)}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Created:</span>
                    <p className="font-medium text-gray-900">
                      {new Date(topup.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
              
              {topup.status === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdateStatus(topup._id, 'completed')}
                    className="bg-green-500/80 backdrop-blur-md border border-green-400/50 text-white px-3 py-1 rounded-lg hover:bg-green-600/80 transition-all duration-300 text-sm"
                  >
                    Complete
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(topup._id, 'failed')}
                    className="bg-red-500/80 backdrop-blur-md border border-red-400/50 text-white px-3 py-1 rounded-lg hover:bg-red-600/80 transition-all duration-300 text-sm"
                  >
                    Mark Failed
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {topups.length === 0 && !loading && (
        <div className="text-center py-12">
          <ArrowUpCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No topups found</h3>
          <p className="text-gray-600 mb-4">Get started by creating your first topup.</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 bg-blue-500/80 backdrop-blur-md border border-blue-400/50 text-white px-4 py-2 rounded-xl hover:bg-blue-600/80 transition-all duration-300"
          >
            <Plus className="w-4 h-4" />
            Create First TopUp
          </button>
        </div>
      )}
    </div>
  );
};

export default TopUps;

