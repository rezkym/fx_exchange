import { useState, useEffect } from 'react';
import { Plus, Building2, Edit, Eye, Trash2, X, Save } from 'lucide-react';
import { getBankProviders, createBankProvider, updateBankProvider, deleteBankProvider } from '../services/api';
import { showToast, showAlert } from '../utils/notifications';
import StatCard from '../components/StatCard';
import Alert from '../components/Alert';

const BankProviders = () => {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingProvider, setEditingProvider] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    supportedCurrencies: []
  });
  const [formLoading, setFormLoading] = useState(false);

  const supportedCurrencyOptions = ['USD', 'EUR', 'GBP', 'IDR', 'SGD', 'AUD', 'JPY', 'CHF', 'CAD'];

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const response = await getBankProviders();
      if (response.success) {
        setProviders(response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch providers');
      }
      setError(null);
    } catch (err) {
      setError(err.message);
      showToast.error('Failed to load bank providers');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCurrencyChange = (currency) => {
    setFormData(prev => ({
      ...prev,
      supportedCurrencies: prev.supportedCurrencies.includes(currency)
        ? prev.supportedCurrencies.filter(c => c !== currency)
        : [...prev.supportedCurrencies, currency]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.code || formData.supportedCurrencies.length === 0) {
      showToast.warning('Please fill all required fields');
      return;
    }

    try {
      setFormLoading(true);
      let response;
      
      if (editingProvider) {
        response = await updateBankProvider(editingProvider._id, formData);
        if (response.success) {
          showToast.success('Bank provider updated successfully');
        }
      } else {
        response = await createBankProvider(formData);
        if (response.success) {
          showToast.success('Bank provider created successfully');
        }
      }
      
      if (response.success) {
        setFormData({ name: '', code: '', supportedCurrencies: [] });
        setShowForm(false);
        setEditingProvider(null);
        fetchProviders();
      } else {
        throw new Error(response.message || `Failed to ${editingProvider ? 'update' : 'create'} provider`);
      }
    } catch (err) {
      showToast.error(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditProvider = (provider) => {
    setEditingProvider(provider);
    setFormData({
      name: provider.name,
      code: provider.code,
      supportedCurrencies: provider.supportedCurrencies || []
    });
    setShowForm(true);
  };

  const handleDeleteProvider = async (provider) => {
    try {
      const result = await showAlert.confirm(
        'Delete Provider',
        `Are you sure you want to delete "${provider.name}"? This action cannot be undone.`,
        'Yes, Delete',
        'Cancel'
      );

      if (result.isConfirmed) {
        const response = await deleteBankProvider(provider._id);
        if (response.success) {
          showToast.success('Bank provider deleted successfully');
          fetchProviders();
        } else {
          throw new Error(response.message || 'Failed to delete provider');
        }
      }
    } catch (err) {
      showToast.error(err.message);
    }
  };

  const handleCancelEdit = () => {
    setEditingProvider(null);
    setFormData({ name: '', code: '', supportedCurrencies: [] });
    setShowForm(false);
  };

  const handleViewProvider = (provider) => {
    showAlert.success(
      `Provider: ${provider.name}`,
      `Code: ${provider.code}\nSupported Currencies: ${provider.supportedCurrencies.join(', ')}\nMax Active Cards: ${provider.cardLimits?.maxActiveCards || 'N/A'}\nMax Replacements/Day: ${provider.cardLimits?.maxReplacementsPerDay || 'N/A'}`
    );
  };

  if (loading && providers.length === 0) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="h-9 bg-white/20 dark:bg-slate-700/20 rounded-lg w-64 mb-2 animate-pulse"></div>
            <div className="h-5 bg-white/15 dark:bg-slate-700/15 rounded w-80 animate-pulse"></div>
          </div>
          <div className="h-10 bg-white/20 dark:bg-slate-700/20 rounded-xl w-32 animate-pulse"></div>
        </div>

        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white/20 dark:bg-slate-800/20 backdrop-blur-xl border border-white/40 dark:border-slate-700/30 rounded-2xl shadow-xl p-6 ring-1 ring-white/10">
              <div className="animate-pulse">
                <div className="h-4 bg-white/30 dark:bg-slate-600/30 rounded w-20 mb-2"></div>
                <div className="h-8 bg-white/30 dark:bg-slate-600/30 rounded w-12 mb-2"></div>
                <div className="h-6 w-6 bg-white/30 dark:bg-slate-600/30 rounded"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white/20 dark:bg-slate-800/20 backdrop-blur-xl border border-white/40 dark:border-slate-700/30 rounded-2xl shadow-xl p-6 ring-1 ring-white/10">
              <div className="animate-pulse">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="h-6 bg-white/30 dark:bg-slate-600/30 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-white/25 dark:bg-slate-600/25 rounded w-1/2"></div>
                  </div>
                  <div className="h-6 w-6 bg-white/30 dark:bg-slate-600/30 rounded"></div>
                </div>
                <div className="space-y-3 mb-4">
                  <div>
                    <div className="h-3 bg-white/25 dark:bg-slate-600/25 rounded w-32 mb-2"></div>
                    <div className="flex gap-1">
                      {[1, 2, 3].map(j => (
                        <div key={j} className="h-6 bg-white/30 dark:bg-slate-600/30 rounded-lg w-12"></div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {[1, 2, 3].map(j => (
                    <div key={j} className="h-7 bg-white/30 dark:bg-slate-600/30 rounded-lg w-16"></div>
                  ))}
                </div>
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Bank Providers</h1>
          <p className="text-gray-600 dark:text-slate-300 mt-1">Manage your bank providers and their configurations</p>
        </div>
        <button
          onClick={() => {
            if (editingProvider) {
              handleCancelEdit();
            } else {
              setShowForm(!showForm);
            }
          }}
          className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-xl border border-white/40 rounded-xl px-4 py-2 text-gray-900 dark:text-slate-100 hover:bg-white/30 dark:hover:bg-slate-700/30 transition-all duration-300 shadow-lg"
        >
          {editingProvider ? (
            <>
              <X className="w-4 h-4" />
              Cancel Edit
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Add Provider
            </>
          )}
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Providers"
          value={providers.length}
          icon={Building2}
          formatType="text"
        />
        <StatCard
          title="Active Providers"
          value={providers.filter(p => p.supportedCurrencies?.length > 0).length}
          icon={Building2}
          formatType="text"
        />
        <StatCard
          title="Supported Currencies"
          value={[...new Set(providers.flatMap(p => p.supportedCurrencies || []))].length}
          icon={Building2}
          formatType="text"
        />
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="bg-white/20 backdrop-blur-xl border border-white/40 rounded-2xl shadow-xl p-6 ring-1 ring-white/10">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-4">
            {editingProvider ? 'Edit Provider' : 'Create New Provider'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Provider Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full bg-white/30 dark:bg-slate-700/30 backdrop-blur-md border border-white/40 dark:border-slate-600/40 rounded-xl px-4 py-2 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  placeholder="e.g., Wise"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Provider Code *
                </label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  className="w-full bg-white/30 dark:bg-slate-700/30 backdrop-blur-md border border-white/40 dark:border-slate-600/40 rounded-xl px-4 py-2 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  placeholder="e.g., WISE"
                  required
                  disabled={editingProvider ? true : false}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Supported Currencies *
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {supportedCurrencyOptions.map(currency => (
                  <label key={currency} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.supportedCurrencies.includes(currency)}
                      onChange={() => handleCurrencyChange(currency)}
                      className="rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 dark:bg-slate-700"
                    />
                    <span className="text-sm text-gray-700 dark:text-slate-300">{currency}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="submit"
                disabled={formLoading}
                className="inline-flex items-center gap-2 bg-blue-500/80 backdrop-blur-md border border-blue-400/50 text-white px-4 py-2 rounded-xl hover:bg-blue-600/80 transition-all duration-300 disabled:opacity-50"
              >
                {editingProvider ? (
                  <>
                    <Save className="w-4 h-4" />
                    {formLoading ? 'Updating...' : 'Update Provider'}
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    {formLoading ? 'Creating...' : 'Create Provider'}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="bg-gray-500/80 backdrop-blur-md border border-gray-400/50 text-white px-4 py-2 rounded-xl hover:bg-gray-600/80 transition-all duration-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Providers List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {providers.map((provider) => (
          <div
            key={provider._id}
            className="bg-white/20 dark:bg-slate-800/20 backdrop-blur-xl border border-white/40 dark:border-slate-700/30 rounded-2xl shadow-xl p-6 ring-1 ring-white/10 dark:ring-slate-700/20 hover:bg-white/25 dark:hover:bg-slate-700/25 transition-all duration-300 group"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{provider.name}</h3>
                <p className="text-sm text-gray-600 dark:text-slate-400">Code: {provider.code}</p>
              </div>
              <Building2 className="w-6 h-6 text-gray-500 dark:text-slate-400" />
            </div>
            
            <div className="space-y-2 mb-4">
              <div>
                <p className="text-xs text-gray-600 dark:text-slate-400">Supported Currencies:</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(provider.supportedCurrencies || []).map(currency => (
                    <span
                      key={currency}
                      className="bg-blue-100/60 dark:bg-blue-900/40 backdrop-blur-md text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded-lg"
                    >
                      {currency}
                    </span>
                  ))}
                </div>
              </div>
              
              {provider.cardLimits && (
                <div>
                  <p className="text-xs text-gray-600 dark:text-slate-400">Card Limits:</p>
                  <p className="text-sm text-gray-800 dark:text-slate-300">
                    Max Active: {provider.cardLimits.maxActiveCards || 'N/A'} | 
                    Max Daily Replacements: {provider.cardLimits.maxReplacementsPerDay || 'N/A'}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => handleViewProvider(provider)}
                className="flex items-center gap-1 bg-blue-100/60 dark:bg-blue-900/40 backdrop-blur-md text-blue-700 dark:text-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-200/60 dark:hover:bg-blue-800/50 hover:shadow-md dark:hover:shadow-blue-900/20 transition-all duration-300 text-sm font-medium hover:scale-105 transform"
              >
                <Eye className="w-3 h-3" />
                View
              </button>
              <button
                onClick={() => handleEditProvider(provider)}
                className="flex items-center gap-1 bg-green-100/60 dark:bg-green-900/40 backdrop-blur-md text-green-700 dark:text-green-200 px-3 py-1.5 rounded-lg hover:bg-green-200/60 dark:hover:bg-green-800/50 hover:shadow-md dark:hover:shadow-green-900/20 transition-all duration-300 text-sm font-medium hover:scale-105 transform"
              >
                <Edit className="w-3 h-3" />
                Edit
              </button>
              <button
                onClick={() => handleDeleteProvider(provider)}
                className="flex items-center gap-1 bg-red-100/60 dark:bg-red-900/40 backdrop-blur-md text-red-700 dark:text-red-200 px-3 py-1.5 rounded-lg hover:bg-red-200/60 dark:hover:bg-red-800/50 hover:shadow-md dark:hover:shadow-red-900/20 transition-all duration-300 text-sm font-medium hover:scale-105 transform"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {providers.length === 0 && !loading && (
        <div className="text-center py-12">
          <Building2 className="w-16 h-16 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">No providers found</h3>
          <p className="text-gray-600 dark:text-slate-300 mb-4">Get started by creating your first bank provider.</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 bg-blue-500/80 backdrop-blur-md border border-blue-400/50 text-white px-4 py-2 rounded-xl hover:bg-blue-600/80 transition-all duration-300"
          >
            <Plus className="w-4 h-4" />
            Add First Provider
          </button>
        </div>
      )}
    </div>
  );
};

export default BankProviders;

