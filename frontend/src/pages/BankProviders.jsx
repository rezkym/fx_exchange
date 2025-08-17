import { useState, useEffect } from 'react';
import { Plus, Building2, Edit, Eye, Trash2 } from 'lucide-react';
import { getBankProviders, createBankProvider } from '../services/api';
import { showToast, showAlert } from '../utils/notifications';
import StatCard from '../components/StatCard';
import Alert from '../components/Alert';

const BankProviders = () => {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
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
      const response = await createBankProvider(formData);
      
      if (response.success) {
        showToast.success('Bank provider created successfully');
        setFormData({ name: '', code: '', supportedCurrencies: [] });
        setShowForm(false);
        fetchProviders();
      } else {
        throw new Error(response.message || 'Failed to create provider');
      }
    } catch (err) {
      showToast.error(err.message);
    } finally {
      setFormLoading(false);
    }
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
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Bank Providers</h1>
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
          <h1 className="text-3xl font-bold text-gray-900">Bank Providers</h1>
          <p className="text-gray-600 mt-1">Manage your bank providers and their configurations</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-xl border border-white/40 rounded-xl px-4 py-2 text-gray-900 hover:bg-white/30 transition-all duration-300 shadow-lg"
        >
          <Plus className="w-4 h-4" />
          Add Provider
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

      {/* Create Form */}
      {showForm && (
        <div className="bg-white/20 backdrop-blur-xl border border-white/40 rounded-2xl shadow-xl p-6 ring-1 ring-white/10">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Provider</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Provider Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full bg-white/30 backdrop-blur-md border border-white/40 rounded-xl px-4 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  placeholder="e.g., Wise"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Provider Code *
                </label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  className="w-full bg-white/30 backdrop-blur-md border border-white/40 rounded-xl px-4 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  placeholder="e.g., WISE"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Supported Currencies *
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {supportedCurrencyOptions.map(currency => (
                  <label key={currency} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.supportedCurrencies.includes(currency)}
                      onChange={() => handleCurrencyChange(currency)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{currency}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="submit"
                disabled={formLoading}
                className="bg-blue-500/80 backdrop-blur-md border border-blue-400/50 text-white px-4 py-2 rounded-xl hover:bg-blue-600/80 transition-all duration-300 disabled:opacity-50"
              >
                {formLoading ? 'Creating...' : 'Create Provider'}
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

      {/* Providers List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {providers.map((provider) => (
          <div
            key={provider._id}
            className="bg-white/20 backdrop-blur-xl border border-white/40 rounded-2xl shadow-xl p-6 ring-1 ring-white/10 hover:bg-white/25 transition-all duration-300"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{provider.name}</h3>
                <p className="text-sm text-gray-600">Code: {provider.code}</p>
              </div>
              <Building2 className="w-6 h-6 text-gray-500" />
            </div>
            
            <div className="space-y-2 mb-4">
              <div>
                <p className="text-xs text-gray-600">Supported Currencies:</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(provider.supportedCurrencies || []).map(currency => (
                    <span
                      key={currency}
                      className="bg-blue-100/60 backdrop-blur-md text-blue-800 text-xs px-2 py-1 rounded-lg"
                    >
                      {currency}
                    </span>
                  ))}
                </div>
              </div>
              
              {provider.cardLimits && (
                <div>
                  <p className="text-xs text-gray-600">Card Limits:</p>
                  <p className="text-sm text-gray-800">
                    Max Active: {provider.cardLimits.maxActiveCards || 'N/A'} | 
                    Max Daily Replacements: {provider.cardLimits.maxReplacementsPerDay || 'N/A'}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleViewProvider(provider)}
                className="flex items-center gap-1 bg-blue-100/60 backdrop-blur-md text-blue-700 px-3 py-1 rounded-lg hover:bg-blue-200/60 transition-all duration-300 text-sm"
              >
                <Eye className="w-3 h-3" />
                View
              </button>
            </div>
          </div>
        ))}
      </div>

      {providers.length === 0 && !loading && (
        <div className="text-center py-12">
          <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No providers found</h3>
          <p className="text-gray-600 mb-4">Get started by creating your first bank provider.</p>
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
