import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, Area, AreaChart } from 'recharts';
import { TrendingUp, DollarSign, Activity, Users } from 'lucide-react';

const AnalyticsCharts = () => {
  const [transactionData, setTransactionData] = useState(null);
  const [topupData, setTopupData] = useState(null);
  const [feeData, setFeeData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Color palettes untuk charts
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];
  const GRADIENT_COLORS = ['#3B82F6', '#1D4ED8'];

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setLoading(true);
        
        // Fetch data from multiple endpoints
        const [transactionRes, topupRes, feeRes] = await Promise.all([
          fetch('/api/transactions/summary'),
          fetch('/api/topups/analytics/summary'),
          fetch('/api/topups/analytics/fees')
        ]);

        if (transactionRes.ok) {
          const transactionResult = await transactionRes.json();
          setTransactionData(transactionResult.data);
        }

        if (topupRes.ok) {
          const topupResult = await topupRes.json();
          setTopupData(topupResult.data);
        }

        if (feeRes.ok) {
          const feeResult = await feeRes.json();
          setFeeData(feeResult.data);
        }

      } catch (error) {
        console.error('Error fetching analytics data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, []);

  // Transform data untuk charts
  const transformStatusData = (byStatus) => {
    return Object.entries(byStatus || {}).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
      percentage: Math.round((count / Object.values(byStatus).reduce((a, b) => a + b, 0)) * 100)
    }));
  };

  const transformMethodData = (byMethod) => {
    return Object.entries(byMethod || {}).map(([method, count]) => ({
      method: method.replace(/_/g, ' ').toUpperCase(),
      count,
      percentage: Math.round((count / Object.values(byMethod).reduce((a, b) => a + b, 0)) * 100)
    }));
  };

  const transformTrendData = (trends) => {
    return (trends || []).map(trend => ({
      date: new Date(trend.date).toLocaleDateString(),
      avgFee: trend.avgFee,
      count: trend.count,
      avgPercentage: trend.avgPercentage
    }));
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white/20 dark:bg-slate-800/30 backdrop-blur-xl border border-white/40 dark:border-slate-600/40 rounded-2xl p-6 h-80">
            <div className="animate-pulse">
              <div className="h-6 bg-white/30 dark:bg-slate-600/30 rounded w-1/3 mb-4"></div>
              <div className="h-64 bg-white/30 dark:bg-slate-600/30 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-white/50 dark:border-slate-600/50 rounded-xl p-3 shadow-lg">
          <p className="text-gray-900 dark:text-slate-100 font-medium">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/20 dark:bg-slate-800/30 backdrop-blur-xl border border-white/40 dark:border-slate-600/40 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-full">
              <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{transactionData?.totalTransactions || 0}</p>
              <p className="text-sm text-gray-600 dark:text-slate-400">Total Transactions</p>
            </div>
          </div>
        </div>

        <div className="bg-white/20 dark:bg-slate-800/30 backdrop-blur-xl border border-white/40 dark:border-slate-600/40 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-full">
              <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{topupData?.totalTopUps || 0}</p>
              <p className="text-sm text-gray-600 dark:text-slate-400">Total TopUps</p>
            </div>
          </div>
        </div>

        <div className="bg-white/20 dark:bg-slate-800/30 backdrop-blur-xl border border-white/40 dark:border-slate-600/40 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/20 rounded-full">
              <DollarSign className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                ${topupData?.totalAmount?.toLocaleString() || 0}
              </p>
              <p className="text-sm text-gray-600 dark:text-slate-400">Total Amount</p>
            </div>
          </div>
        </div>

        <div className="bg-white/20 dark:bg-slate-800/30 backdrop-blur-xl border border-white/40 dark:border-slate-600/40 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-full">
              <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                ${topupData?.averageFee?.toFixed(2) || 0}
              </p>
              <p className="text-sm text-gray-600 dark:text-slate-400">Average Fee</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transaction Status Pie Chart */}
        <div className="bg-white/20 dark:bg-slate-800/30 backdrop-blur-xl border border-white/40 dark:border-slate-600/40 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-200 mb-4">Transaction Status Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={transformStatusData(transactionData?.byStatus)}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name} ${percentage}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {transformStatusData(transactionData?.byStatus).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* TopUp Methods Bar Chart */}
        <div className="bg-white/20 dark:bg-slate-800/30 backdrop-blur-xl border border-white/40 dark:border-slate-600/40 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-200 mb-4">TopUp Methods Usage</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={transformMethodData(topupData?.byMethod)}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="method" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Fee Trends Line Chart */}
        {feeData?.trends && feeData.trends.length > 0 && (
          <div className="bg-white/20 dark:bg-slate-800/30 backdrop-blur-xl border border-white/40 dark:border-slate-600/40 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-200 mb-4">Fee Trends Over Time</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={transformTrendData(feeData.trends)}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="avgFee" 
                  stroke="#10B981" 
                  strokeWidth={3}
                  dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Currency Distribution Area Chart */}
        <div className="bg-white/20 dark:bg-slate-800/30 backdrop-blur-xl border border-white/40 dark:border-slate-600/40 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-200 mb-4">Currency Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={Object.entries(topupData?.byCurrency || {}).map(([currency, count]) => ({
                  name: currency,
                  value: count
                }))}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {Object.entries(topupData?.byCurrency || {}).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Time Patterns if available */}
      {feeData?.timePatterns && feeData.timePatterns.length > 0 && (
        <div className="bg-white/20 dark:bg-slate-800/30 backdrop-blur-xl border border-white/40 dark:border-slate-600/40 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-200 mb-4">Fee Patterns by Hour of Day</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={feeData.timePatterns.map(pattern => ({
              hour: `${pattern._id}:00`,
              avgFee: pattern.avgFee,
              count: pattern.count
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="avgFee" 
                stroke="#8B5CF6" 
                fill="url(#colorGradient)"
                fillOpacity={0.6}
              />
              <defs>
                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                </linearGradient>
              </defs>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default AnalyticsCharts;
