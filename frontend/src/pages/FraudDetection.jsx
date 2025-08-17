import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, Activity, RefreshCw, Eye } from 'lucide-react';
import { getFraudDetectionStatus, getFraudDetectionAlerts, getBankAccounts } from '../services/api';
import { showToast, showAlert } from '../utils/notifications';
import StatCard from '../components/StatCard';
import Alert from '../components/Alert';

const FraudDetection = () => {
  const [accounts, setAccounts] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [fraudStatus, setFraudStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);

  useEffect(() => {
    Promise.all([fetchAccounts(), fetchAlerts()]);
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      fetchFraudStatus(selectedAccount);
    }
  }, [selectedAccount]);

  const fetchAccounts = async () => {
    try {
      const response = await getBankAccounts();
      if (response.success) {
        setAccounts(response.data);
        if (response.data.length > 0) {
          setSelectedAccount(response.data[0]._id);
        }
      }
    } catch (err) {
      console.error('Failed to load accounts:', err);
    }
  };

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const response = await getFraudDetectionAlerts();
      if (response.success) {
        setAlerts(response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch alerts');
      }
      setError(null);
    } catch (err) {
      setError(err.message);
      showToast.error('Failed to load fraud alerts');
    } finally {
      setLoading(false);
    }
  };

  const fetchFraudStatus = async (accountId) => {
    try {
      setStatusLoading(true);
      const response = await getFraudDetectionStatus(accountId);
      if (response.success) {
        setFraudStatus(response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch fraud status');
      }
    } catch (err) {
      console.error('Failed to load fraud status:', err);
      setFraudStatus({
        currentRiskLevel: 'unknown',
        dailyStats: {
          replacements: 0,
          creations: 0
        },
        recommendations: ['Unable to fetch current status']
      });
    } finally {
      setStatusLoading(false);
    }
  };

  const handleRefreshAlerts = () => {
    fetchAlerts();
  };

  const handleRefreshStatus = () => {
    if (selectedAccount) {
      fetchFraudStatus(selectedAccount);
    }
  };

  const handleViewAlert = (alert) => {
    const account = accounts.find(acc => acc._id === alert.accountId);
    showAlert.warning(
      `Fraud Alert: ${alert.type}`,
      `Account: ${account?.name || 'Unknown'}\nSeverity: ${alert.severity}\nMessage: ${alert.message}\nStatus: ${alert.status}\nDate: ${new Date(alert.createdAt).toLocaleString()}`
    );
  };

  const getRiskLevelColor = (level) => {
    switch (level) {
      case 'high': return 'red';
      case 'medium': return 'yellow';
      case 'low': return 'green';
      default: return 'gray';
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'red';
      case 'medium': return 'yellow';
      case 'low': return 'blue';
      default: return 'gray';
    }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'suspicious_activity': return AlertTriangle;
      case 'unusual_pattern': return Activity;
      default: return Shield;
    }
  };

  const getAlertStats = () => {
    const activeAlerts = alerts.filter(alert => alert.status === 'active').length;
    const resolvedAlerts = alerts.filter(alert => alert.status === 'resolved').length;
    const highSeverityAlerts = alerts.filter(alert => alert.severity === 'high').length;
    const totalAlerts = alerts.length;

    return { activeAlerts, resolvedAlerts, highSeverityAlerts, totalAlerts };
  };

  if (loading && alerts.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Fraud Detection</h1>
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

  const stats = getAlertStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fraud Detection</h1>
          <p className="text-gray-600 mt-1">Monitor and manage fraud detection across your accounts</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefreshAlerts}
            className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-xl border border-white/40 rounded-xl px-4 py-2 text-gray-900 hover:bg-white/30 transition-all duration-300 shadow-lg"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Alerts
          </button>
          <button
            onClick={handleRefreshStatus}
            className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-xl border border-white/40 rounded-xl px-4 py-2 text-gray-900 hover:bg-white/30 transition-all duration-300 shadow-lg"
          >
            <Shield className="w-4 h-4" />
            Refresh Status
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
          title="Active Alerts"
          value={stats.activeAlerts}
          icon={AlertTriangle}
          formatType="text"
        />
        <StatCard
          title="Resolved Alerts"
          value={stats.resolvedAlerts}
          icon={CheckCircle}
          formatType="text"
        />
        <StatCard
          title="High Severity"
          value={stats.highSeverityAlerts}
          icon={AlertTriangle}
          formatType="text"
        />
        <StatCard
          title="Total Alerts"
          value={stats.totalAlerts}
          icon={Shield}
          formatType="text"
        />
      </div>

      {/* Account Status Section */}
      <div className="bg-white/20 backdrop-blur-xl border border-white/40 rounded-2xl shadow-xl p-6 ring-1 ring-white/10">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Account Fraud Status
        </h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Account
          </label>
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="w-full md:w-1/2 bg-white/30 backdrop-blur-md border border-white/40 rounded-xl px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="">Select an account</option>
            {accounts.map(account => (
              <option key={account._id} value={account._id}>
                {account.name} ({account.currency})
              </option>
            ))}
          </select>
        </div>

        {statusLoading ? (
          <div className="animate-pulse">
            <div className="h-4 bg-white/30 rounded w-1/3 mb-2"></div>
            <div className="h-6 bg-white/30 rounded w-1/2 mb-4"></div>
            <div className="h-4 bg-white/30 rounded w-2/3"></div>
          </div>
        ) : fraudStatus && selectedAccount ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Risk Level</h3>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-lg text-sm font-medium bg-${getRiskLevelColor(fraudStatus.currentRiskLevel)}-100/60 text-${getRiskLevelColor(fraudStatus.currentRiskLevel)}-800`}>
                  {fraudStatus.currentRiskLevel?.toUpperCase()}
                </span>
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Daily Activity</h3>
              <div className="space-y-1 text-sm text-gray-900">
                <div>Card Replacements: {fraudStatus.dailyStats?.replacements || 0}</div>
                <div>Card Creations: {fraudStatus.dailyStats?.creations || 0}</div>
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Recommendations</h3>
              <div className="space-y-1">
                {fraudStatus.recommendations?.map((rec, index) => (
                  <div key={index} className="text-sm text-gray-900">• {rec}</div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-600">
            Select an account to view fraud detection status
          </div>
        )}
      </div>

      {/* Alerts Section */}
      <div className="bg-white/20 backdrop-blur-xl border border-white/40 rounded-2xl shadow-xl p-6 ring-1 ring-white/10">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Recent Alerts
        </h2>

        {alerts.length > 0 ? (
          <div className="space-y-4">
            {alerts.map((alert) => {
              const AlertIcon = getAlertIcon(alert.type);
              const account = accounts.find(acc => acc._id === alert.accountId);
              
              return (
                <div
                  key={alert._id}
                  className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 hover:bg-white/15 transition-all duration-300"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <AlertIcon className={`w-5 h-5 text-${getSeverityColor(alert.severity)}-600 mt-1`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-medium text-gray-900">
                            {alert.type?.replace('_', ' ').toUpperCase()}
                          </h3>
                          <span className={`px-2 py-1 rounded text-xs font-medium bg-${getSeverityColor(alert.severity)}-100/60 text-${getSeverityColor(alert.severity)}-800`}>
                            {alert.severity}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            alert.status === 'active' 
                              ? 'bg-red-100/60 text-red-800' 
                              : 'bg-green-100/60 text-green-800'
                          }`}>
                            {alert.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{alert.message}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-600">
                          <span>Account: {account?.name || 'Unknown'}</span>
                          <span>Date: {new Date(alert.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleViewAlert(alert)}
                      className="flex items-center gap-1 bg-blue-100/60 backdrop-blur-md text-blue-700 px-3 py-1 rounded-lg hover:bg-blue-200/60 transition-all duration-300 text-sm"
                    >
                      <Eye className="w-3 h-3" />
                      View
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <Shield className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-gray-900 mb-1">No alerts found</h3>
            <p className="text-xs text-gray-600">Your accounts are currently secure</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FraudDetection;
