import { useState, useEffect } from 'react';
import { Plus, Wallet, RefreshCw, Eye, TrendingUp, DollarSign } from 'lucide-react';
import { getBankAccounts, createBankAccount, getBankProviders, getBankAccountBalance } from '../services/api';
import { showToast, showAlert } from '../utils/notifications';
import { formatRate } from '../utils/format';
import StatCard from '../components/StatCard';
import Alert from '../components/Alert';

const BankAccounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    provider: '',
    accountNumber: '',
    currency: 'USD'
  });
  const [formLoading, setFormLoading] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState({});

  useEffect(() => {
    Promise.all([fetchAccounts(), fetchProviders()]);
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await getBankAccounts();
      if (response.success) {
        setAccounts(response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch accounts');
      }
      setError(null);
    } catch (err) {
      setError(err.message);
      showToast.error('Failed to load bank accounts');
    } finally {
      setLoading(false);
    }
  };

  const fetchProviders = async () => {
    try {
      const response = await getBankProviders();
      if (response.success) {
        setProviders(response.data);
      }
    } catch (err) {
      console.error('Failed to load providers:', err);
    }
  };

  const handleRefreshBalance = async (accountId) => {
    try {
      setBalanceLoading(prev => ({ ...prev, [accountId]: true }));
      const response = await getBankAccountBalance(accountId);
      
      if (response.success) {
        // Update the account balance in the accounts array
        setAccounts(prev => prev.map(account => 
          account._id === accountId 
            ? { ...account, balance: response.data.balance }
            : account
        ));
        showToast.success('Balance updated successfully');
      } else {
        throw new Error(response.message || 'Failed to refresh balance');
      }
    } catch (err) {
      showToast.error(err.message);
    } finally {
      setBalanceLoading(prev => ({ ...prev, [accountId]: false }));
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.provider || !formData.accountNumber || !formData.currency) {
      showToast.warning('Please fill all required fields');
      return;
    }

    try {
      setFormLoading(true);
      const response = await createBankAccount(formData);
      
      if (response.success) {
        showToast.success('Bank account created successfully');
        setFormData({ name: '', provider: '', accountNumber: '', currency: 'USD' });
        setShowForm(false);
        fetchAccounts();
      } else {
        throw new Error(response.message || 'Failed to create account');
      }
    } catch (err) {
      showToast.error(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleViewAccount = (account) => {
    showAlert.success(
      `Account: ${account.name}`,
      `Provider: ${account.provider?.name || 'N/A'}\nAccount Number: ${account.accountNumber}\nCurrency: ${account.currency}\nBalance: ${formatRate(account.balance, account.currency)}`
    );
  };

  const getTotalBalance = () => {
    return accounts.reduce((total, account) => {
      if (account.currency === 'USD') {
        return total + (account.balance || 0);
      }
      return total;
    }, 0);
  };

  const getAccountsByCurrency = () => {
    const currencies = {};
    accounts.forEach(account => {
      if (!currencies[account.currency]) {
        currencies[account.currency] = [];
      }
      currencies[account.currency].push(account);
    });
    return currencies;
  };

  if (loading && accounts.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Bank Accounts</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bank Accounts</h1>
          <p className="text-gray-600 mt-1">Manage your bank accounts and monitor balances</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-xl border border-white/40 rounded-xl px-4 py-2 text-gray-900 hover:bg-white/30 transition-all duration-300 shadow-lg"
        >
          <Plus className="w-4 h-4" />
          Add Account
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Total Accounts"
          value={accounts.length}
          icon={Wallet}
          formatType="text"
        />
        <StatCard
          title="Total USD Balance"
          value={getTotalBalance()}
          icon={DollarSign}
          currency="USD"
        />
        <StatCard
          title="Active Providers"
          value={[...new Set(accounts.map(a => a.provider?.name).filter(Boolean))].length}
          icon={TrendingUp}
          formatType="text"
        />
        <StatCard
          title="Currencies"
          value={[...new Set(accounts.map(a => a.currency))].length}
          icon={TrendingUp}
          formatType="text"
        />
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white/20 backdrop-blur-xl border border-white/40 rounded-2xl shadow-xl p-6 ring-1 ring-white/10">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Account</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full bg-white/30 backdrop-blur-md border border-white/40 rounded-xl px-4 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  placeholder="e.g., Wise USD Account"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Provider *
                </label>
                <select
                  name="provider"
                  value={formData.provider}
                  onChange={handleInputChange}
                  className="w-full bg-white/30 backdrop-blur-md border border-white/40 rounded-xl px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  required
                >
                  <option value="">Select Provider</option>
                  {providers.map(provider => (
                    <option key={provider._id} value={provider._id}>
                      {provider.name} ({provider.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Number *
                </label>
                <input
                  type="text"
                  name="accountNumber"
                  value={formData.accountNumber}
                  onChange={handleInputChange}
                  className="w-full bg-white/30 backdrop-blur-md border border-white/40 rounded-xl px-4 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  placeholder="e.g., WISE001"
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
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="IDR">IDR</option>
                  <option value="SGD">SGD</option>
                  <option value="AUD">AUD</option>
                  <option value="JPY">JPY</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="submit"
                disabled={formLoading}
                className="bg-blue-500/80 backdrop-blur-md border border-blue-400/50 text-white px-4 py-2 rounded-xl hover:bg-blue-600/80 transition-all duration-300 disabled:opacity-50"
              >
                {formLoading ? 'Creating...' : 'Create Account'}
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

      {/* Accounts List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map((account) => (
          <div
            key={account._id}
            className="bg-white/20 backdrop-blur-xl border border-white/40 rounded-2xl shadow-xl p-6 ring-1 ring-white/10 hover:bg-white/25 transition-all duration-300"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{account.name}</h3>
                <p className="text-sm text-gray-600">{account.provider?.name || 'Unknown Provider'}</p>
              </div>
              <Wallet className="w-6 h-6 text-gray-500" />
            </div>
            
            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Account Number:</span>
                <span className="text-sm text-gray-900 font-medium">{account.accountNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Currency:</span>
                <span className="text-sm text-gray-900 font-medium">{account.currency}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Balance:</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-gray-900">
                    {formatRate(account.balance, account.currency)}
                  </span>
                  <button
                    onClick={() => handleRefreshBalance(account._id)}
                    disabled={balanceLoading[account._id]}
                    className="p-1 hover:bg-white/20 rounded-lg transition-all duration-300 disabled:opacity-50"
                    title="Refresh Balance"
                  >
                    <RefreshCw className={`w-4 h-4 text-gray-600 ${balanceLoading[account._id] ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleViewAccount(account)}
                className="flex items-center gap-1 bg-blue-100/60 backdrop-blur-md text-blue-700 px-3 py-1 rounded-lg hover:bg-blue-200/60 transition-all duration-300 text-sm"
              >
                <Eye className="w-3 h-3" />
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {accounts.length === 0 && !loading && (
        <div className="text-center py-12">
          <Wallet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No accounts found</h3>
          <p className="text-gray-600 mb-4">Get started by creating your first bank account.</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 bg-blue-500/80 backdrop-blur-md border border-blue-400/50 text-white px-4 py-2 rounded-xl hover:bg-blue-600/80 transition-all duration-300"
          >
            <Plus className="w-4 h-4" />
            Add First Account
          </button>
        </div>
      )}
    </div>
  );
};

export default BankAccounts;
