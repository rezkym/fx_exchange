import { useState, useEffect } from 'react';
import { 
  Plus, 
  ArrowUpCircle, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  Filter, 
  RefreshCw, 
  Search,
  Download,
  Eye,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Zap,
  ArrowRight
} from 'lucide-react';
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

const TopUps = () => {
  const [topups, setTopups] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasRenderError, setHasRenderError] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCurrency, setSelectedCurrency] = useState('all');
  const [selectedMethod, setSelectedMethod] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedTopUp, setSelectedTopUp] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  
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
    { value: 'debit_card_idr', label: 'Debit Card IDR', icon: CreditCard },
    { value: 'bank_transfer_idr', label: 'Bank Transfer IDR', icon: ArrowRight },
    { value: 'third_party_purchase', label: 'Third Party Purchase', icon: DollarSign },
    { value: 'multi_step_routing', label: 'Multi-Step Routing', icon: Zap }
  ];

  const currencies = ['USD', 'EUR', 'GBP', 'IDR', 'SGD', 'AUD'];
  const statuses = ['pending', 'processing', 'completed', 'failed'];

  useEffect(() => {
    Promise.all([fetchTopUps(), fetchAccounts(), fetchAnalytics()]);
  }, []);

  useEffect(() => {
    fetchTopUps();
  }, [currentPage, pageSize, searchTerm, selectedStatus, selectedCurrency, selectedMethod, dateRange, sortBy]);

  useEffect(() => {
    // Only predict fee if all required fields are filled and amount is a valid number
    if (formData.amount && 
        formData.currency && 
        formData.topUpMethod && 
        !isNaN(parseFloat(formData.amount)) && 
        parseFloat(formData.amount) > 0) {
      handlePredictFee();
    } else {
      // Clear predicted fee if conditions aren't met
      setPredictedFee(null);
    }
  }, [formData.amount, formData.currency, formData.topUpMethod]);

  const fetchTopUps = async () => {
    try {
      setLoading(true);
      
      const params = {
        page: currentPage,
        limit: pageSize,
        sortBy: sortBy === 'newest' ? 'createdAt' : sortBy === 'oldest' ? 'createdAt' : sortBy.replace('_', '_'),
        sortOrder: sortBy === 'newest' ? 'desc' : sortBy === 'oldest' ? 'asc' : sortBy.includes('_low') ? 'asc' : 'desc'
      };

      if (searchTerm) params.search = searchTerm;
      if (selectedStatus !== 'all') params.status = selectedStatus;
      if (selectedCurrency !== 'all') params.currency = selectedCurrency;
      if (selectedMethod !== 'all') params.topUpMethod = selectedMethod;
      
      if (dateRange !== 'all') {
        const now = new Date();
        let startDate = new Date();
        
        switch (dateRange) {
          case 'today':
            startDate.setHours(0, 0, 0, 0);
            break;
          case 'week':
            startDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            startDate.setMonth(now.getMonth() - 1);
            break;
          case 'quarter':
            startDate.setMonth(now.getMonth() - 3);
            break;
          default:
            startDate = null;
        }
        
        if (startDate) {
          params.startDate = startDate.toISOString();
        }
      }

      const response = await getTopUps(params);
      if (response.success) {
        setTopups(response.data);
        if (response.pagination) {
          setTotalPages(response.pagination.totalPages);
          setTotalCount(response.pagination.totalCount);
        }
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

  // Reset to first page when filters change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [searchTerm, selectedStatus, selectedCurrency, selectedMethod, dateRange, sortBy]);

  const handlePredictFee = async () => {
    try {
      const response = await predictTopUpFee({
        amount: formData.amount,
        currency: formData.currency,
        topUpMethod: formData.topUpMethod
      });
      if (response.success && response.data && typeof response.data.predictedFee === 'number') {
        setPredictedFee(response.data.predictedFee);
        setFormData(prev => ({ ...prev, userInputFee: response.data.predictedFee.toString() }));
      } else {
        // Clear predicted fee if prediction fails
        setPredictedFee(null);
      }
    } catch (err) {
      console.error('Failed to predict fee:', err);
      setPredictedFee(null);
      // Don't crash the app, just log the error
    }
  };

  const handleInputChange = (e) => {
    try {
      const { name, value } = e.target;
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    } catch (err) {
      console.error('Error in handleInputChange:', err);
      // Prevent crash by not updating if there's an error
    }
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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />;
      case 'processing':
        return <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getMethodIcon = (method) => {
    const methodObj = topUpMethods.find(m => m.value === method);
    const IconComponent = methodObj?.icon || DollarSign;
    return <IconComponent className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
  };

  const openTopUpDetail = (topup) => {
    setSelectedTopUp(topup);
    setShowDetailModal(true);
  };

  const closeTopUpDetail = () => {
    setSelectedTopUp(null);
    setShowDetailModal(false);
  };

  const exportTopUps = () => {
    // TODO: Implement export functionality
    showToast.info('Export functionality coming soon');
  };

  const getTopUpStats = () => {
    const totalAmount = topups.reduce((sum, topup) => sum + (topup.amount || 0), 0);
    const totalFees = topups.reduce((sum, topup) => sum + (topup.feeDetails?.userInputFee || 0), 0);
    const completedTopUps = topups.filter(t => t.status === 'completed');
    const pendingTopUps = topups.filter(t => t.status === 'pending');
    const failedTopUps = topups.filter(t => t.status === 'failed');

    return {
      totalTopUps: topups.length,
      totalAmount,
      totalFees,
      completedCount: completedTopUps.length,
      pendingCount: pendingTopUps.length,
      failedCount: failedTopUps.length
    };
  };

  if (loading && topups.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">TopUps</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white/20 dark:bg-slate-800/20 backdrop-blur-xl border border-white/40 dark:border-slate-700/40 rounded-2xl shadow-xl p-6 ring-1 ring-white/10 dark:ring-slate-700/10">
              <div className="animate-pulse">
                <div className="h-4 bg-white/30 dark:bg-slate-700/30 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-white/30 dark:bg-slate-700/30 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const stats = getTopUpStats();

  // Error boundary for render errors
  if (hasRenderError) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">TopUps</h1>
        </div>
        <Alert 
          message="Something went wrong while loading the TopUps page. Please refresh and try again." 
          type="error" 
        />
        <div className="text-center py-12">
          <button
            onClick={() => {
              setHasRenderError(false);
              window.location.reload();
            }}
            className="bg-blue-500/80 backdrop-blur-md border border-blue-400/50 text-white px-4 py-2 rounded-xl hover:bg-blue-600/80 transition-all duration-300"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  try {
    return (
      <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Account TopUps</h1>
          <p className="text-gray-600 dark:text-slate-400 mt-1">Manage and track your account top-ups across all methods</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 backdrop-blur-xl border rounded-xl px-4 py-2 transition-all duration-300 shadow-lg ${
              showFilters 
                ? 'bg-blue-500/20 border-blue-400/50 text-blue-700 dark:text-blue-300'
                : 'bg-white/20 dark:bg-slate-800/20 border-white/40 dark:border-slate-700/40 text-gray-900 dark:text-slate-100 hover:bg-white/30 dark:hover:bg-slate-700/30'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            onClick={exportTopUps}
            className="inline-flex items-center gap-2 bg-white/20 dark:bg-slate-800/20 backdrop-blur-xl border border-white/40 dark:border-slate-700/40 rounded-xl px-4 py-2 text-gray-900 dark:text-slate-100 hover:bg-white/30 dark:hover:bg-slate-700/30 transition-all duration-300 shadow-lg"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 bg-white/20 dark:bg-slate-800/20 backdrop-blur-xl border border-white/40 dark:border-slate-700/40 rounded-xl px-4 py-2 text-gray-900 dark:text-slate-100 hover:bg-white/30 dark:hover:bg-slate-700/30 transition-all duration-300 shadow-lg"
          >
            <Plus className="w-4 h-4" />
            Create TopUp
          </button>
          <button
            onClick={fetchTopUps}
            className="inline-flex items-center gap-2 bg-white/20 dark:bg-slate-800/20 backdrop-blur-xl border border-white/40 dark:border-slate-700/40 rounded-xl px-4 py-2 text-gray-900 dark:text-slate-100 hover:bg-white/30 dark:hover:bg-slate-700/30 transition-all duration-300 shadow-lg"
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
          value={stats.totalTopUps}
          icon={ArrowUpCircle}
          formatType="text"
        />
        <StatCard
          title="Total Amount"
          value={stats.totalAmount}
          icon={DollarSign}
          currency="USD"
        />
        <StatCard
          title="Total Fees"
          value={stats.totalFees}
          icon={TrendingUp}
          currency="USD"
        />
        <StatCard
          title="Completed"
          value={stats.completedCount}
          icon={CheckCircle}
          formatType="text"
        />
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white/20 dark:bg-slate-800/20 backdrop-blur-xl border border-white/40 dark:border-slate-700/40 rounded-2xl shadow-xl p-6 ring-1 ring-white/10 dark:ring-slate-700/10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white/30 dark:bg-slate-700/30 backdrop-blur-md border border-white/40 dark:border-slate-600/40 rounded-xl pl-10 pr-4 py-2 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  placeholder="Search topups..."
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full bg-white/30 dark:bg-slate-700/30 backdrop-blur-md border border-white/40 dark:border-slate-600/40 rounded-xl px-4 py-2 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="all">All Status</option>
                {statuses.map(status => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Currency
              </label>
              <select
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                className="w-full bg-white/30 dark:bg-slate-700/30 backdrop-blur-md border border-white/40 dark:border-slate-600/40 rounded-xl px-4 py-2 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="all">All Currencies</option>
                {currencies.map(currency => (
                  <option key={currency} value={currency}>{currency}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Method
              </label>
              <select
                value={selectedMethod}
                onChange={(e) => setSelectedMethod(e.target.value)}
                className="w-full bg-white/30 dark:bg-slate-700/30 backdrop-blur-md border border-white/40 dark:border-slate-600/40 rounded-xl px-4 py-2 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="all">All Methods</option>
                {topUpMethods.map(method => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Date Range
              </label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="bg-white/30 dark:bg-slate-700/30 backdrop-blur-md border border-white/40 dark:border-slate-600/40 rounded-xl px-4 py-2 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last Month</option>
                <option value="quarter">Last 3 Months</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-white/30 dark:bg-slate-700/30 backdrop-blur-md border border-white/40 dark:border-slate-600/40 rounded-xl px-4 py-2 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="amount_high">Amount (High to Low)</option>
                <option value="amount_low">Amount (Low to High)</option>
                <option value="status">Status</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedStatus('all');
                  setSelectedCurrency('all');
                  setSelectedMethod('all');
                  setDateRange('all');
                  setSortBy('newest');
                  setCurrentPage(1);
                }}
                className="bg-gray-500/80 dark:bg-slate-600/80 backdrop-blur-md border border-gray-400/50 dark:border-slate-500/50 text-white px-4 py-2 rounded-xl hover:bg-gray-600/80 dark:hover:bg-slate-500/80 transition-all duration-300"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <div className="bg-white/20 dark:bg-slate-800/20 backdrop-blur-xl border border-white/40 dark:border-slate-700/40 rounded-2xl shadow-xl p-6 ring-1 ring-white/10 dark:ring-slate-700/10">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-4">Create New TopUp</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Bank Account *
                </label>
                <select
                  name="bankAccount"
                  value={formData.bankAccount}
                  onChange={handleInputChange}
                  className="w-full bg-white/30 dark:bg-slate-700/30 backdrop-blur-md border border-white/40 dark:border-slate-600/40 rounded-xl px-4 py-2 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
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
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  TopUp Method *
                </label>
                <select
                  name="topUpMethod"
                  value={formData.topUpMethod}
                  onChange={handleInputChange}
                  className="w-full bg-white/30 dark:bg-slate-700/30 backdrop-blur-md border border-white/40 dark:border-slate-600/40 rounded-xl px-4 py-2 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
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
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Amount *
                </label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  className="w-full bg-white/30 dark:bg-slate-700/30 backdrop-blur-md border border-white/40 dark:border-slate-600/40 rounded-xl px-4 py-2 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  placeholder="100"
                  step="0.01"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Currency *
                </label>
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleInputChange}
                  className="w-full bg-white/30 dark:bg-slate-700/30 backdrop-blur-md border border-white/40 dark:border-slate-600/40 rounded-xl px-4 py-2 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
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
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Fee *
                  {predictedFee && typeof predictedFee === 'number' && !isNaN(predictedFee) && (
                    <span className="text-green-600 dark:text-green-400 text-xs ml-2">
                      (Predicted: {formatRate(predictedFee, formData.currency)})
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  name="userInputFee"
                  value={formData.userInputFee}
                  onChange={handleInputChange}
                  className="w-full bg-white/30 dark:bg-slate-700/30 backdrop-blur-md border border-white/40 dark:border-slate-600/40 rounded-xl px-4 py-2 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  placeholder="5.26"
                  step="0.01"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Card Type
              </label>
              <select
                name="cardType"
                value={formData.cardType}
                onChange={handleInputChange}
                className="w-full bg-white/30 dark:bg-slate-700/30 backdrop-blur-md border border-white/40 dark:border-slate-600/40 rounded-xl px-4 py-2 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
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
                className="bg-gray-500/80 dark:bg-slate-600/80 backdrop-blur-md border border-gray-400/50 dark:border-slate-500/50 text-white px-4 py-2 rounded-xl hover:bg-gray-600/80 dark:hover:bg-slate-500/80 transition-all duration-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Pagination Info */}
      {totalCount > 0 && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-600 dark:text-slate-400">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} topups
          </p>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-slate-400">
              Per page:
            </label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white/30 dark:bg-slate-700/30 backdrop-blur-md border border-white/40 dark:border-slate-600/40 rounded-lg px-2 py-1 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      )}

      {/* TopUps List */}
      <div className="space-y-4">
        {topups.map((topup) => (
          <div
            key={topup._id}
            className="bg-white/20 dark:bg-slate-800/20 backdrop-blur-xl border border-white/40 dark:border-slate-700/40 rounded-2xl shadow-xl p-6 ring-1 ring-white/10 dark:ring-slate-700/10 hover:bg-white/25 dark:hover:bg-slate-700/25 transition-all duration-300"
          >
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  {getMethodIcon(topup.topUpMethod)}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                      {formatRate(topup.amount, topup.currency)}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-slate-400">
                      ID: {topup.topUpId}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(topup.status)}
                    <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                      topup.status === 'completed' 
                        ? 'bg-green-100/60 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                        : topup.status === 'failed'
                        ? 'bg-red-100/60 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                        : topup.status === 'processing'
                        ? 'bg-blue-100/60 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                        : 'bg-yellow-100/60 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                    }`}>
                      {topup.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-slate-400">Account:</span>
                    <p className="font-medium text-gray-900 dark:text-slate-100">
                      {topup.bankAccount?.name || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-slate-400">Method:</span>
                    <p className="font-medium text-gray-900 dark:text-slate-100">
                      {topUpMethods.find(m => m.value === topup.topUpMethod)?.label || topup.topUpMethod}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-slate-400">Fee:</span>
                    <p className="font-medium text-gray-900 dark:text-slate-100">
                      {formatRate(topup.feeDetails?.userInputFee || topup.fee, topup.currency)}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-slate-400">Date:</span>
                    <p className="font-medium text-gray-900 dark:text-slate-100">
                      {new Date(topup.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => openTopUpDetail(topup)}
                  className="flex items-center gap-1 bg-blue-100/60 dark:bg-blue-900/30 backdrop-blur-md text-blue-700 dark:text-blue-300 px-3 py-1 rounded-lg hover:bg-blue-200/60 dark:hover:bg-blue-800/40 transition-all duration-300 text-sm"
                >
                  <Eye className="w-3 h-3" />
                  View Details
                </button>

                {topup.status === 'pending' && (
                  <>
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
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 pt-6">
          <button
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="flex items-center gap-1 bg-white/20 dark:bg-slate-800/20 backdrop-blur-xl border border-white/40 dark:border-slate-700/40 rounded-lg px-3 py-2 text-gray-900 dark:text-slate-100 hover:bg-white/30 dark:hover:bg-slate-700/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          <div className="flex gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const startPage = Math.max(1, currentPage - 2);
              const pageNumber = startPage + i;
              
              if (pageNumber > totalPages) return null;
              
              return (
                <button
                  key={pageNumber}
                  onClick={() => setCurrentPage(pageNumber)}
                  className={`w-10 h-10 rounded-lg transition-all duration-300 ${
                    currentPage === pageNumber
                      ? 'bg-blue-500/80 text-white border border-blue-400/50'
                      : 'bg-white/20 dark:bg-slate-800/20 text-gray-900 dark:text-slate-100 border border-white/40 dark:border-slate-700/40 hover:bg-white/30 dark:hover:bg-slate-700/30'
                  }`}
                >
                  {pageNumber}
                </button>
              );
            })}
          </div>
          
          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1 bg-white/20 dark:bg-slate-800/20 backdrop-blur-xl border border-white/40 dark:border-slate-700/40 rounded-lg px-3 py-2 text-gray-900 dark:text-slate-100 hover:bg-white/30 dark:hover:bg-slate-700/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}

      {/* Empty State */}
      {topups.length === 0 && !loading && (
        <div className="text-center py-12">
          <ArrowUpCircle className="w-16 h-16 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">
            {searchTerm || selectedStatus !== 'all' || selectedCurrency !== 'all' || selectedMethod !== 'all' || dateRange !== 'all'
              ? 'No topups match your filters'
              : 'No topups found'
            }
          </h3>
          <p className="text-gray-600 dark:text-slate-400 mb-4">
            {searchTerm || selectedStatus !== 'all' || selectedCurrency !== 'all' || selectedMethod !== 'all' || dateRange !== 'all'
              ? 'Try adjusting your search criteria or filters.'
              : 'Get started by creating your first topup.'
            }
          </p>
          {(!searchTerm && selectedStatus === 'all' && selectedCurrency === 'all' && selectedMethod === 'all' && dateRange === 'all') && (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 bg-blue-500/80 backdrop-blur-md border border-blue-400/50 text-white px-4 py-2 rounded-xl hover:bg-blue-600/80 transition-all duration-300"
            >
              <Plus className="w-4 h-4" />
              Create First TopUp
            </button>
          )}
        </div>
      )}

      {/* TopUp Detail Modal */}
      {showDetailModal && selectedTopUp && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-white/40 dark:border-slate-700/40 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">TopUp Details</h2>
                  <p className="text-gray-600 dark:text-slate-400 mt-1">ID: {selectedTopUp.topUpId}</p>
                </div>
                <button
                  onClick={closeTopUpDetail}
                  className="text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* TopUp Overview */}
                <div className="bg-white/20 dark:bg-slate-700/20 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-3">TopUp Overview</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-gray-600 dark:text-slate-400 text-sm">Amount:</span>
                      <p className="font-semibold text-gray-900 dark:text-slate-100">
                        {formatRate(selectedTopUp.amount, selectedTopUp.currency)}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-slate-400 text-sm">Status:</span>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusIcon(selectedTopUp.status)}
                        <span className="font-semibold text-gray-900 dark:text-slate-100">
                          {selectedTopUp.status}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-slate-400 text-sm">Method:</span>
                      <div className="flex items-center gap-2 mt-1">
                        {getMethodIcon(selectedTopUp.topUpMethod)}
                        <span className="font-semibold text-gray-900 dark:text-slate-100">
                          {topUpMethods.find(m => m.value === selectedTopUp.topUpMethod)?.label || selectedTopUp.topUpMethod}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-slate-400 text-sm">Fee:</span>
                      <p className="font-semibold text-gray-900 dark:text-slate-100">
                        {formatRate(selectedTopUp.feeDetails?.userInputFee || selectedTopUp.fee, selectedTopUp.currency)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Account Information */}
                <div className="bg-white/20 dark:bg-slate-700/20 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-3">Account Information</h3>
                  <div>
                    <span className="text-gray-600 dark:text-slate-400 text-sm">Target Account:</span>
                    <p className="font-semibold text-gray-900 dark:text-slate-100">
                      {selectedTopUp.bankAccount?.name || 'N/A'}
                    </p>
                    {selectedTopUp.bankAccount?.accountNumber && (
                      <p className="text-gray-600 dark:text-slate-400 text-sm">
                        {selectedTopUp.bankAccount.accountNumber}
                      </p>
                    )}
                  </div>
                </div>

                {/* Source Details */}
                {selectedTopUp.sourceDetails && Object.keys(selectedTopUp.sourceDetails).length > 0 && (
                  <div className="bg-white/20 dark:bg-slate-700/20 rounded-xl p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-3">Source Details</h3>
                    <div className="space-y-2">
                      {selectedTopUp.sourceDetails.cardType && (
                        <div>
                          <span className="text-gray-600 dark:text-slate-400 text-sm">Card Type:</span>
                          <p className="font-semibold text-gray-900 dark:text-slate-100 capitalize">
                            {selectedTopUp.sourceDetails.cardType}
                          </p>
                        </div>
                      )}
                      {selectedTopUp.sourceDetails.referenceNumber && (
                        <div>
                          <span className="text-gray-600 dark:text-slate-400 text-sm">Reference:</span>
                          <p className="font-semibold text-gray-900 dark:text-slate-100">
                            {selectedTopUp.sourceDetails.referenceNumber}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Timeline */}
                <div className="bg-white/20 dark:bg-slate-700/20 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-3">Timeline</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-gray-600 dark:text-slate-400" />
                      <div>
                        <span className="text-gray-600 dark:text-slate-400 text-sm">Created:</span>
                        <p className="font-semibold text-gray-900 dark:text-slate-100">
                          {new Date(selectedTopUp.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {selectedTopUp.completedAt && (
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <div>
                          <span className="text-gray-600 dark:text-slate-400 text-sm">Completed:</span>
                          <p className="font-semibold text-gray-900 dark:text-slate-100">
                            {new Date(selectedTopUp.completedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}
                    {selectedTopUp.failedAt && (
                      <div className="flex items-center gap-3">
                        <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                        <div>
                          <span className="text-gray-600 dark:text-slate-400 text-sm">Failed:</span>
                          <p className="font-semibold text-gray-900 dark:text-slate-100">
                            {new Date(selectedTopUp.failedAt).toLocaleString()}
                          </p>
                          {selectedTopUp.failureReason && (
                            <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                              Reason: {selectedTopUp.failureReason}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                {selectedTopUp.description && (
                  <div className="bg-white/20 dark:bg-slate-700/20 rounded-xl p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-3">Description</h3>
                    <p className="text-gray-900 dark:text-slate-100">
                      {selectedTopUp.description}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={closeTopUpDetail}
                  className="bg-gray-500/80 dark:bg-slate-600/80 backdrop-blur-md border border-gray-400/50 dark:border-slate-500/50 text-white px-4 py-2 rounded-xl hover:bg-gray-600/80 dark:hover:bg-slate-500/80 transition-all duration-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    );
  } catch (renderError) {
    console.error('Render error in TopUps component:', renderError);
    // Set error state to show error boundary
    setTimeout(() => setHasRenderError(true), 0);
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">TopUps</h1>
        </div>
        <Alert 
          message="Something went wrong while loading the TopUps page. Please refresh and try again." 
          type="error" 
        />
      </div>
    );
  }
};

export default TopUps;