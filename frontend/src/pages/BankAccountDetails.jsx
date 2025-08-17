import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Wallet, CreditCard, TrendingUp, TrendingDown, 
  Activity, DollarSign, PieChart, BarChart3, Clock, 
  AlertTriangle, CheckCircle, XCircle, Minus, Plus,
  RefreshCw, Calendar, Users, Shield, Eye, EyeOff,
  Download, Filter, Settings
} from 'lucide-react';
import { getBankAccountDetails } from '../services/api';
import { showToast } from '../utils/notifications';
import { formatRate } from '../utils/format';
import StatCard from '../components/StatCard';
import RechartsComponent from '../components/RechartsComponent';
import Alert from '../components/Alert';

const BankAccountDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [accountData, setAccountData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState(30);
  const [activeTab, setActiveTab] = useState('overview');
  const [showSensitiveData, setShowSensitiveData] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (id) {
      fetchAccountDetails();
    }
  }, [id, timeRange]);

  const fetchAccountDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getBankAccountDetails(id, timeRange);
      
      if (response.success) {
        setAccountData(response.data);
      } else {
        throw new Error(response.message || 'Gagal mengambil detail akun');
      }
    } catch (err) {
      setError(err.message);
      showToast.error('Gagal memuat detail bank account');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAccountDetails();
    setRefreshing(false);
    showToast.success('Data berhasil diperbarui');
  };

  const formatCurrency = (amount, currency) => {
    return formatRate(amount, currency);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400';
      case 'pending': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'failed': return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
      case 'active': return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400';
      case 'blocked': return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
      case 'expired': return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30 dark:text-gray-400';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const prepareChartData = () => {
    if (!accountData?.monthlyTrends) return [];

    const months = Object.keys(accountData.monthlyTrends).sort();
    
    if (months.length === 0) {
      return [{ month: 'No Data', incoming: 0, outgoing: 0 }];
    }

    return months.map(month => {
      const date = new Date(month + '-01');
      const monthLabel = date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
      
      return {
        month: monthLabel,
        incoming: accountData.monthlyTrends[month].incoming || 0,
        outgoing: accountData.monthlyTrends[month].outgoing || 0
      };
    });
  };

  const prepareCurrencyDistribution = () => {
    if (!accountData?.balanceBreakdown) return [];

    const activeWallets = accountData.balanceBreakdown.filter(wallet => wallet.isActive && wallet.balance > 0);
    
    if (activeWallets.length === 0) {
      return [{ name: 'No Data', value: 1 }];
    }

    return activeWallets.map(wallet => ({
      name: wallet.currency,
      value: wallet.balance
    }));
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-lg"></div>
          <div className="flex-1">
            <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
          ))}
        </div>
        <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/bank-accounts')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold">Detail Bank Account</h1>
        </div>
        <Alert 
          message={error} 
          type="error"
        />
        <div className="flex justify-center">
          <button
            onClick={fetchAccountDetails}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  const { account, analytics, balanceBreakdown, cards, transactions } = accountData || {};

  // Fallback values untuk safety
  const safeAccount = account || {};
  const safeAnalytics = analytics || {
    totalCards: 0,
    activeCards: 0,
    totalTransactions: 0,
    riskMetrics: { averageRiskScore: 0, highRiskCards: 0 },
    recentActivity: [],
    totalVolume: { incoming: 0, outgoing: 0, net: 0 },
    transactionsByStatus: {}
  };
  const safeBalanceBreakdown = balanceBreakdown || [];
  const safeCards = cards || [];
  const safeTransactions = transactions || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/bank-accounts')}
            className="p-2 hover:bg-white/20 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </button>
          <div className="flex items-start gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-500/20 to-purple-500/20 dark:from-blue-600/20 dark:to-purple-600/20 backdrop-blur-xl rounded-2xl border border-white/40 dark:border-slate-600/40 shadow-lg">
              <Wallet className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                {safeAccount.name || 'Loading...'}
              </h1>
              <p className="text-gray-600 dark:text-slate-300 text-lg">
                {safeAccount.provider?.name || 'Unknown Provider'} • {showSensitiveData ? (safeAccount.accountNumber || 'N/A') : `****${(safeAccount.accountNumber || '0000').slice(-4)}`}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  safeAccount.isActive === false 
                    ? 'bg-red-100/60 dark:bg-red-900/40 text-red-700 dark:text-red-200' 
                    : 'bg-green-100/60 dark:bg-green-900/40 text-green-700 dark:text-green-200'
                }`}>
                  {safeAccount.isActive === false ? '🔴 Inactive' : '🟢 Active'}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSensitiveData(!showSensitiveData)}
            className="p-2 hover:bg-white/20 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
            title={showSensitiveData ? "Sembunyikan Data Sensitif" : "Tampilkan Data Sensitif"}
          >
            {showSensitiveData ? (
              <EyeOff className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            ) : (
              <Eye className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            )}
          </button>
          
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value))}
            className="bg-white/30 dark:bg-slate-700/30 backdrop-blur-xl border border-white/50 dark:border-slate-600/50 rounded-xl px-4 py-2 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value={7}>7 Hari</option>
            <option value={30}>30 Hari</option>
            <option value={90}>90 Hari</option>
            <option value={365}>1 Tahun</option>
          </select>
          
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="group inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-4 py-2 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 transform disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Saldo"
          value={accountData?.metadata?.totalWalletBalance || 0}
          icon={DollarSign}
          currency="USD" // Simplified - could be enhanced with multi-currency total
          formatType="currency"
        />
        <StatCard
          title="Total Kartu"
          value={safeAnalytics.totalCards}
          icon={CreditCard}
          formatType="text"
          subtitle={`${safeAnalytics.activeCards} aktif`}
        />
        <StatCard
          title="Transaksi"
          value={safeAnalytics.totalTransactions}
          icon={Activity}
          formatType="text"
          subtitle={`${timeRange} hari terakhir`}
        />
        <StatCard
          title="Tingkat Risiko"
          value={safeAnalytics.riskMetrics.averageRiskScore}
          icon={Shield}
          formatType="percentage"
          subtitle={safeAnalytics.riskMetrics.highRiskCards > 0 ? `${safeAnalytics.riskMetrics.highRiskCards} kartu berisiko` : 'Aman'}
        />
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-white/20 dark:border-gray-700">
        <nav className="flex space-x-8" aria-label="Tabs">
          {[
            { id: 'overview', name: 'Overview', icon: BarChart3 },
            { id: 'wallets', name: 'Dompet Multi-Mata Uang', icon: Wallet },
            { id: 'cards', name: 'Kartu Virtual', icon: CreditCard },
            { id: 'transactions', name: 'Transaksi', icon: Activity },
            { id: 'analytics', name: 'Analytics', icon: TrendingUp }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Balance Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white/25 dark:bg-slate-800/25 backdrop-blur-xl border border-white/50 dark:border-slate-700/40 rounded-3xl shadow-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Distribusi Mata Uang</h3>
                <PieChart className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </div>
              <div className="h-64">
                <RechartsComponent 
                  type="doughnut" 
                  data={prepareCurrencyDistribution()}
                  className="w-full h-64"
                />
              </div>
            </div>

            <div className="bg-white/25 dark:bg-slate-800/25 backdrop-blur-xl border border-white/50 dark:border-slate-700/40 rounded-3xl shadow-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Tren Transaksi</h3>
                <BarChart3 className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </div>
              <div className="h-64">
                <RechartsComponent 
                  type="line" 
                  data={prepareChartData()}
                  className="w-full h-64"
                />
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white/25 dark:bg-slate-800/25 backdrop-blur-xl border border-white/50 dark:border-slate-700/40 rounded-3xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Aktivitas Terakhir</h3>
              <Clock className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </div>
            <div className="space-y-3">
              {safeAnalytics.recentActivity.length > 0 ? (
                safeAnalytics.recentActivity.slice(0, 5).map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white/10 dark:bg-slate-700/20 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${activity.type === 'incoming' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                        {activity.type === 'incoming' ? (
                          <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                          {activity.type === 'incoming' ? 'Dana Masuk' : 'Dana Keluar'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {activity.description || 'Transfer'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${activity.type === 'incoming' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {activity.type === 'incoming' ? '+' : '-'}{formatCurrency(activity.amount, activity.currency)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(activity.createdAt).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">Belum ada aktivitas</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'wallets' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {safeBalanceBreakdown.map((wallet, index) => (
            <div key={index} className="bg-white/25 dark:bg-slate-800/25 backdrop-blur-xl border border-white/50 dark:border-slate-700/40 rounded-3xl shadow-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{wallet.currency}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {wallet.isActive ? 'Aktif' : 'Tidak Aktif'}
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  wallet.isActive ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400'
                }`}>
                  {wallet.percentage.toFixed(1)}%
                </span>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Saldo:</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-slate-100">
                    {formatCurrency(wallet.balance, wallet.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Dibuka:</span>
                  <span className="text-sm text-gray-900 dark:text-slate-100">
                    {new Date(wallet.openedAt).toLocaleDateString('id-ID')}
                  </span>
                </div>
              </div>
              
              <div className="mt-4 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${wallet.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'cards' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {safeCards.length > 0 ? (
              safeCards.map((card, index) => (
                <div key={index} className="bg-white/25 dark:bg-slate-800/25 backdrop-blur-xl border border-white/50 dark:border-slate-700/40 rounded-3xl shadow-xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                        <CreditCard className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                          {showSensitiveData ? card.cardNumber : `****${card.cardNumber.slice(-4)}`}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{card.cardName}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(card.status)}`}>
                      {card.status.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Expired:</span>
                      <span className="text-sm text-gray-900 dark:text-slate-100">
                        {new Date(card.expiredDate).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Penggunaan:</span>
                      <span className="text-sm text-gray-900 dark:text-slate-100">
                        {card.usageCount} kali
                      </span>
                    </div>
                    {card.fraudFlags && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Risk Score:</span>
                        <span className={`text-sm font-medium ${
                          card.fraudFlags.riskScore > 70 ? 'text-red-600 dark:text-red-400' :
                          card.fraudFlags.riskScore > 30 ? 'text-yellow-600 dark:text-yellow-400' :
                          'text-green-600 dark:text-green-400'
                        }`}>
                          {card.fraudFlags.riskScore}%
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {card.fraudFlags?.isHighRisk && (
                    <div className="mt-4 p-2 bg-red-100/60 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                        <span className="text-xs text-red-700 dark:text-red-300 font-medium">High Risk</span>
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <CreditCard className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">Belum Ada Kartu</h3>
                <p className="text-gray-600 dark:text-gray-400">Kartu virtual akan muncul di sini setelah dibuat</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="bg-white/25 dark:bg-slate-800/25 backdrop-blur-xl border border-white/50 dark:border-slate-700/40 rounded-3xl shadow-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              Riwayat Transaksi ({timeRange} hari terakhir)
            </h3>
            <Filter className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Tanggal</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Jenis</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Deskripsi</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Jumlah</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {safeTransactions.length > 0 ? (
                  safeTransactions.slice(0, 10).map((transaction, index) => {
                    const isIncoming = transaction.toAccount._id === id;
                    return (
                      <tr key={index} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-slate-100">
                          {new Date(transaction.createdAt).toLocaleDateString('id-ID')}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {isIncoming ? (
                              <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                            ) : (
                              <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                            )}
                            <span className="text-sm text-gray-900 dark:text-slate-100">
                              {isIncoming ? 'Masuk' : 'Keluar'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                          {transaction.description || 'Transfer'}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-sm font-medium ${
                            isIncoming ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            {isIncoming ? '+' : '-'}{formatCurrency(
                              isIncoming ? transaction.convertedAmount : transaction.amount, 
                              isIncoming ? transaction.toCurrency : transaction.fromCurrency
                            )}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                            {transaction.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-500 dark:text-gray-400">
                      Belum ada transaksi dalam periode ini
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Transaction Analysis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/25 dark:bg-slate-800/25 backdrop-blur-xl border border-white/50 dark:border-slate-700/40 rounded-3xl shadow-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Analisis Volume</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Total Masuk:</span>
                  <span className="text-green-600 dark:text-green-400 font-semibold">
                    {formatCurrency(safeAnalytics.totalVolume.incoming, 'USD')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Total Keluar:</span>
                  <span className="text-red-600 dark:text-red-400 font-semibold">
                    {formatCurrency(safeAnalytics.totalVolume.outgoing, 'USD')}
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-gray-200 dark:border-gray-700 pt-2">
                  <span className="text-gray-900 dark:text-slate-100 font-medium">Net Flow:</span>
                  <span className={`font-bold ${
                    safeAnalytics.totalVolume.net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {safeAnalytics.totalVolume.net >= 0 ? '+' : ''}{formatCurrency(safeAnalytics.totalVolume.net, 'USD')}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white/25 dark:bg-slate-800/25 backdrop-blur-xl border border-white/50 dark:border-slate-700/40 rounded-3xl shadow-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Status Transaksi</h3>
              <div className="space-y-3">
                {Object.entries(safeAnalytics.transactionsByStatus).map(([status, count]) => (
                  <div key={status} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      {status === 'completed' && <CheckCircle className="w-4 h-4 text-green-500" />}
                      {status === 'pending' && <Clock className="w-4 h-4 text-yellow-500" />}
                      {status === 'failed' && <XCircle className="w-4 h-4 text-red-500" />}
                      <span className="text-gray-600 dark:text-gray-400 capitalize">{status}</span>
                    </div>
                    <span className="text-gray-900 dark:text-slate-100 font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Risk Assessment */}
          <div className="bg-white/25 dark:bg-slate-800/25 backdrop-blur-xl border border-white/50 dark:border-slate-700/40 rounded-3xl shadow-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Penilaian Risiko</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-2">
                  {safeAnalytics.riskMetrics.averageRiskScore.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Risk Score Rata-rata</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600 dark:text-red-400 mb-2">
                  {safeAnalytics.riskMetrics.highRiskCards}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Kartu Berisiko Tinggi</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                  {safeAnalytics.activeCards - safeAnalytics.riskMetrics.highRiskCards}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Kartu Aman</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankAccountDetails;
