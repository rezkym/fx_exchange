import { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Target, RefreshCw, BarChart3, PieChart } from 'lucide-react';
import { 
  getTopUpAnalyticsSummary, 
  getTopUpAnalyticsFees, 
  getTopUpOptimization,
  predictTopUpFee 
} from '../services/api';
import { showToast } from '../utils/notifications';
import { formatRate } from '../utils/format';
import StatCard from '../components/StatCard';
import Alert from '../components/Alert';
import Chart from '../components/Chart';

const Analytics = () => {
  const [summary, setSummary] = useState(null);
  const [feeAnalytics, setFeeAnalytics] = useState(null);
  const [optimization, setOptimization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [predictionForm, setPredictionForm] = useState({
    amount: '100',
    currency: 'USD',
    topUpMethod: 'debit_card_idr'
  });
  const [predictedFee, setPredictedFee] = useState(null);
  const [predictionLoading, setPredictionLoading] = useState(false);

  const topUpMethods = [
    { value: 'debit_card_idr', label: 'Debit Card IDR' },
    { value: 'bank_transfer_idr', label: 'Bank Transfer IDR' },
    { value: 'third_party_purchase', label: 'Third Party Purchase' },
    { value: 'multi_step_routing', label: 'Multi-Step Routing' }
  ];

  const currencies = ['USD', 'EUR', 'GBP', 'IDR', 'SGD', 'AUD'];

  useEffect(() => {
    Promise.all([fetchSummary(), fetchFeeAnalytics(), fetchOptimization()]);
  }, []);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const response = await getTopUpAnalyticsSummary();
      if (response.success) {
        setSummary(response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch analytics summary');
      }
      setError(null);
    } catch (err) {
      setError(err.message);
      showToast.error('Failed to load analytics summary');
      setSummary({
        totalTopUps: 0,
        totalVolume: 0,
        averageFee: 0,
        successRate: 0,
        mostUsedMethod: 'N/A',
        monthlyTrend: []
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchFeeAnalytics = async () => {
    try {
      const response = await getTopUpAnalyticsFees();
      if (response.success) {
        setFeeAnalytics(response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch fee analytics');
      }
    } catch (err) {
      console.error('Failed to load fee analytics:', err);
      setFeeAnalytics({
        feesByMethod: [],
        feesByCurrency: []
      });
    }
  };

  const fetchOptimization = async () => {
    try {
      const response = await getTopUpOptimization();
      if (response.success) {
        setOptimization(response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch optimization data');
      }
    } catch (err) {
      console.error('Failed to load optimization data:', err);
      setOptimization({
        recommendations: [],
        bestMethods: []
      });
    }
  };

  const handlePredictFee = async () => {
    if (!predictionForm.amount || !predictionForm.currency || !predictionForm.topUpMethod) {
      showToast.warning('Please fill all fields for fee prediction');
      return;
    }

    try {
      setPredictionLoading(true);
      const response = await predictTopUpFee({
        amount: predictionForm.amount,
        currency: predictionForm.currency,
        topUpMethod: predictionForm.topUpMethod
      });
      
      if (response.success) {
        setPredictedFee(response.data.predictedFee);
      } else {
        throw new Error(response.message || 'Failed to predict fee');
      }
    } catch (err) {
      showToast.error('Failed to predict fee');
    } finally {
      setPredictionLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPredictionForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRefresh = () => {
    fetchSummary();
    fetchFeeAnalytics();
    fetchOptimization();
  };

  if (loading && !summary) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Analytics & Insights</h1>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics & Insights</h1>
          <p className="text-gray-600 mt-1">Fee analytics, trends, and optimization recommendations</p>
        </div>
        <button
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-xl border border-white/40 rounded-xl px-4 py-2 text-gray-900 hover:bg-white/30 transition-all duration-300 shadow-lg"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Data
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

      {/* Summary Statistics */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <StatCard
            title="Total TopUps"
            value={summary.totalTopUps}
            icon={TrendingUp}
            formatType="text"
          />
          <StatCard
            title="Total Volume"
            value={summary.totalVolume}
            icon={DollarSign}
            currency="USD"
          />
          <StatCard
            title="Average Fee"
            value={summary.averageFee}
            icon={Target}
            currency="USD"
          />
          <StatCard
            title="Success Rate"
            value={`${summary.successRate}%`}
            icon={TrendingUp}
            formatType="text"
          />
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Monthly Trend Chart */}
        <div className="bg-white/20 backdrop-blur-xl border border-white/40 rounded-2xl shadow-xl p-6 ring-1 ring-white/10">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Monthly Volume Trend
          </h2>
          {summary?.monthlyTrend && summary.monthlyTrend.length > 0 ? (
            <Chart 
              data={summary.monthlyTrend.map(item => ({
                time: item.month,
                value: item.volume,
                target: 'Volume'
              }))} 
              loading={false}
            />
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No trend data available
            </div>
          )}
        </div>

        {/* Fee Prediction Tool */}
        <div className="bg-white/20 backdrop-blur-xl border border-white/40 rounded-2xl shadow-xl p-6 ring-1 ring-white/10">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5" />
            Fee Predictor
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
              <input
                type="number"
                name="amount"
                value={predictionForm.amount}
                onChange={handleInputChange}
                className="w-full bg-white/30 backdrop-blur-md border border-white/40 rounded-xl px-4 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                placeholder="100"
                step="0.01"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                <select
                  name="currency"
                  value={predictionForm.currency}
                  onChange={handleInputChange}
                  className="w-full bg-white/30 backdrop-blur-md border border-white/40 rounded-xl px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  {currencies.map(currency => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Method</label>
                <select
                  name="topUpMethod"
                  value={predictionForm.topUpMethod}
                  onChange={handleInputChange}
                  className="w-full bg-white/30 backdrop-blur-md border border-white/40 rounded-xl px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  {topUpMethods.map(method => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={handlePredictFee}
              disabled={predictionLoading}
              className="w-full bg-blue-500/80 backdrop-blur-md border border-blue-400/50 text-white px-4 py-2 rounded-xl hover:bg-blue-600/80 transition-all duration-300 disabled:opacity-50"
            >
              {predictionLoading ? 'Predicting...' : 'Predict Fee'}
            </button>
            {predictedFee !== null && (
              <div className="bg-green-100/60 backdrop-blur-md border border-green-200/50 rounded-xl p-4">
                <p className="text-sm text-green-800">
                  Predicted Fee: <span className="font-bold">{formatRate(predictedFee, predictionForm.currency)}</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fee Analytics */}
      {feeAnalytics && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-white/20 backdrop-blur-xl border border-white/40 rounded-2xl shadow-xl p-6 ring-1 ring-white/10">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Fees by Method
            </h2>
            <div className="space-y-3">
              {feeAnalytics.feesByMethod?.map((method, index) => (
                <div key={index} className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-900">
                      {topUpMethods.find(m => m.value === method.method)?.label || method.method}
                    </span>
                    <span className="text-sm text-gray-700">
                      {formatRate(method.averageFee, 'USD')} avg
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {method.transactions} transactions
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/20 backdrop-blur-xl border border-white/40 rounded-2xl shadow-xl p-6 ring-1 ring-white/10">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Fees by Currency
            </h2>
            <div className="space-y-3">
              {feeAnalytics.feesByCurrency?.map((currency, index) => (
                <div key={index} className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-900">
                      {currency.currency}
                    </span>
                    <span className="text-sm text-gray-700">
                      {formatRate(currency.averageFee, 'USD')} avg
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {currency.transactions} transactions
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Optimization Recommendations */}
      {optimization && (
        <div className="bg-white/20 backdrop-blur-xl border border-white/40 rounded-2xl shadow-xl p-6 ring-1 ring-white/10">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5" />
            Optimization Recommendations
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {optimization.recommendations?.map((rec, index) => (
              <div key={index} className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">{rec.title}</h3>
                <p className="text-sm text-gray-700 mb-3">{rec.description}</p>
                {rec.potentialSaving > 0 && (
                  <div className="bg-green-100/60 backdrop-blur-md border border-green-200/50 rounded-lg p-2">
                    <span className="text-xs text-green-800 font-medium">
                      Potential Saving: {formatRate(rec.potentialSaving, 'USD')}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Best Methods */}
      {optimization?.bestMethods && (
        <div className="bg-white/20 backdrop-blur-xl border border-white/40 rounded-2xl shadow-xl p-6 ring-1 ring-white/10">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Best Methods by Currency
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {optimization.bestMethods.map((method, index) => (
              <div key={index} className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 text-center">
                <div className="text-lg font-bold text-gray-900 mb-1">{method.currency}</div>
                <div className="text-sm text-gray-700 mb-2">
                  {topUpMethods.find(m => m.value === method.method)?.label || method.method}
                </div>
                <div className="text-xs text-green-600 font-medium">
                  Avg Fee: {formatRate(method.avgFee, 'USD')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
