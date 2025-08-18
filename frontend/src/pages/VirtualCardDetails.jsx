import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CreditCard,
  Shield,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle,
  Edit,
  Trash2,
  RefreshCw,
  Eye,
  Calendar,
  MapPin,
  Building,
  Activity,
  BarChart3,
  PieChart,
  Users,
  DollarSign,
  Zap
} from 'lucide-react';
import {
  getCard,
  updateCard,
  deleteCard,
  markCardAsUsed,
  replaceCard,
  getCardsUsageAnalytics,
  getFraudDetectionStatus,
  lookupBin,
  refreshBinData
} from '../services/api';
import { showToast, showAlert } from '../utils/notifications';
import { formatDate, formatCurrency } from '../utils/format';
import StatCard from '../components/StatCard';
import Chart from '../components/Chart';
import Alert from '../components/Alert';
import { useTheme } from '../contexts/ThemeContext';

const VirtualCardDetails = () => {
  const { cardId } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  
  const [card, setCard] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [fraudStatus, setFraudStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const [editFormData, setEditFormData] = useState({
    cardName: '',
    expiredDate: '',
    cvv: '',
    status: '',
    address: {
      street: '',
      city: '',
      state: '',
      country: '',
      postalCode: ''
    },
    useAccountAddress: true
  });

  const cardStatuses = [
    { value: 'active', label: 'Active', color: 'green', icon: CheckCircle },
    { value: 'used', label: 'Used', color: 'blue', icon: CreditCard },
    { value: 'expired', label: 'Expired', color: 'yellow', icon: AlertTriangle },
    { value: 'blocked', label: 'Blocked', color: 'red', icon: AlertTriangle }
  ];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Eye },
    { id: 'bin', label: 'BIN Info', icon: CreditCard },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'transactions', label: 'Transactions', icon: Activity },
    { id: 'fraud', label: 'Security', icon: Shield }
  ];

  useEffect(() => {
    if (cardId) {
      Promise.all([
        fetchCardDetails(),
        fetchUsageAnalytics(),
        fetchFraudStatus()
      ]);
    }
  }, [cardId]);

  const fetchCardDetails = async () => {
    try {
      setLoading(true);
      const response = await getCard(cardId);
      if (response.success) {
        setCard(response.data);
        // Set edit form data
        const cardData = response.data.card;
        setEditFormData({
          cardName: cardData.basicInfo.cardName,
          expiredDate: cardData.basicInfo.expiredDate ? 
            new Date(cardData.basicInfo.expiredDate).toISOString().split('T')[0] : '',
          cvv: '', // Don't prefill CVV for security
          status: cardData.basicInfo.status,
          address: {
            street: cardData.bankAccount?.address?.street || '',
            city: cardData.bankAccount?.address?.city || '',
            state: cardData.bankAccount?.address?.state || '',
            country: cardData.bankAccount?.address?.country || '',
            postalCode: cardData.bankAccount?.address?.postalCode || ''
          },
          useAccountAddress: true
        });
      } else {
        throw new Error(response.message || 'Failed to fetch card details');
      }
      setError(null);
    } catch (err) {
      setError(err.message);
      showToast.error('Failed to load card details');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsageAnalytics = async () => {
    try {
      const response = await getCardsUsageAnalytics({ 
        timeRange: '30d',
        // bankAccount: card?.bankAccount?._id // Will be available after card is loaded
      });
      if (response.success) {
        setAnalytics(response.data);
      }
    } catch (err) {
      console.error('Failed to load usage analytics:', err);
    }
  };

  const fetchFraudStatus = async () => {
    try {
      const response = await getFraudDetectionStatus({
        bankAccount: card?.card?.bankAccount?._id
      });
      if (response.success) {
        setFraudStatus(response.data);
      }
    } catch (err) {
      console.error('Failed to load fraud status:', err);
    }
  };

  const handleEditInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setEditFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setEditFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    
    if (!card) return;

    try {
      setFormLoading(true);
      const response = await updateCard(card.card.basicInfo.id, editFormData);
      
      if (response.success) {
        showToast.success('Card updated successfully');
        setShowEditForm(false);
        fetchCardDetails();
      } else {
        throw new Error(response.message || 'Failed to update card');
      }
    } catch (err) {
      showToast.error(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteCard = async () => {
    if (!card) return;

    const confirmResult = await showAlert.confirm(
      'Delete Card?',
      `Are you sure you want to delete this card? This action cannot be undone.`,
      'Delete',
      'Cancel'
    );

    if (confirmResult.isConfirmed) {
      try {
        setFormLoading(true);
        const response = await deleteCard(card.card.basicInfo.id);
        
        if (response.success) {
          showToast.success('Card deleted successfully');
          navigate('/virtual-cards');
        } else {
          throw new Error(response.message || 'Failed to delete card');
        }
      } catch (err) {
        showToast.error(err.message);
      } finally {
        setFormLoading(false);
      }
    }
  };

  const handleMarkAsUsed = async () => {
    if (!card) return;

    const confirmResult = await showAlert.confirm(
      'Mark Card as Used?',
      `Are you sure you want to mark this card as used? This will change its status and update usage statistics.`,
      'Mark as Used',
      'Cancel'
    );

    if (confirmResult.isConfirmed) {
      try {
        const response = await markCardAsUsed(card.card.basicInfo.id);
        
        if (response.success) {
          showToast.success('Card marked as used successfully');
          fetchCardDetails();
        } else {
          throw new Error(response.message || 'Failed to mark card as used');
        }
      } catch (err) {
        showToast.error(err.message);
      }
    }
  };

  const maskCardNumber = (cardNumber) => {
    if (!cardNumber) return '';
    if (cardNumber.length === 16) {
      return cardNumber.replace(/(\d{4})(\d{4})(\d{4})(\d{4})/, '$1 **** **** $4');
    }
    return cardNumber.replace(/(\d{4}).*(\d{4})/, '$1****$2');
  };

  const getStatusConfig = (status) => {
    return cardStatuses.find(s => s.value === status) || cardStatuses[0];
  };

  const getRiskLevelColor = (level) => {
    switch (level) {
      case 'low': return 'green';
      case 'medium': return 'yellow';
      case 'high': return 'orange';
      case 'critical': return 'red';
      default: return 'gray';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 bg-white/20 dark:bg-slate-700/20 rounded-lg animate-pulse"></div>
          <div>
            <div className="h-8 bg-white/20 dark:bg-slate-700/20 rounded-lg w-64 mb-2 animate-pulse"></div>
            <div className="h-5 bg-white/15 dark:bg-slate-700/15 rounded w-48 animate-pulse"></div>
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white/20 dark:bg-slate-800/20 backdrop-blur-xl border border-white/40 dark:border-slate-700/30 rounded-2xl p-6 animate-pulse">
                <div className="h-6 bg-white/30 dark:bg-slate-600/30 rounded w-32 mb-4"></div>
                <div className="space-y-3">
                  {[1, 2, 3].map(j => (
                    <div key={j} className="h-4 bg-white/20 dark:bg-slate-600/20 rounded w-full"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-6">
            {[1, 2].map(i => (
              <div key={i} className="bg-white/20 dark:bg-slate-800/20 backdrop-blur-xl border border-white/40 dark:border-slate-700/30 rounded-2xl p-6 animate-pulse">
                <div className="h-6 bg-white/30 dark:bg-slate-600/30 rounded w-24 mb-4"></div>
                <div className="space-y-3">
                  {[1, 2, 3].map(j => (
                    <div key={j} className="h-4 bg-white/20 dark:bg-slate-600/20 rounded w-full"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/virtual-cards')}
            className="p-2 bg-white/20 dark:bg-slate-700/20 border border-white/40 dark:border-slate-600/40 rounded-lg hover:bg-white/30 dark:hover:bg-slate-700/30 transition-all duration-300"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-slate-400" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Card Details</h1>
            <p className="text-gray-600 dark:text-slate-300">Failed to load card information</p>
          </div>
        </div>
        
        <Alert 
          message={error} 
          onClose={() => setError(null)} 
          type="error" 
        />
      </div>
    );
  }

  if (!card) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/virtual-cards')}
            className="p-2 bg-white/20 dark:bg-slate-700/20 border border-white/40 dark:border-slate-600/40 rounded-lg hover:bg-white/30 dark:hover:bg-slate-700/30 transition-all duration-300"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-slate-400" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Card Not Found</h1>
            <p className="text-gray-600 dark:text-slate-300">The requested card could not be found</p>
          </div>
        </div>
      </div>
    );
  }

  const cardData = card.card;
  const statusConfig = getStatusConfig(cardData.basicInfo.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/virtual-cards')}
            className="p-3 bg-white/20 dark:bg-slate-700/20 border border-white/40 dark:border-slate-600/40 rounded-2xl hover:bg-white/30 dark:hover:bg-slate-700/30 transition-all duration-300 hover:scale-105 transform"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600 dark:text-slate-400" />
          </button>
          <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 dark:from-purple-600/20 dark:to-pink-600/20 backdrop-blur-xl rounded-2xl border border-white/40 dark:border-slate-600/40 shadow-lg">
            <CreditCard className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
              {maskCardNumber(cardData.basicInfo.cardNumber)}
            </h1>
            <p className="text-gray-600 dark:text-slate-300 mt-2 text-lg">
              {cardData.basicInfo.cardName} • {cardData.bankAccount?.name}
            </p>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-2">
                <StatusIcon className={`w-5 h-5 text-${statusConfig.color}-500`} />
                <span className={`px-3 py-1 rounded-lg text-sm font-medium bg-${statusConfig.color}-100/60 dark:bg-${statusConfig.color}-900/40 text-${statusConfig.color}-800 dark:text-${statusConfig.color}-200 border border-${statusConfig.color}-200 dark:border-${statusConfig.color}-800`}>
                  {statusConfig.label}
                </span>
              </div>
              {cardData.fraudAnalytics.isHighRisk && (
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-red-500" />
                  <span className="px-2 py-1 rounded-lg text-xs font-medium bg-red-100/60 dark:bg-red-900/40 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800">
                    High Risk
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {cardData.basicInfo.status === 'active' && (
            <>
              <button
                onClick={() => setShowEditForm(true)}
                className="group inline-flex items-center gap-2 bg-amber-100/60 dark:bg-amber-900/40 text-amber-700 dark:text-amber-200 px-4 py-2 rounded-xl hover:bg-amber-200/60 dark:hover:bg-amber-800/50 transition-all duration-300 hover:scale-105 transform border border-amber-200/50 dark:border-amber-800/50"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
              
              <button
                onClick={handleMarkAsUsed}
                className="group inline-flex items-center gap-2 bg-green-100/60 dark:bg-green-900/40 text-green-700 dark:text-green-200 px-4 py-2 rounded-xl hover:bg-green-200/60 dark:hover:bg-green-800/50 transition-all duration-300 hover:scale-105 transform border border-green-200/50 dark:border-green-800/50"
              >
                <CheckCircle className="w-4 h-4" />
                Mark as Used
              </button>
            </>
          )}
          
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="group inline-flex items-center gap-2 bg-red-100/60 dark:bg-red-900/40 text-red-700 dark:text-red-200 px-4 py-2 rounded-xl hover:bg-red-200/60 dark:hover:bg-red-800/50 transition-all duration-300 hover:scale-105 transform border border-red-200/50 dark:border-red-800/50"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white/25 dark:bg-slate-800/25 backdrop-blur-xl border border-white/50 dark:border-slate-700/40 rounded-2xl shadow-xl ring-1 ring-white/20 dark:ring-slate-700/30 overflow-hidden">
        <div className="flex border-b border-white/20 dark:border-slate-600/30">
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-all duration-300 border-b-2 ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600 dark:text-purple-400 bg-white/10 dark:bg-slate-700/20'
                    : 'border-transparent text-gray-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-white/5 dark:hover:bg-slate-700/10'
                }`}
              >
                <TabIcon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard
                  title="Usage Count"
                  value={cardData.usageAnalytics.totalUsage}
                  icon={TrendingUp}
                  formatType="text"
                />
                <StatCard
                  title="Days Active"
                  value={cardData.usageAnalytics.daysSinceCreation}
                  icon={Clock}
                  formatType="text"
                />
                <StatCard
                  title="Risk Score"
                  value={cardData.fraudAnalytics.riskScore}
                  icon={Shield}
                  formatType="text"
                />
                <StatCard
                  title="Account Rank"
                  value={`#${card.comparisonMetrics.rankByUsage}`}
                  icon={Users}
                  formatType="text"
                />
              </div>

              {/* Card Information */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white/20 dark:bg-slate-700/20 backdrop-blur-md rounded-2xl p-6 border border-white/30 dark:border-slate-600/30">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    Card Details
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-slate-400">Card Number:</span>
                      <span className="font-mono text-gray-900 dark:text-slate-100">
                        {maskCardNumber(cardData.basicInfo.cardNumber)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-slate-400">Cardholder Name:</span>
                      <span className="text-gray-900 dark:text-slate-100">{cardData.basicInfo.cardName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-slate-400">Expiry Date:</span>
                      <span className="text-gray-900 dark:text-slate-100">
                        {formatDate(cardData.basicInfo.expiredDate, 'month-year')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-slate-400">Created:</span>
                      <span className="text-gray-900 dark:text-slate-100">
                        {formatDate(cardData.basicInfo.createdAt)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-slate-400">Creation Source:</span>
                      <span className="text-gray-900 dark:text-slate-100 capitalize">
                        {cardData.basicInfo.creationSource}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/20 dark:bg-slate-700/20 backdrop-blur-md rounded-2xl p-6 border border-white/30 dark:border-slate-600/30">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                    <Building className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    Bank Account
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-slate-400">Account Name:</span>
                      <span className="text-gray-900 dark:text-slate-100">{cardData.bankAccount.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-slate-400">Account Number:</span>
                      <span className="text-gray-900 dark:text-slate-100">{cardData.bankAccount.accountNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-slate-400">Provider:</span>
                      <span className="text-gray-900 dark:text-slate-100">
                        {cardData.bankAccount.provider?.name} ({cardData.bankAccount.provider?.code})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-slate-400">Currency:</span>
                      <span className="text-gray-900 dark:text-slate-100">{cardData.bankAccount.currency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-slate-400">Status:</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        cardData.bankAccount.isActive 
                          ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200'
                          : 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200'
                      }`}>
                        {cardData.bankAccount.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'bin' && (
            <div className="space-y-6">
              {/* BIN Information */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white/20 dark:bg-slate-700/20 backdrop-blur-md rounded-2xl p-6 border border-white/30 dark:border-slate-600/30">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      Card BIN Information
                    </h3>
                    {cardData.binInformation?.bin && (
                      <button
                        onClick={async () => {
                          try {
                            await refreshBinData(cardData.binInformation.bin);
                            fetchCardDetails();
                            showToast.success('BIN data refreshed successfully');
                          } catch (error) {
                            showToast.error('Failed to refresh BIN data');
                          }
                        }}
                        className="p-2 bg-blue-100/60 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200 rounded-lg hover:bg-blue-200/60 dark:hover:bg-blue-800/50 transition-all duration-300"
                        title="Refresh BIN Data"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  {cardData.binInformation ? (
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-slate-400">BIN:</span>
                        <span className="font-mono text-gray-900 dark:text-slate-100">
                          {cardData.binInformation.bin || 'Unknown'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-slate-400">Scheme:</span>
                        <span className="text-gray-900 dark:text-slate-100 capitalize">
                          {cardData.binInformation.scheme || 'Unknown'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-slate-400">Type:</span>
                        <span className="text-gray-900 dark:text-slate-100 capitalize">
                          {cardData.binInformation.type || 'Unknown'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-slate-400">Brand:</span>
                        <span className="text-gray-900 dark:text-slate-100">
                          {cardData.binInformation.brand || 'Unknown'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-slate-400">Prepaid:</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          cardData.binInformation.prepaid
                            ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200'
                            : 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200'
                        }`}>
                          {cardData.binInformation.prepaid ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-slate-400">Risk Level:</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${
                          cardData.binInformation.riskLevel === 'high'
                            ? 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200'
                            : cardData.binInformation.riskLevel === 'medium'
                              ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200'
                              : 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200'
                        }`}>
                          {cardData.binInformation.riskLevel || 'unknown'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-slate-400">Lookup Count:</span>
                        <span className="text-gray-900 dark:text-slate-100">
                          {cardData.binInformation.lookupCount || 0}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CreditCard className="w-12 h-12 text-gray-400 dark:text-slate-500 mx-auto mb-3" />
                      <p className="text-gray-600 dark:text-slate-400">BIN information not available</p>
                    </div>
                  )}
                </div>

                <div className="bg-white/20 dark:bg-slate-700/20 backdrop-blur-md rounded-2xl p-6 border border-white/30 dark:border-slate-600/30">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-green-600 dark:text-green-400" />
                    Country & Bank Info
                  </h3>
                  
                  {cardData.binInformation?.country || cardData.binInformation?.bank ? (
                    <div className="space-y-4">
                      {cardData.binInformation.country && (
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-slate-100 mb-2">Country Information</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-slate-400">Country:</span>
                              <span className="text-gray-900 dark:text-slate-100 flex items-center gap-2">
                                {cardData.binInformation.country.emoji && (
                                  <span>{cardData.binInformation.country.emoji}</span>
                                )}
                                {cardData.binInformation.country.name}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-slate-400">Code:</span>
                              <span className="text-gray-900 dark:text-slate-100">
                                {cardData.binInformation.country.alpha2}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-slate-400">Currency:</span>
                              <span className="text-gray-900 dark:text-slate-100">
                                {cardData.binInformation.country.currency}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {cardData.binInformation.bank && (
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-slate-100 mb-2">Bank Information</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-slate-400">Bank Name:</span>
                              <span className="text-gray-900 dark:text-slate-100">
                                {cardData.binInformation.bank.name || 'Unknown'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-slate-400">City:</span>
                              <span className="text-gray-900 dark:text-slate-100">
                                {cardData.binInformation.bank.city || 'Unknown'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {cardData.binInformation.lastUpdated && (
                        <div className="pt-3 border-t border-white/20 dark:border-slate-600/30">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-slate-400">Last Updated:</span>
                            <span className="text-gray-900 dark:text-slate-100">
                              {formatDate(cardData.binInformation.lastUpdated, 'short')}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <MapPin className="w-12 h-12 text-gray-400 dark:text-slate-500 mx-auto mb-3" />
                      <p className="text-gray-600 dark:text-slate-400">Country and bank information not available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {/* Usage Analytics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white/20 dark:bg-slate-700/20 backdrop-blur-md rounded-2xl p-6 border border-white/30 dark:border-slate-600/30">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                    Usage Analytics
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                          {cardData.usageAnalytics.totalUsage}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-slate-400">Total Usage</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                          {cardData.usageAnalytics.averageUsagePerDay.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-slate-400">Avg/Day</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-slate-400">Last Used:</span>
                        <span className="text-gray-900 dark:text-slate-100">
                          {cardData.usageAnalytics.daysSinceLastUse !== null 
                            ? `${cardData.usageAnalytics.daysSinceLastUse} days ago`
                            : 'Never used'
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-slate-400">Days Until Expiry:</span>
                        <span className={`font-medium ${
                          cardData.usageAnalytics.daysUntilExpiry < 30 
                            ? 'text-red-600 dark:text-red-400'
                            : cardData.usageAnalytics.daysUntilExpiry < 90
                              ? 'text-yellow-600 dark:text-yellow-400'
                              : 'text-green-600 dark:text-green-400'
                        }`}>
                          {cardData.usageAnalytics.isExpired 
                            ? 'Expired' 
                            : `${cardData.usageAnalytics.daysUntilExpiry} days`
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white/20 dark:bg-slate-700/20 backdrop-blur-md rounded-2xl p-6 border border-white/30 dark:border-slate-600/30">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    Performance Metrics
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                          #{card.comparisonMetrics.rankByUsage}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-slate-400">Account Rank</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                          {card.comparisonMetrics.usagePercentile.toFixed(0)}%
                        </div>
                        <div className="text-sm text-gray-600 dark:text-slate-400">Percentile</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-slate-400">Risk Comparison:</span>
                        <span className={`font-medium capitalize ${
                          card.comparisonMetrics.riskComparison === 'below_average'
                            ? 'text-green-600 dark:text-green-400'
                            : card.comparisonMetrics.riskComparison === 'above_average'
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-yellow-600 dark:text-yellow-400'
                        }`}>
                          {card.comparisonMetrics.riskComparison.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-slate-400">Total Account Cards:</span>
                        <span className="text-gray-900 dark:text-slate-100">
                          {card.comparisonMetrics.accountTotalCards}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'transactions' && (
            <div className="space-y-6">
              <div className="bg-white/20 dark:bg-slate-700/20 backdrop-blur-md rounded-2xl p-6 border border-white/30 dark:border-slate-600/30">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  Recent Transactions
                </h3>
                {card.relatedTransactions && card.relatedTransactions.length > 0 ? (
                  <div className="space-y-3">
                    {card.relatedTransactions.map((transaction, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white/10 dark:bg-slate-600/10 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-slate-100">
                            {transaction.fromAccount?.name} → {transaction.toAccount?.name}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-slate-400">
                            {formatDate(transaction.createdAt)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-gray-900 dark:text-slate-100">
                            {formatCurrency(transaction.amount, transaction.fromCurrency)}
                          </div>
                          <div className={`text-sm px-2 py-1 rounded ${
                            transaction.status === 'completed' 
                              ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200'
                              : transaction.status === 'failed'
                                ? 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200'
                                : 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200'
                          }`}>
                            {transaction.status}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Activity className="w-12 h-12 text-gray-400 dark:text-slate-500 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-slate-400">No transactions found</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'fraud' && (
            <div className="space-y-6">
              {/* Security Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white/20 dark:bg-slate-700/20 backdrop-blur-md rounded-2xl p-6 border border-white/30 dark:border-slate-600/30">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-red-600 dark:text-red-400" />
                    Fraud Detection
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${
                          getRiskLevelColor(cardData.fraudAnalytics.riskScore > 70 ? 'high' : 
                            cardData.fraudAnalytics.riskScore > 40 ? 'medium' : 'low') === 'red'
                            ? 'text-red-600 dark:text-red-400'
                            : getRiskLevelColor(cardData.fraudAnalytics.riskScore > 70 ? 'high' : 
                                cardData.fraudAnalytics.riskScore > 40 ? 'medium' : 'low') === 'yellow'
                              ? 'text-yellow-600 dark:text-yellow-400'
                              : 'text-green-600 dark:text-green-400'
                        }`}>
                          {cardData.fraudAnalytics.riskScore}/100
                        </div>
                        <div className="text-sm text-gray-600 dark:text-slate-400">Risk Score</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                          {cardData.fraudAnalytics.replacementCount}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-slate-400">Replacements</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-slate-400">High Risk Status:</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          cardData.fraudAnalytics.isHighRisk
                            ? 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200'
                            : 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200'
                        }`}>
                          {cardData.fraudAnalytics.isHighRisk ? 'High Risk' : 'Normal'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-slate-400">Last Assessment:</span>
                        <span className="text-gray-900 dark:text-slate-100">
                          {cardData.fraudAnalytics.lastRiskAssessment 
                            ? formatDate(cardData.fraudAnalytics.lastRiskAssessment, 'short')
                            : 'Never'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white/20 dark:bg-slate-700/20 backdrop-blur-md rounded-2xl p-6 border border-white/30 dark:border-slate-600/30">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    Security Flags
                  </h3>
                  {cardData.fraudAnalytics.flaggedReasons && cardData.fraudAnalytics.flaggedReasons.length > 0 ? (
                    <div className="space-y-2">
                      {cardData.fraudAnalytics.flaggedReasons.map((reason, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-yellow-100/60 dark:bg-yellow-900/40 rounded-lg">
                          <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                          <span className="text-sm text-yellow-800 dark:text-yellow-200">{reason}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 dark:text-slate-400">No security flags detected</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Replacement History */}
              {cardData.fraudAnalytics.replacementHistory && cardData.fraudAnalytics.replacementHistory.length > 0 && (
                <div className="bg-white/20 dark:bg-slate-700/20 backdrop-blur-md rounded-2xl p-6 border border-white/30 dark:border-slate-600/30">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    Replacement History
                  </h3>
                  <div className="space-y-3">
                    {cardData.fraudAnalytics.replacementHistory.map((replacement, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white/10 dark:bg-slate-600/10 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-slate-100">
                            Replacement #{index + 1}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-slate-400">
                            Reason: {replacement.reason} • {formatDate(replacement.replacedAt)}
                          </div>
                          {replacement.notes && (
                            <div className="text-sm text-gray-500 dark:text-slate-500 mt-1">
                              {replacement.notes}
                            </div>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-slate-400">
                          From: {replacement.previousCardNumber ? 
                            maskCardNumber(replacement.previousCardNumber) : 'N/A'
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Form Modal */}
      {showEditForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-white/40 dark:border-slate-700/30 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-xl">
                    <Edit className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
                      Edit Card: {maskCardNumber(cardData.basicInfo.cardNumber)}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-slate-400">Update card information</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEditForm(false)}
                  className="p-2 hover:bg-white/20 dark:hover:bg-slate-600/30 rounded-lg transition-all duration-300"
                >
                  <div className="w-6 h-6 text-gray-500 dark:text-slate-400">✕</div>
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Card Name *
                    </label>
                    <input
                      type="text"
                      name="cardName"
                      value={editFormData.cardName}
                      onChange={handleEditInputChange}
                      className="w-full bg-white/40 dark:bg-slate-700/40 backdrop-blur-md border-2 border-white/50 dark:border-slate-600/50 rounded-xl px-4 py-3 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/25 transition-all duration-300"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Status
                    </label>
                    <select
                      name="status"
                      value={editFormData.status}
                      onChange={handleEditInputChange}
                      className="w-full bg-white/40 dark:bg-slate-700/40 backdrop-blur-md border-2 border-white/50 dark:border-slate-600/50 rounded-xl px-4 py-3 text-gray-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/25 transition-all duration-300"
                    >
                      {cardStatuses.map(status => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Expiry Date
                    </label>
                    <input
                      type="date"
                      name="expiredDate"
                      value={editFormData.expiredDate}
                      onChange={handleEditInputChange}
                      className="w-full bg-white/40 dark:bg-slate-700/40 backdrop-blur-md border-2 border-white/50 dark:border-slate-600/50 rounded-xl px-4 py-3 text-gray-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/25 transition-all duration-300"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      CVV (optional)
                    </label>
                    <input
                      type="text"
                      name="cvv"
                      value={editFormData.cvv}
                      onChange={handleEditInputChange}
                      className="w-full bg-white/40 dark:bg-slate-700/40 backdrop-blur-md border-2 border-white/50 dark:border-slate-600/50 rounded-xl px-4 py-3 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/25 transition-all duration-300"
                      placeholder="Leave empty to keep current"
                      maxLength="4"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-6 border-t border-white/20 dark:border-slate-600/30">
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="flex-1 bg-amber-500/80 backdrop-blur-md border border-amber-400/50 text-white px-6 py-3 rounded-xl hover:bg-amber-600/80 transition-all duration-300 disabled:opacity-50 font-semibold"
                  >
                    {formLoading ? 'Updating...' : 'Update Card'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEditForm(false)}
                    className="flex-1 bg-gray-500/80 backdrop-blur-md border border-gray-400/50 text-white px-6 py-3 rounded-xl hover:bg-gray-600/80 transition-all duration-300 font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-white/40 dark:border-slate-700/30 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100/60 dark:bg-red-900/40 rounded-lg">
                  <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Delete Card</h3>
                  <p className="text-sm text-gray-600 dark:text-slate-400">This action cannot be undone</p>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-700 dark:text-slate-300 mb-2">
                  Card: <strong>{maskCardNumber(cardData.basicInfo.cardNumber)}</strong>
                </p>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Name: {cardData.basicInfo.cardName}
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteCard}
                  disabled={formLoading}
                  className="flex-1 bg-red-500/80 backdrop-blur-md border border-red-400/50 text-white px-4 py-2 rounded-xl hover:bg-red-600/80 transition-all duration-300 disabled:opacity-50"
                >
                  {formLoading ? 'Deleting...' : 'Delete Card'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 bg-gray-500/80 backdrop-blur-md border border-gray-400/50 text-white px-4 py-2 rounded-xl hover:bg-gray-600/80 transition-all duration-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VirtualCardDetails;
