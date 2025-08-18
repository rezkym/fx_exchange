import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  CreditCard,
  Globe,
  Building,
  TrendingUp,
  Shield,
  AlertTriangle,
  Eye,
  Trash2,
  BarChart3,
  PieChart
} from 'lucide-react';
import {
  getBinStatistics,
  searchBins,
  getBinLookups,
  deleteBinLookup,
  refreshBinData
} from '../services/api';
import { showToast } from '../utils/notifications';
import { formatDate } from '../utils/format';
import StatCard from '../components/StatCard';
import Chart from '../components/Chart';

const BinAnalytics = () => {
  const { theme } = useTheme();
  const [statistics, setStatistics] = useState(null);
  const [binLookups, setBinLookups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    scheme: '',
    type: '',
    country: '',
    riskLevel: ''
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10
  });

  const fetchStatistics = async () => {
    try {
      const response = await getBinStatistics();
      if (response.success) {
        setStatistics(response.data);
      }
    } catch (error) {
      showToast.error('Failed to fetch BIN statistics');
    }
  };

  const fetchBinLookups = async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pagination.itemsPerPage,
        ...filters
      };

      if (searchTerm) {
        params.search = searchTerm;
      }

      const response = await searchBins(params);
      if (response.success) {
        setBinLookups(response.data);
        setPagination(response.pagination || pagination);
      }
    } catch (error) {
      showToast.error('Failed to fetch BIN lookups');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshBin = async (bin) => {
    try {
      await refreshBinData(bin);
      showToast.success('BIN data refreshed successfully');
      fetchBinLookups(pagination.currentPage);
      fetchStatistics();
    } catch (error) {
      showToast.error('Failed to refresh BIN data');
    }
  };

  const handleDeleteBin = async (id) => {
    if (window.confirm('Are you sure you want to delete this BIN lookup?')) {
      try {
        await deleteBinLookup(id);
        showToast.success('BIN lookup deleted successfully');
        fetchBinLookups(pagination.currentPage);
        fetchStatistics();
      } catch (error) {
        showToast.error('Failed to delete BIN lookup');
      }
    }
  };

  const clearFilters = () => {
    setFilters({
      scheme: '',
      type: '',
      country: '',
      riskLevel: ''
    });
    setSearchTerm('');
  };

  useEffect(() => {
    fetchStatistics();
    fetchBinLookups();
  }, []);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchBinLookups(1);
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, filters]);

  // Prepare chart data
  const schemeChartData = statistics?.byScheme?.map(item => ({
    name: item.scheme || 'Unknown',
    value: item.count,
    lookups: item.lookups
  })) || [];

  const countryChartData = statistics?.byCountry?.slice(0, 10).map(item => ({
    name: item.country,
    value: item.count,
    lookups: item.lookups
  })) || [];

  const typeChartData = statistics?.byType?.map(item => ({
    name: item.type || 'Unknown',
    value: item.count,
    lookups: item.lookups
  })) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              BIN Analytics
            </h1>
            <p className="text-gray-600 dark:text-slate-400">
              Bank Identification Number lookup analytics and insights
            </p>
          </div>
          
          <div className="flex items-center gap-3 mt-4 lg:mt-0">
            <button
              onClick={() => {
                fetchStatistics();
                fetchBinLookups(pagination.currentPage);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-all duration-300"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total BINs"
              value={statistics.summary.totalBins.toLocaleString()}
              icon={CreditCard}
              color="blue"
            />
            <StatCard
              title="Total Lookups"
              value={statistics.summary.totalLookups.toLocaleString()}
              icon={Search}
              color="green"
            />
            <StatCard
              title="Average Lookups/BIN"
              value={statistics.summary.averageLookupsPerBin.toFixed(1)}
              icon={BarChart3}
              color="purple"
            />
            <StatCard
              title="Popular BINs"
              value={statistics.popularBins.length}
              icon={TrendingUp}
              color="orange"
            />
          </div>
        )}

        {/* Charts */}
        {statistics && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/20 dark:bg-slate-700/20 backdrop-blur-md rounded-2xl p-6 border border-white/30 dark:border-slate-600/30">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
                BINs by Scheme
              </h3>
              <Chart
                type="pie"
                data={schemeChartData}
                height={250}
              />
            </div>
            
            <div className="bg-white/20 dark:bg-slate-700/20 backdrop-blur-md rounded-2xl p-6 border border-white/30 dark:border-slate-600/30">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
                BINs by Type
              </h3>
              <Chart
                type="pie"
                data={typeChartData}
                height={250}
              />
            </div>
            
            <div className="bg-white/20 dark:bg-slate-700/20 backdrop-blur-md rounded-2xl p-6 border border-white/30 dark:border-slate-600/30">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
                Top 10 Countries
              </h3>
              <Chart
                type="bar"
                data={countryChartData}
                height={250}
              />
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="bg-white/20 dark:bg-slate-700/20 backdrop-blur-md rounded-2xl p-6 border border-white/30 dark:border-slate-600/30 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search BINs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-600/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <select
                value={filters.scheme}
                onChange={(e) => setFilters({ ...filters, scheme: e.target.value })}
                className="px-3 py-2 bg-white/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-600/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-slate-100"
              >
                <option value="">All Schemes</option>
                <option value="visa">Visa</option>
                <option value="mastercard">Mastercard</option>
                <option value="amex">American Express</option>
                <option value="discover">Discover</option>
              </select>

              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="px-3 py-2 bg-white/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-600/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-slate-100"
              >
                <option value="">All Types</option>
                <option value="debit">Debit</option>
                <option value="credit">Credit</option>
                <option value="prepaid">Prepaid</option>
              </select>

              <select
                value={filters.riskLevel}
                onChange={(e) => setFilters({ ...filters, riskLevel: e.target.value })}
                className="px-3 py-2 bg-white/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-600/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-slate-100"
              >
                <option value="">All Risk Levels</option>
                <option value="low">Low Risk</option>
                <option value="medium">Medium Risk</option>
                <option value="high">High Risk</option>
              </select>

              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-gray-500/20 dark:bg-slate-600/20 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-500/30 dark:hover:bg-slate-600/30 transition-all duration-300"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* BIN Lookups Table */}
        <div className="bg-white/20 dark:bg-slate-700/20 backdrop-blur-md rounded-2xl border border-white/30 dark:border-slate-600/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/10 dark:bg-slate-800/20">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-900 dark:text-slate-100">BIN</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-900 dark:text-slate-100">Scheme</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-900 dark:text-slate-100">Type</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-900 dark:text-slate-100">Country</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-900 dark:text-slate-100">Bank</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-900 dark:text-slate-100">Risk</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-900 dark:text-slate-100">Lookups</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-900 dark:text-slate-100">Last Lookup</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-900 dark:text-slate-100">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 dark:divide-slate-600/20">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="px-6 py-8 text-center text-gray-500 dark:text-slate-400">
                      Loading BIN lookups...
                    </td>
                  </tr>
                ) : binLookups.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-6 py-8 text-center text-gray-500 dark:text-slate-400">
                      No BIN lookups found
                    </td>
                  </tr>
                ) : (
                  binLookups.map((bin) => (
                    <tr key={bin._id} className="hover:bg-white/5 dark:hover:bg-slate-800/20 transition-colors duration-200">
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm text-gray-900 dark:text-slate-100">
                          {bin.bin}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="capitalize text-gray-900 dark:text-slate-100">
                          {bin.scheme || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="capitalize text-gray-900 dark:text-slate-100">
                          {bin.type || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {bin.country?.emoji && <span>{bin.country.emoji}</span>}
                          <span className="text-gray-900 dark:text-slate-100">
                            {bin.country?.name || 'Unknown'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-900 dark:text-slate-100">
                          {bin.bank?.name || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${
                          bin.riskLevel === 'high'
                            ? 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200'
                            : bin.riskLevel === 'medium'
                              ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200'
                              : 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200'
                        }`}>
                          {bin.riskLevel || 'unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-900 dark:text-slate-100">
                          {bin.lookupCount || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-900 dark:text-slate-100">
                          {formatDate(bin.lastLookupAt, 'short')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleRefreshBin(bin.bin)}
                            className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-100/60 dark:hover:bg-blue-900/40 rounded transition-all duration-300"
                            title="Refresh BIN Data"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteBin(bin._id)}
                            className="p-1 text-red-600 dark:text-red-400 hover:bg-red-100/60 dark:hover:bg-red-900/40 rounded transition-all duration-300"
                            title="Delete BIN Lookup"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-white/10 dark:border-slate-600/20">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600 dark:text-slate-400">
                  Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to{' '}
                  {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of{' '}
                  {pagination.totalItems} results
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fetchBinLookups(pagination.currentPage - 1)}
                    disabled={!pagination.hasPrevPage}
                    className="px-3 py-1 bg-white/20 dark:bg-slate-600/20 text-gray-700 dark:text-slate-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/30 dark:hover:bg-slate-600/30 transition-all duration-300"
                  >
                    Previous
                  </button>
                  
                  <span className="px-3 py-1 bg-blue-100/60 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200 rounded">
                    {pagination.currentPage}
                  </span>
                  
                  <button
                    onClick={() => fetchBinLookups(pagination.currentPage + 1)}
                    disabled={!pagination.hasNextPage}
                    className="px-3 py-1 bg-white/20 dark:bg-slate-600/20 text-gray-700 dark:text-slate-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/30 dark:hover:bg-slate-600/30 transition-all duration-300"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BinAnalytics;
