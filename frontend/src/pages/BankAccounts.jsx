import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Wallet, RefreshCw, Eye, TrendingUp, DollarSign, CreditCard, ArrowUpCircle, Edit, Trash2 } from 'lucide-react';
import { getBankAccounts, createBankAccount, getBankProviders, getBankAccountBalance, addCurrencyToAccount, updateWalletBalance, updateBankAccount, deleteBankAccount, convert } from '../services/api';
import { showToast, showAlert } from '../utils/notifications';
import { formatRate } from '../utils/format';
import StatCard from '../components/StatCard';
import Alert from '../components/Alert';

const BankAccounts = () => {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    provider: '',
    accountNumber: '',
    currencies: ['USD']
  });
  const [formLoading, setFormLoading] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState({});
  const [showAddCurrency, setShowAddCurrency] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteMode, setDeleteMode] = useState('check'); // 'check', 'has_balance', 'has_cards', 'confirm_cards'
  const [deleteOptions, setDeleteOptions] = useState({});
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [addCurrencyForm, setAddCurrencyForm] = useState({ currency: 'EUR' });
  const [topUpForm, setTopUpForm] = useState({ 
    currency: 'USD', 
    amount: '', 
    method: 'debit_card_idr' 
  });
  const [editForm, setEditForm] = useState({
    name: '',
    accountNumber: '',
    address: {
      street: '',
      city: '',
      state: '',
      country: '',
      postalCode: ''
    }
  });
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [accountFilter, setAccountFilter] = useState('active'); // 'active', 'inactive', 'all'
  
  // State untuk cache exchange rates
  const [exchangeRates, setExchangeRates] = useState({});
  const [exchangeRatesLastUpdate, setExchangeRatesLastUpdate] = useState(0);
  const [totalIDRBalance, setTotalIDRBalance] = useState(0);
  const [totalBalanceLoading, setTotalBalanceLoading] = useState(false);

  useEffect(() => {
    Promise.all([fetchAccounts(), fetchProviders()]);
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [accountFilter]);

  // Effect untuk update total IDR balance ketika accounts atau exchange rates berubah
  useEffect(() => {
    if (accounts.length > 0) {
      calculateTotalIDRBalance();
    }
  }, [accounts, exchangeRates]);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await getBankAccounts();
      if (response.success) {
        let filteredAccounts = response.data;
        
        // Apply filter berdasarkan accountFilter state
        if (accountFilter === 'active') {
          filteredAccounts = response.data.filter(account => account.isActive !== false);
        } else if (accountFilter === 'inactive') {
          filteredAccounts = response.data.filter(account => account.isActive === false);
        }
        // jika 'all', tidak perlu filter tambahan
        
        setAccounts(filteredAccounts);
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

  // Fungsi untuk fetch exchange rates dengan caching
  const fetchExchangeRates = async (currencies) => {
    const now = Date.now();
    const oneMinute = 60 * 1000; // 1 menit dalam milliseconds
    
    // Cek apakah cache masih valid (belum expired 1 menit)
    if (exchangeRatesLastUpdate && (now - exchangeRatesLastUpdate) < oneMinute) {
      return exchangeRates;
    }

    try {
      setTotalBalanceLoading(true);
      const rates = {};
      
      // Fetch rate untuk setiap currency ke IDR
      for (const currency of currencies) {
        if (currency === 'IDR') {
          rates[currency] = 1; // IDR ke IDR = 1
        } else {
          try {
            const response = await convert({ source: currency, target: 'IDR', amount: 1 });
            rates[currency] = response.converted || 1;
          } catch (err) {
            console.warn(`Failed to get rate for ${currency}:`, err);
            rates[currency] = 1; // Fallback rate
          }
        }
      }
      
      setExchangeRates(rates);
      setExchangeRatesLastUpdate(now);
      return rates;
    } catch (err) {
      console.error('Failed to fetch exchange rates:', err);
      return exchangeRates; // Return cached rates jika ada error
    } finally {
      setTotalBalanceLoading(false);
    }
  };

  // Fungsi untuk calculate total balance dalam IDR
  const calculateTotalIDRBalance = async () => {
    if (!accounts || accounts.length === 0) {
      setTotalIDRBalance(0);
      return;
    }

    // Collect semua currencies yang ada
    const allCurrencies = new Set();
    accounts.forEach(account => {
      if (account.wallets) {
        account.wallets.forEach(wallet => {
          allCurrencies.add(wallet.currency);
        });
      }
    });

    if (allCurrencies.size === 0) {
      setTotalIDRBalance(0);
      return;
    }

    // Fetch exchange rates untuk currencies yang ada
    const rates = await fetchExchangeRates(Array.from(allCurrencies));
    
    // Calculate total balance dalam IDR
    let total = 0;
    accounts.forEach(account => {
      if (account.wallets) {
        account.wallets.forEach(wallet => {
          const rate = rates[wallet.currency] || 1;
          total += (wallet.balance || 0) * rate;
        });
      }
    });

    setTotalIDRBalance(total);
  };

  const handleRefreshBalance = async (accountId) => {
    try {
      setBalanceLoading(prev => ({ ...prev, [accountId]: true }));
      const response = await getBankAccountBalance(accountId);
      
      if (response.success) {
        // Update the account wallets in the accounts array
        setAccounts(prev => prev.map(account => 
          account._id === accountId 
            ? { ...account, wallets: response.data.wallets }
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

  const handleAddCurrency = async (accountId) => {
    try {
      const response = await addCurrencyToAccount(accountId, addCurrencyForm.currency);
      
      if (response.success) {
        showToast.success(`Currency ${addCurrencyForm.currency} berhasil ditambahkan`);
        setShowAddCurrency(false);
        setAddCurrencyForm({ currency: 'EUR' });
        fetchAccounts(); // Refresh accounts
      } else {
        throw new Error(response.message || 'Failed to add currency');
      }
    } catch (err) {
      showToast.error(err.message);
    }
  };

  const handleTopUp = async (accountId) => {
    try {
      const response = await updateWalletBalance(
        accountId, 
        topUpForm.currency, 
        parseFloat(topUpForm.amount), 
        'add'
      );
      
      if (response.success) {
        showToast.success(`Top up ${topUpForm.amount} ${topUpForm.currency} berhasil`);
        setShowTopUp(false);
        setTopUpForm({ currency: 'USD', amount: '', method: 'debit_card_idr' });
        fetchAccounts(); // Refresh accounts
      } else {
        throw new Error(response.message || 'Failed to top up');
      }
    } catch (err) {
      showToast.error(err.message);
    }
  };

  const handleEditAccount = (account) => {
    setSelectedAccount(account);
    setEditForm({
      name: account.name,
      accountNumber: account.accountNumber,
      address: {
        street: account.address?.street || '',
        city: account.address?.city || '',
        state: account.address?.state || '',
        country: account.address?.country || '',
        postalCode: account.address?.postalCode || ''
      }
    });
    setShowEdit(true);
  };

  const handleUpdateAccount = async () => {
    try {
      setEditLoading(true);
      const response = await updateBankAccount(selectedAccount._id, editForm);
      
      if (response.success) {
        showToast.success('Bank account updated successfully');
        setShowEdit(false);
        setSelectedAccount(null);
        fetchAccounts();
      } else {
        throw new Error(response.message || 'Failed to update account');
      }
    } catch (err) {
      showToast.error(err.message);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteAccount = async (action = 'check') => {
    try {
      setDeleteLoading(true);
      const options = { action, ...deleteOptions };
      const response = await deleteBankAccount(selectedAccount._id, options);
      
      if (response.success) {
        showToast.success(response.message);
        setShowDeleteConfirm(false);
        setSelectedAccount(null);
        setDeleteMode('check');
        setDeleteOptions({});
        fetchAccounts();
      } else {
        throw new Error(response.message || 'Failed to delete account');
      }
    } catch (err) {
      // Handle server response errors
      if (err.status === 400 && err.data) {
        const errorData = err.data;
        if (errorData.reason === 'has_balance_and_cards') {
          setDeleteMode('has_balance');
          setDeleteOptions(errorData.data);
          showToast.warning(errorData.message);
          return;
        } else if (errorData.reason === 'has_cards_only') {
          setDeleteMode('has_cards');
          setDeleteOptions(errorData.data);
          showToast.warning(errorData.message);
          return;
        }
      }
      showToast.error(err.message || err.data?.message || 'Error deleting account');
    } finally {
      setDeleteLoading(false);
    }
  };

  const confirmDelete = (account) => {
    setSelectedAccount(account);
    setDeleteMode('check');
    setDeleteOptions({});
    setShowDeleteConfirm(true);
  };

  const handleCardAction = (actionType) => {
    if (actionType === 'delete') {
      setDeleteOptions({ deleteCards: true });
      handleDeleteAccount('delete_cards');
    } else if (actionType === 'freeze') {
      setDeleteOptions({ freezeCards: true });
      handleDeleteAccount('freeze_cards');
    }
  };

  const handleForceDeactivate = () => {
    handleDeleteAccount('force_deactivate');
  };

  const handleReactivateAccount = async (accountId) => {
    try {
      setEditLoading(true);
      const response = await updateBankAccount(accountId, { isActive: true });
      
      if (response.success) {
        showToast.success('Account berhasil diaktifkan kembali');
        fetchAccounts();
      } else {
        throw new Error(response.message || 'Failed to reactivate account');
      }
    } catch (err) {
      showToast.error(err.message);
    } finally {
      setEditLoading(false);
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
    
    if (!formData.name || !formData.provider || !formData.accountNumber) {
      showToast.warning('Please fill all required fields');
      return;
    }

    try {
      setFormLoading(true);
      const response = await createBankAccount(formData);
      
      if (response.success) {
        showToast.success('Bank account created successfully');
        setFormData({ name: '', provider: '', accountNumber: '', currencies: ['USD'] });
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
    navigate(`/bank-accounts/${account._id}`);
  };

  // Function removed - replaced with calculateTotalIDRBalance for better currency conversion

  const getAccountsByCurrency = () => {
    const currencies = {};
    accounts.forEach(account => {
      if (account.wallets) {
        account.wallets.forEach(wallet => {
          if (!currencies[wallet.currency]) {
            currencies[wallet.currency] = 0;
          }
          currencies[wallet.currency] += wallet.balance;
        });
      }
    });
    return currencies;
  };

  if (loading && accounts.length === 0) {
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
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
                  <div className="flex justify-between">
                    <div className="h-3 bg-white/25 dark:bg-slate-600/25 rounded w-24"></div>
                    <div className="h-3 bg-white/30 dark:bg-slate-600/30 rounded w-16"></div>
                  </div>
                  <div className="flex justify-between">
                    <div className="h-3 bg-white/25 dark:bg-slate-600/25 rounded w-16"></div>
                    <div className="h-3 bg-white/30 dark:bg-slate-600/30 rounded w-12"></div>
                  </div>
                  <div className="flex justify-between">
                    <div className="h-3 bg-white/25 dark:bg-slate-600/25 rounded w-20"></div>
                    <div className="h-6 bg-white/30 dark:bg-slate-600/30 rounded w-20"></div>
                  </div>
                </div>
                <div className="h-7 bg-white/30 dark:bg-slate-600/30 rounded-lg w-24"></div>
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-gradient-to-br from-blue-500/20 to-purple-500/20 dark:from-blue-600/20 dark:to-purple-600/20 backdrop-blur-xl rounded-2xl border border-white/40 dark:border-slate-600/40 shadow-lg">
            <Wallet className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
              Bank Accounts
            </h1>
            <p className="text-gray-600 dark:text-slate-300 mt-2 text-lg">
              Kelola akun bank Anda dan pantau saldo secara real-time
            </p>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-500 dark:text-slate-400">
                Sinkronisasi otomatis setiap 1 menit
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Filter Dropdown */}
          <div className="relative group">
            <select
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              className="bg-white/30 dark:bg-slate-700/30 backdrop-blur-xl border border-white/50 dark:border-slate-600/50 rounded-xl px-5 py-3 text-gray-900 dark:text-slate-100 hover:bg-white/40 dark:hover:bg-slate-700/40 transition-all duration-300 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 appearance-none cursor-pointer min-w-[160px] font-medium group-hover:scale-105 transform"
            >
              <option value="active">🟢 Active Accounts</option>
              <option value="inactive">🔴 Inactive Accounts</option>
              <option value="all">📋 All Accounts</option>
            </select>
            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none transition-transform duration-300 group-hover:rotate-180">
              <svg className="w-5 h-5 text-gray-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          
          <button
            onClick={() => setShowForm(!showForm)}
            className="group inline-flex items-center gap-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 transform focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2"
          >
            <Plus className="w-5 h-5 transition-transform duration-300 group-hover:rotate-90" />
            <span className="hidden sm:inline">Add Account</span>
            <span className="sm:hidden">Add</span>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="transform transition-all duration-300 hover:scale-105">
          <StatCard
            title={`${accountFilter === 'active' ? 'Active' : accountFilter === 'inactive' ? 'Inactive' : 'Total'} Accounts`}
            value={accounts.length}
            icon={Wallet}
            formatType="text"
          />
        </div>
        <div className="transform transition-all duration-300 hover:scale-105">
          <StatCard
            title="Total IDR Balance"
            value={totalIDRBalance}
            icon={DollarSign}
            currency="IDR"
            loading={totalBalanceLoading}
          />
        </div>
        <div className="transform transition-all duration-300 hover:scale-105">
          <StatCard
            title="Active Providers"
            value={[...new Set(accounts.map(a => a.provider?.name).filter(Boolean))].length}
            icon={TrendingUp}
            formatType="text"
          />
        </div>
        <div className="transform transition-all duration-300 hover:scale-105">
          <StatCard
            title="Currencies"
            value={Object.keys(getAccountsByCurrency()).length}
            icon={CreditCard}
            formatType="text"
          />
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="animate-in slide-in-from-top-4 duration-500 bg-white/30 dark:bg-slate-800/30 backdrop-blur-xl border border-white/50 dark:border-slate-700/40 rounded-3xl shadow-2xl p-8 ring-1 ring-white/20 dark:ring-slate-700/30 hover:shadow-3xl transition-all duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl">
              <Plus className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Create New Account</h2>
              <p className="text-sm text-gray-600 dark:text-slate-400">Tambahkan akun bank baru ke dalam sistem</p>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Account Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full bg-white/40 dark:bg-slate-700/40 backdrop-blur-md border-2 border-white/50 dark:border-slate-600/50 rounded-xl px-4 py-3 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25 transition-all duration-300 hover:bg-white/50 dark:hover:bg-slate-700/50"
                  placeholder="e.g., Wise USD Account"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Provider *
                </label>
                <select
                  name="provider"
                  value={formData.provider}
                  onChange={handleInputChange}
                  className="w-full bg-white/40 dark:bg-slate-700/40 backdrop-blur-md border-2 border-white/50 dark:border-slate-600/50 rounded-xl px-4 py-3 text-gray-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25 transition-all duration-300 hover:bg-white/50 dark:hover:bg-slate-700/50 cursor-pointer"
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
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Account Number *
                </label>
                <input
                  type="text"
                  name="accountNumber"
                  value={formData.accountNumber}
                  onChange={handleInputChange}
                  className="w-full bg-white/40 dark:bg-slate-700/40 backdrop-blur-md border-2 border-white/50 dark:border-slate-600/50 rounded-xl px-4 py-3 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25 transition-all duration-300 hover:bg-white/50 dark:hover:bg-slate-700/50"
                  placeholder="e.g., WISE001"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Initial Currencies (Default: USD)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {['USD', 'EUR', 'GBP', 'IDR', 'SGD', 'AUD', 'JPY'].map(currency => (
                    <label key={currency} className="group relative flex items-center cursor-pointer select-none">
                      <div className="flex items-center">
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={formData.currencies.includes(currency)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData(prev => ({
                                  ...prev,
                                  currencies: [...prev.currencies, currency]
                                }));
                              } else {
                                setFormData(prev => ({
                                  ...prev,
                                  currencies: prev.currencies.filter(c => c !== currency)
                                }));
                              }
                            }}
                            className="peer h-5 w-5 appearance-none rounded-lg border-2 border-gray-300 bg-white/30 dark:bg-slate-700/30 backdrop-blur-md transition-all duration-300 checked:border-blue-500 checked:bg-blue-500 checked:shadow-lg checked:shadow-blue-500/25 hover:border-blue-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 dark:border-gray-600 dark:checked:border-blue-400 dark:checked:bg-blue-500 dark:hover:border-blue-500"
                          />
                          <svg
                            className="absolute top-1 left-1 h-3 w-3 stroke-white opacity-0 transition-all duration-300 peer-checked:opacity-100 pointer-events-none"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="3"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        </div>
                        <div className="ml-3 flex flex-col">
                          <span className="text-sm font-semibold text-gray-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                            {currency}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-slate-400">
                            {currency === 'USD' ? 'US Dollar' : 
                             currency === 'EUR' ? 'Euro' :
                             currency === 'GBP' ? 'British Pound' :
                             currency === 'IDR' ? 'Indonesian Rupiah' :
                             currency === 'SGD' ? 'Singapore Dollar' :
                             currency === 'AUD' ? 'Australian Dollar' :
                             currency === 'JPY' ? 'Japanese Yen' : currency}
                          </span>
                        </div>
                      </div>
                      <div className="absolute inset-0 rounded-lg bg-blue-50 dark:bg-blue-900/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100 -z-10"></div>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                  You can add more currencies later
                </p>
              </div>
            </div>

            <div className="flex gap-4 pt-6 border-t border-white/20 dark:border-slate-600/30">
              <button
                type="submit"
                disabled={formLoading}
                className="group flex-1 inline-flex items-center justify-center gap-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <Plus className="w-5 h-5 transition-transform duration-300 group-hover:rotate-90" />
                {formLoading ? 'Creating...' : 'Create Account'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-3 rounded-xl font-medium bg-white/20 dark:bg-slate-700/30 backdrop-blur-md border border-white/40 dark:border-slate-600/40 text-gray-700 dark:text-slate-300 hover:bg-white/30 dark:hover:bg-slate-700/40 transition-all duration-300 hover:scale-105 transform"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Accounts List */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {accounts.map((account, index) => (
          <div
            key={account._id}
            className={`animate-in slide-in-from-bottom-4 duration-500 bg-white/25 dark:bg-slate-800/25 backdrop-blur-xl border border-white/50 dark:border-slate-700/40 rounded-3xl shadow-xl p-6 ring-1 ring-white/20 dark:ring-slate-700/30 hover:bg-white/35 dark:hover:bg-slate-700/35 hover:shadow-2xl hover:scale-105 transition-all duration-300 group transform ${
              account.isActive === false ? 'opacity-75 grayscale' : ''
            }`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{account.name}</h3>
                  {/* Status Badge */}
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    account.isActive === false 
                      ? 'bg-red-100/60 dark:bg-red-900/40 text-red-700 dark:text-red-200 border border-red-200 dark:border-red-800' 
                      : 'bg-green-100/60 dark:bg-green-900/40 text-green-700 dark:text-green-200 border border-green-200 dark:border-green-800'
                  }`}>
                    {account.isActive === false ? '🔴 Inactive' : '🟢 Active'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-slate-400">{account.provider?.name || 'Unknown Provider'}</p>
              </div>
              <Wallet className={`w-6 h-6 ${account.isActive === false ? 'text-red-400 dark:text-red-500' : 'text-gray-500 dark:text-slate-400'}`} />
            </div>
            
            <div className="space-y-3 mb-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-slate-400">Account Number:</span>
                <span className="text-sm text-gray-900 dark:text-slate-100 font-medium">{account.accountNumber}</span>
              </div>
              
              {/* Multi-Currency Wallets */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600 dark:text-slate-400">Wallets:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRefreshBalance(account._id)}
                      disabled={balanceLoading[account._id]}
                      className="p-1 hover:bg-white/20 dark:hover:bg-slate-600/30 rounded-lg transition-all duration-300 disabled:opacity-50"
                      title="Refresh Balance"
                    >
                      <RefreshCw className={`w-3 h-3 text-gray-600 dark:text-slate-400 ${balanceLoading[account._id] ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {account.wallets && account.wallets.length > 0 ? (
                    account.wallets.map((wallet, index) => (
                      <div key={index} className="flex justify-between items-center py-1 px-2 bg-white/10 dark:bg-slate-700/20 rounded-lg">
                        <span className="text-xs font-medium text-gray-700 dark:text-slate-300">{wallet.currency}</span>
                        <span className="text-sm font-bold text-gray-900 dark:text-slate-100">
                          {formatRate(wallet.balance, wallet.currency)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-gray-500 dark:text-slate-400">No wallets available</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => handleViewAccount(account)}
                className="group flex items-center gap-2 bg-blue-100/60 dark:bg-blue-900/40 backdrop-blur-md text-blue-700 dark:text-blue-200 px-4 py-2 rounded-xl hover:bg-blue-200/60 dark:hover:bg-blue-800/50 hover:shadow-lg dark:hover:shadow-blue-900/30 transition-all duration-300 text-sm font-medium hover:scale-105 transform border border-blue-200/50 dark:border-blue-800/50"
              >
                <Eye className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
                View
              </button>
              
              {/* Conditional buttons based on account status */}
              {account.isActive === false ? (
                // Buttons for inactive accounts
                <button
                  onClick={() => handleReactivateAccount(account._id)}
                  disabled={editLoading}
                  className="group flex items-center gap-2 bg-green-100/60 dark:bg-green-900/40 backdrop-blur-md text-green-700 dark:text-green-200 px-4 py-2 rounded-xl hover:bg-green-200/60 dark:hover:bg-green-800/50 hover:shadow-lg dark:hover:shadow-green-900/30 transition-all duration-300 text-sm font-medium hover:scale-105 transform disabled:opacity-50 disabled:hover:scale-100 border border-green-200/50 dark:border-green-800/50"
                >
                  <RefreshCw className="w-4 h-4 transition-transform duration-300 group-hover:rotate-180" />
                  {editLoading ? 'Activating...' : 'Activate'}
                </button>
              ) : (
                // Buttons for active accounts
                <>
                  <button
                    onClick={() => handleEditAccount(account)}
                    className="group flex items-center gap-2 bg-amber-100/60 dark:bg-amber-900/40 backdrop-blur-md text-amber-700 dark:text-amber-200 px-4 py-2 rounded-xl hover:bg-amber-200/60 dark:hover:bg-amber-800/50 hover:shadow-lg dark:hover:shadow-amber-900/30 transition-all duration-300 text-sm font-medium hover:scale-105 transform border border-amber-200/50 dark:border-amber-800/50"
                  >
                    <Edit className="w-4 h-4 transition-transform duration-300 group-hover:rotate-12" />
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setSelectedAccount(account);
                      setShowAddCurrency(true);
                    }}
                    className="group flex items-center gap-2 bg-emerald-100/60 dark:bg-emerald-900/40 backdrop-blur-md text-emerald-700 dark:text-emerald-200 px-4 py-2 rounded-xl hover:bg-emerald-200/60 dark:hover:bg-emerald-800/50 hover:shadow-lg dark:hover:shadow-emerald-900/30 transition-all duration-300 text-sm font-medium hover:scale-105 transform border border-emerald-200/50 dark:border-emerald-800/50"
                  >
                    <Plus className="w-4 h-4 transition-transform duration-300 group-hover:rotate-90" />
                    <span className="hidden sm:inline">Add Currency</span>
                    <span className="sm:hidden">Add</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedAccount(account);
                      setTopUpForm(prev => ({ 
                        ...prev, 
                        currency: account.wallets?.[0]?.currency || 'USD' 
                      }));
                      setShowTopUp(true);
                    }}
                    className="group flex items-center gap-2 bg-purple-100/60 dark:bg-purple-900/40 backdrop-blur-md text-purple-700 dark:text-purple-200 px-4 py-2 rounded-xl hover:bg-purple-200/60 dark:hover:bg-purple-800/50 hover:shadow-lg dark:hover:shadow-purple-900/30 transition-all duration-300 text-sm font-medium hover:scale-105 transform border border-purple-200/50 dark:border-purple-800/50"
                  >
                    <ArrowUpCircle className="w-4 h-4 transition-transform duration-300 group-hover:-translate-y-1" />
                    Top Up
                  </button>
                </>
              )}
              
              {/* Delete button always available */}
              <button
                onClick={() => confirmDelete(account)}
                className="group flex items-center gap-2 bg-red-100/60 dark:bg-red-900/40 backdrop-blur-md text-red-700 dark:text-red-200 px-4 py-2 rounded-xl hover:bg-red-200/60 dark:hover:bg-red-800/50 hover:shadow-lg dark:hover:shadow-red-900/30 transition-all duration-300 text-sm font-medium hover:scale-105 transform border border-red-200/50 dark:border-red-800/50"
              >
                <Trash2 className="w-4 h-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
                <span className="hidden lg:inline">
                  {account.isActive === false ? 'Permanent Delete' : 'Delete'}
                </span>
                <span className="lg:hidden">Delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {accounts.length === 0 && !loading && (
        <div className="text-center py-12">
          <Wallet className="w-16 h-16 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">
            {accountFilter === 'active' ? 'No active accounts found' : 
             accountFilter === 'inactive' ? 'No inactive accounts found' : 
             'No accounts found'}
          </h3>
          <p className="text-gray-600 dark:text-slate-300 mb-4">
            {accountFilter === 'inactive' 
              ? 'All your accounts are currently active.' 
              : 'Get started by creating your first bank account.'}
          </p>
          {accountFilter !== 'inactive' && (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 bg-blue-500/80 backdrop-blur-md border border-blue-400/50 text-white px-4 py-2 rounded-xl hover:bg-blue-600/80 transition-all duration-300"
            >
              <Plus className="w-4 h-4" />
              Add First Account
            </button>
          )}
          {accountFilter === 'inactive' && (
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">
              Try switching to "All Accounts" to see all your accounts.
            </p>
          )}
        </div>
      )}

      {/* Add Currency Modal */}
      {showAddCurrency && selectedAccount && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-white/40 dark:border-slate-700/30 rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-4">
              Add Currency to {selectedAccount.name}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Select Currency
                </label>
                <select
                  value={addCurrencyForm.currency}
                  onChange={(e) => setAddCurrencyForm({ currency: e.target.value })}
                  className="w-full bg-white/30 dark:bg-slate-700/30 backdrop-blur-md border border-white/40 dark:border-slate-600/40 rounded-xl px-4 py-2 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  {selectedAccount.provider?.supportedCurrencies?.filter(currency => 
                    !selectedAccount.wallets?.some(w => w.currency === currency)
                  ).map(currency => (
                    <option key={currency} value={currency}>{currency}</option>
                  )) || []}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAddCurrency(selectedAccount._id)}
                  className="flex-1 bg-green-500/80 backdrop-blur-md border border-green-400/50 text-white px-4 py-2 rounded-xl hover:bg-green-600/80 transition-all duration-300"
                >
                  Add Currency
                </button>
                <button
                  onClick={() => {
                    setShowAddCurrency(false);
                    setSelectedAccount(null);
                  }}
                  className="flex-1 bg-gray-500/80 backdrop-blur-md border border-gray-400/50 text-white px-4 py-2 rounded-xl hover:bg-gray-600/80 transition-all duration-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Up Modal */}
      {showTopUp && selectedAccount && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-white/40 dark:border-slate-700/30 rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-4">
              Top Up {selectedAccount.name}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Currency
                </label>
                <select
                  value={topUpForm.currency}
                  onChange={(e) => setTopUpForm(prev => ({ ...prev, currency: e.target.value }))}
                  className="w-full bg-white/30 dark:bg-slate-700/30 backdrop-blur-md border border-white/40 dark:border-slate-600/40 rounded-xl px-4 py-2 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  {selectedAccount.wallets?.map(wallet => (
                    <option key={wallet.currency} value={wallet.currency}>{wallet.currency}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Amount
                </label>
                <input
                  type="number"
                  value={topUpForm.amount}
                  onChange={(e) => setTopUpForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full bg-white/30 dark:bg-slate-700/30 backdrop-blur-md border border-white/40 dark:border-slate-600/40 rounded-xl px-4 py-2 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  placeholder="Enter amount"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Top Up Method
                </label>
                <select
                  value={topUpForm.method}
                  onChange={(e) => setTopUpForm(prev => ({ ...prev, method: e.target.value }))}
                  className="w-full bg-white/30 dark:bg-slate-700/30 backdrop-blur-md border border-white/40 dark:border-slate-600/40 rounded-xl px-4 py-2 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="debit_card_idr">Debit Card IDR</option>
                  <option value="bank_transfer_idr">Bank Transfer IDR</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleTopUp(selectedAccount._id)}
                  disabled={!topUpForm.amount || parseFloat(topUpForm.amount) <= 0}
                  className="flex-1 bg-purple-500/80 backdrop-blur-md border border-purple-400/50 text-white px-4 py-2 rounded-xl hover:bg-purple-600/80 transition-all duration-300 disabled:opacity-50"
                >
                  Top Up
                </button>
                <button
                  onClick={() => {
                    setShowTopUp(false);
                    setSelectedAccount(null);
                  }}
                  className="flex-1 bg-gray-500/80 backdrop-blur-md border border-gray-400/50 text-white px-4 py-2 rounded-xl hover:bg-gray-600/80 transition-all duration-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Account Modal */}
      {showEdit && selectedAccount && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-white/40 dark:border-slate-700/30 rounded-2xl shadow-2xl p-6 w-full max-w-lg">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-4">
              Edit Account: {selectedAccount.name}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Account Name
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-white/30 dark:bg-slate-700/30 backdrop-blur-md border border-white/40 dark:border-slate-600/40 rounded-xl px-4 py-2 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  placeholder="Account name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Account Number
                </label>
                <input
                  type="text"
                  value={editForm.accountNumber}
                  onChange={(e) => setEditForm(prev => ({ ...prev, accountNumber: e.target.value }))}
                  className="w-full bg-white/30 dark:bg-slate-700/30 backdrop-blur-md border border-white/40 dark:border-slate-600/40 rounded-xl px-4 py-2 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  placeholder="Account number"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Street
                  </label>
                  <input
                    type="text"
                    value={editForm.address.street}
                    onChange={(e) => setEditForm(prev => ({ 
                      ...prev, 
                      address: { ...prev.address, street: e.target.value }
                    }))}
                    className="w-full bg-white/30 dark:bg-slate-700/30 backdrop-blur-md border border-white/40 dark:border-slate-600/40 rounded-xl px-4 py-2 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    placeholder="Street address"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={editForm.address.city}
                    onChange={(e) => setEditForm(prev => ({ 
                      ...prev, 
                      address: { ...prev.address, city: e.target.value }
                    }))}
                    className="w-full bg-white/30 dark:bg-slate-700/30 backdrop-blur-md border border-white/40 dark:border-slate-600/40 rounded-xl px-4 py-2 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    placeholder="City"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Country
                  </label>
                  <input
                    type="text"
                    value={editForm.address.country}
                    onChange={(e) => setEditForm(prev => ({ 
                      ...prev, 
                      address: { ...prev.address, country: e.target.value }
                    }))}
                    className="w-full bg-white/30 dark:bg-slate-700/30 backdrop-blur-md border border-white/40 dark:border-slate-600/40 rounded-xl px-4 py-2 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    placeholder="Country"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    value={editForm.address.postalCode}
                    onChange={(e) => setEditForm(prev => ({ 
                      ...prev, 
                      address: { ...prev.address, postalCode: e.target.value }
                    }))}
                    className="w-full bg-white/30 dark:bg-slate-700/30 backdrop-blur-md border border-white/40 dark:border-slate-600/40 rounded-xl px-4 py-2 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    placeholder="Postal code"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleUpdateAccount}
                  disabled={editLoading || !editForm.name || !editForm.accountNumber}
                  className="flex-1 bg-amber-500/80 backdrop-blur-md border border-amber-400/50 text-white px-4 py-2 rounded-xl hover:bg-amber-600/80 transition-all duration-300 disabled:opacity-50"
                >
                  {editLoading ? 'Updating...' : 'Update Account'}
                </button>
                <button
                  onClick={() => {
                    setShowEdit(false);
                    setSelectedAccount(null);
                  }}
                  className="flex-1 bg-gray-500/80 backdrop-blur-md border border-gray-400/50 text-white px-4 py-2 rounded-xl hover:bg-gray-600/80 transition-all duration-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedAccount && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-white/40 dark:border-slate-700/30 rounded-2xl shadow-2xl p-6 w-full max-w-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100/60 dark:bg-red-900/40 rounded-lg">
                <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
                  {deleteMode === 'check' ? 'Delete Account' : deleteMode === 'has_balance' ? 'Cannot Delete Account' : 'Account Has Active Cards'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  {deleteMode === 'check' ? 'Checking account status...' : deleteMode === 'has_balance' ? 'Account will be deactivated' : 'Choose action for cards'}
                </p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700 dark:text-slate-300 mb-2">
                Account: <strong>{selectedAccount.name}</strong>
              </p>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-3">
                Account Number: {selectedAccount.accountNumber}
              </p>

              {deleteMode === 'has_balance' && (
                <div className="p-4 bg-orange-50/60 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                  <p className="text-sm text-orange-800 dark:text-orange-200 font-medium mb-2">
                    🚫 Account tidak dapat dihapus
                  </p>
                  <p className="text-xs text-orange-700 dark:text-orange-300 mb-2">
                    Akun masih memiliki saldo aktif dan kartu.
                  </p>
                  {deleteOptions.wallets && (
                    <div className="mb-2">
                      <p className="text-xs font-medium">Saldo aktif:</p>
                      <ul className="text-xs">
                        {deleteOptions.wallets.map((wallet, idx) => (
                          <li key={idx}>• {wallet.currency}: {formatRate(wallet.balance, wallet.currency)}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p className="text-xs text-orange-600 dark:text-orange-400">
                    ✓ Akun akan di-deactivate dan dapat diaktifkan kembali
                  </p>
                </div>
              )}

              {deleteMode === 'has_cards' && (
                <div className="p-4 bg-blue-50/60 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200 font-medium mb-2">
                    💳 Account memiliki {deleteOptions.activeCards} kartu aktif
                  </p>
                  {deleteOptions.cards && (
                    <div className="mb-3">
                      <p className="text-xs font-medium mb-1">Kartu aktif:</p>
                      <ul className="text-xs space-y-1">
                        {deleteOptions.cards.map((card, idx) => (
                          <li key={idx} className="flex justify-between">
                            <span>• {card.cardNumber}</span>
                            <span className="text-xs bg-blue-100 dark:bg-blue-800 px-1 rounded">{card.status}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p className="text-xs text-blue-600 dark:text-blue-400 mb-3">
                    Pilih aksi untuk kartu-kartu ini:
                  </p>
                  <div className="space-y-2">
                    <button
                      onClick={() => handleCardAction('delete')}
                      disabled={deleteLoading}
                      className="w-full bg-red-500/80 backdrop-blur-md border border-red-400/50 text-white px-3 py-2 rounded-lg hover:bg-red-600/80 transition-all duration-300 text-sm disabled:opacity-50"
                    >
                      {deleteLoading ? 'Processing...' : '🗑️ Hapus semua kartu dan akun'}
                    </button>
                    <button
                      onClick={() => handleCardAction('freeze')}
                      disabled={deleteLoading}
                      className="w-full bg-orange-500/80 backdrop-blur-md border border-orange-400/50 text-white px-3 py-2 rounded-lg hover:bg-orange-600/80 transition-all duration-300 text-sm disabled:opacity-50"
                    >
                      {deleteLoading ? 'Processing...' : '❄️ Freeze kartu dan deactivate akun'}
                    </button>
                  </div>
                </div>
              )}

              {deleteMode === 'check' && (
                <div className="p-4 bg-gray-50/60 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Sedang memeriksa kondisi account...
                  </p>
                  {selectedAccount.wallets && selectedAccount.wallets.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Current wallets:</p>
                      <ul className="text-xs text-gray-600 dark:text-gray-400">
                        {selectedAccount.wallets.map((wallet, index) => (
                          <li key={index}>
                            • {wallet.currency}: {formatRate(wallet.balance, wallet.currency)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              {deleteMode === 'check' && (
                <>
                  <button
                    onClick={() => handleDeleteAccount('check')}
                    disabled={deleteLoading}
                    className="flex-1 bg-red-500/80 backdrop-blur-md border border-red-400/50 text-white px-4 py-2 rounded-xl hover:bg-red-600/80 transition-all duration-300 disabled:opacity-50"
                  >
                    {deleteLoading ? 'Checking...' : 'Proceed Delete'}
                  </button>
                </>
              )}

              {deleteMode === 'has_balance' && (
                <button
                  onClick={handleForceDeactivate}
                  disabled={deleteLoading}
                  className="flex-1 bg-orange-500/80 backdrop-blur-md border border-orange-400/50 text-white px-4 py-2 rounded-xl hover:bg-orange-600/80 transition-all duration-300 disabled:opacity-50"
                >
                  {deleteLoading ? 'Deactivating...' : 'Deactivate Account'}
                </button>
              )}

              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedAccount(null);
                  setDeleteMode('check');
                  setDeleteOptions({});
                }}
                className="flex-1 bg-gray-500/80 backdrop-blur-md border border-gray-400/50 text-white px-4 py-2 rounded-xl hover:bg-gray-600/80 transition-all duration-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankAccounts;

