import { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  RefreshCw, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ArrowLeftRight,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { getTransactions } from '../services/api';
import { showToast } from '../utils/notifications';
import { formatRate } from '../utils/format';
import StatCard from '../components/StatCard';
import Alert from '../components/Alert';

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCurrency, setSelectedCurrency] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [transactions, searchTerm, selectedStatus, selectedCurrency, dateRange, sortBy]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await getTransactions();
      if (response.success) {
        setTransactions(response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch transactions');
      }
      setError(null);
    } catch (err) {
      setError(err.message);
      showToast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(transaction => 
        transaction.transactionId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.fromAccount?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.toAccount?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(transaction => transaction.status === selectedStatus);
    }

    // Currency filter
    if (selectedCurrency !== 'all') {
      filtered = filtered.filter(transaction => 
        transaction.fromCurrency === selectedCurrency || 
        transaction.toCurrency === selectedCurrency
      );
    }

    // Date range filter
    if (dateRange !== 'all') {
      const now = new Date();
      let cutoffDate = new Date();
      
      switch (dateRange) {
        case 'today':
          cutoffDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          cutoffDate.setMonth(now.getMonth() - 3);
          break;
        default:
          cutoffDate = null;
      }

      if (cutoffDate) {
        filtered = filtered.filter(transaction => 
          new Date(transaction.createdAt) >= cutoffDate
        );
      }
    }

    // Sort transactions
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'oldest':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'amount_high':
          return b.amount - a.amount;
        case 'amount_low':
          return a.amount - b.amount;
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });

    setFilteredTransactions(filtered);
  };

  const getTransactionStats = () => {
    const totalAmount = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
    const completedTransactions = transactions.filter(t => t.status === 'completed');
    const pendingTransactions = transactions.filter(t => t.status === 'pending');
    const failedTransactions = transactions.filter(t => t.status === 'failed');
    const totalFees = transactions.reduce((sum, transaction) => sum + (transaction.fee || 0), 0);

    return {
      totalTransactions: transactions.length,
      totalAmount,
      completedCount: completedTransactions.length,
      pendingCount: pendingTransactions.length,
      failedCount: failedTransactions.length,
      totalFees
    };
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'processing':
        return <AlertCircle className="w-4 h-4 text-blue-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTransactionTypeIcon = (transaction) => {
    if (transaction.fromAccount && transaction.toAccount) {
      return <ArrowLeftRight className="w-4 h-4 text-blue-600" />;
    } else if (transaction.toAccount) {
      return <ArrowDownLeft className="w-4 h-4 text-green-600" />;
    } else {
      return <ArrowUpRight className="w-4 h-4 text-red-600" />;
    }
  };

  const openTransactionDetail = (transaction) => {
    setSelectedTransaction(transaction);
    setShowDetailModal(true);
  };

  const closeTransactionDetail = () => {
    setSelectedTransaction(null);
    setShowDetailModal(false);
  };

  const exportTransactions = () => {
    // TODO: Implement export functionality
    showToast.info('Export functionality coming soon');
  };

  const uniqueCurrencies = [...new Set(transactions.flatMap(t => [t.fromCurrency, t.toCurrency]))].filter(Boolean);

  if (loading && transactions.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Transactions</h1>
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

  const stats = getTransactionStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Transaction History</h1>
          <p className="text-gray-600 dark:text-slate-400 mt-1">View and manage all your transactions</p>
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
            onClick={exportTransactions}
            className="inline-flex items-center gap-2 bg-white/20 dark:bg-slate-800/20 backdrop-blur-xl border border-white/40 dark:border-slate-700/40 rounded-xl px-4 py-2 text-gray-900 dark:text-slate-100 hover:bg-white/30 dark:hover:bg-slate-700/30 transition-all duration-300 shadow-lg"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={fetchTransactions}
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
          title="Total Transactions"
          value={stats.totalTransactions}
          icon={ArrowLeftRight}
          formatType="text"
        />
        <StatCard
          title="Total Volume"
          value={stats.totalAmount}
          icon={DollarSign}
          currency="USD"
        />
        <StatCard
          title="Completed"
          value={stats.completedCount}
          icon={CheckCircle}
          formatType="text"
        />
        <StatCard
          title="Total Fees"
          value={stats.totalFees}
          icon={TrendingUp}
          currency="USD"
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
                  placeholder="Search transactions..."
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
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
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
                {uniqueCurrencies.map(currency => (
                  <option key={currency} value={currency}>{currency}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Date Range
              </label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full bg-white/30 dark:bg-slate-700/30 backdrop-blur-md border border-white/40 dark:border-slate-600/40 rounded-xl px-4 py-2 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last Month</option>
                <option value="quarter">Last 3 Months</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-4">
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
                  setDateRange('all');
                  setSortBy('newest');
                }}
                className="bg-gray-500/80 dark:bg-slate-600/80 backdrop-blur-md border border-gray-400/50 dark:border-slate-500/50 text-white px-4 py-2 rounded-xl hover:bg-gray-600/80 dark:hover:bg-slate-500/80 transition-all duration-300"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transactions List */}
      <div className="space-y-4">
        {filteredTransactions.map((transaction) => (
          <div
            key={transaction._id}
            className="bg-white/20 dark:bg-slate-800/20 backdrop-blur-xl border border-white/40 dark:border-slate-700/40 rounded-2xl shadow-xl p-6 ring-1 ring-white/10 dark:ring-slate-700/10 hover:bg-white/25 dark:hover:bg-slate-700/25 transition-all duration-300"
          >
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  {getTransactionTypeIcon(transaction)}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                      {formatRate(transaction.amount, transaction.fromCurrency)}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-slate-400">
                      ID: {transaction.transactionId}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(transaction.status)}
                    <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                      transaction.status === 'completed' 
                        ? 'bg-green-100/60 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                        : transaction.status === 'failed'
                        ? 'bg-red-100/60 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                        : transaction.status === 'processing'
                        ? 'bg-blue-100/60 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                        : 'bg-yellow-100/60 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                    }`}>
                      {transaction.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-slate-400">From:</span>
                    <p className="font-medium text-gray-900 dark:text-slate-100">
                      {transaction.fromAccount?.name || 'External'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-slate-400">To:</span>
                    <p className="font-medium text-gray-900 dark:text-slate-100">
                      {transaction.toAccount?.name || 'External'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-slate-400">Exchange Rate:</span>
                    <p className="font-medium text-gray-900 dark:text-slate-100">
                      {transaction.exchangeRate || '1:1'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-slate-400">Date:</span>
                    <p className="font-medium text-gray-900 dark:text-slate-100">
                      {new Date(transaction.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {transaction.description && (
                  <div className="mt-3">
                    <span className="text-gray-600 dark:text-slate-400 text-sm">Description:</span>
                    <p className="text-gray-900 dark:text-slate-100 text-sm mt-1">
                      {transaction.description}
                    </p>
                  </div>
                )}
              </div>
              
              <button
                onClick={() => openTransactionDetail(transaction)}
                className="flex items-center gap-1 bg-blue-100/60 dark:bg-blue-900/30 backdrop-blur-md text-blue-700 dark:text-blue-300 px-3 py-1 rounded-lg hover:bg-blue-200/60 dark:hover:bg-blue-800/40 transition-all duration-300 text-sm"
              >
                <Eye className="w-3 h-3" />
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredTransactions.length === 0 && !loading && (
        <div className="text-center py-12">
          <ArrowLeftRight className="w-16 h-16 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">
            {searchTerm || selectedStatus !== 'all' || selectedCurrency !== 'all' || dateRange !== 'all'
              ? 'No transactions match your filters'
              : 'No transactions found'
            }
          </h3>
          <p className="text-gray-600 dark:text-slate-400 mb-4">
            {searchTerm || selectedStatus !== 'all' || selectedCurrency !== 'all' || dateRange !== 'all'
              ? 'Try adjusting your search criteria or filters.'
              : 'Transaction history will appear here once you start using the system.'
            }
          </p>
        </div>
      )}

      {/* Transaction Detail Modal */}
      {showDetailModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-white/40 dark:border-slate-700/40 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Transaction Details</h2>
                  <p className="text-gray-600 dark:text-slate-400 mt-1">ID: {selectedTransaction.transactionId}</p>
                </div>
                <button
                  onClick={closeTransactionDetail}
                  className="text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Transaction Overview */}
                <div className="bg-white/20 dark:bg-slate-700/20 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-3">Transaction Overview</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-gray-600 dark:text-slate-400 text-sm">Amount:</span>
                      <p className="font-semibold text-gray-900 dark:text-slate-100">
                        {formatRate(selectedTransaction.amount, selectedTransaction.fromCurrency)}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-slate-400 text-sm">Status:</span>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusIcon(selectedTransaction.status)}
                        <span className="font-semibold text-gray-900 dark:text-slate-100">
                          {selectedTransaction.status}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-slate-400 text-sm">Exchange Rate:</span>
                      <p className="font-semibold text-gray-900 dark:text-slate-100">
                        {selectedTransaction.exchangeRate}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-slate-400 text-sm">Fee:</span>
                      <p className="font-semibold text-gray-900 dark:text-slate-100">
                        {formatRate(selectedTransaction.fee || 0, selectedTransaction.fromCurrency)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Account Information */}
                <div className="bg-white/20 dark:bg-slate-700/20 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-3">Account Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-gray-600 dark:text-slate-400 text-sm">From Account:</span>
                      <p className="font-semibold text-gray-900 dark:text-slate-100">
                        {selectedTransaction.fromAccount?.name || 'External Account'}
                      </p>
                      {selectedTransaction.fromAccount?.accountNumber && (
                        <p className="text-gray-600 dark:text-slate-400 text-sm">
                          {selectedTransaction.fromAccount.accountNumber}
                        </p>
                      )}
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-slate-400 text-sm">To Account:</span>
                      <p className="font-semibold text-gray-900 dark:text-slate-100">
                        {selectedTransaction.toAccount?.name || 'External Account'}
                      </p>
                      {selectedTransaction.toAccount?.accountNumber && (
                        <p className="text-gray-600 dark:text-slate-400 text-sm">
                          {selectedTransaction.toAccount.accountNumber}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Information */}
                {selectedTransaction.card && (
                  <div className="bg-white/20 dark:bg-slate-700/20 rounded-xl p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-3">Card Used</h3>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-slate-100">
                        {selectedTransaction.card.cardNumber?.replace(/(\d{4})(\d{4})(\d{4})(\d{4})/, '$1****$3****')}
                      </p>
                      <p className="text-gray-600 dark:text-slate-400 text-sm">
                        {selectedTransaction.card.cardName}
                      </p>
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
                          {new Date(selectedTransaction.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {selectedTransaction.completedAt && (
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <div>
                          <span className="text-gray-600 dark:text-slate-400 text-sm">Completed:</span>
                          <p className="font-semibold text-gray-900 dark:text-slate-100">
                            {new Date(selectedTransaction.completedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}
                    {selectedTransaction.failedAt && (
                      <div className="flex items-center gap-3">
                        <XCircle className="w-4 h-4 text-red-600" />
                        <div>
                          <span className="text-gray-600 dark:text-slate-400 text-sm">Failed:</span>
                          <p className="font-semibold text-gray-900 dark:text-slate-100">
                            {new Date(selectedTransaction.failedAt).toLocaleString()}
                          </p>
                          {selectedTransaction.failureReason && (
                            <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                              Reason: {selectedTransaction.failureReason}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={closeTransactionDetail}
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
};

export default Transactions;
