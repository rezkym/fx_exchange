import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  CreditCard, 
  RefreshCw, 
  Eye, 
  AlertTriangle, 
  CheckCircle, 
  Search,
  Filter,
  Edit,
  Trash2,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Shield,
  TrendingUp,
  Clock,
  Users
} from 'lucide-react';
import { 
  getCards, 
  createCard, 
  updateCard, 
  deleteCard, 
  replaceCard, 
  markCardAsUsed,
  getBankAccounts,
  getCardsAnalyticsSummary
} from '../services/api';
import { showToast, showAlert } from '../utils/notifications';
import { formatDate } from '../utils/format';
import StatCard from '../components/StatCard';
import Alert from '../components/Alert';
import { useTheme } from '../contexts/ThemeContext';

const VirtualCards = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [cards, setCards] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showReplaceForm, setShowReplaceForm] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterProvider, setFilterProvider] = useState('');
  const [filterBankAccount, setFilterBankAccount] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showFilters, setShowFilters] = useState(false);

  // Form States
  const [formData, setFormData] = useState({
    cardNumber: '',
    cardName: '',
    expiredDate: '',
    cvv: '',
    bankAccount: '',
    address: {
      street: '',
      city: '',
      state: '',
      country: '',
      postalCode: ''
    },
    useAccountAddress: true
  });

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

  const [replaceData, setReplaceData] = useState({
    newCardNumber: '',
    newCardName: '',
    newExpiredDate: '',
    newCvv: '',
    reason: 'lost'
  });

  const cardStatuses = [
    { value: 'active', label: 'Active', color: 'green', icon: CheckCircle },
    { value: 'used', label: 'Used', color: 'blue', icon: CreditCard },
    { value: 'expired', label: 'Expired', color: 'yellow', icon: AlertTriangle },
    { value: 'blocked', label: 'Blocked', color: 'red', icon: AlertTriangle }
  ];

  const replacementReasons = [
    { value: 'lost', label: 'Lost' },
    { value: 'stolen', label: 'Stolen' },
    { value: 'damaged', label: 'Damaged' },
    { value: 'expired', label: 'Expired' },
    { value: 'compromised', label: 'Compromised' },
    { value: 'other', label: 'Other' }
  ];

  // Calculate status counts from cards data
  const statusCounts = useMemo(() => {
    const counts = {
      active: 0,
      expired: 0,
      blocked: 0,
      used: 0
    };
    
    cards.forEach(card => {
      const status = card.status?.toLowerCase() || 'active';
      if (counts.hasOwnProperty(status)) {
        counts[status]++;
      }
    });
    
    return counts;
  }, [cards]);

  useEffect(() => {
    Promise.all([fetchCards(), fetchAccounts(), fetchAnalytics()]);
  }, []);

  useEffect(() => {
    fetchCards();
  }, [searchTerm, filterStatus, filterProvider, filterBankAccount, sortBy, sortOrder, currentPage, itemsPerPage]);

  const fetchCards = async () => {
    try {
      setLoading(true);
      const params = {
        search: searchTerm,
        status: filterStatus,
        provider: filterProvider,
        bankAccount: filterBankAccount,
        sortBy,
        sortOrder,
        page: currentPage,
        limit: itemsPerPage
      };
      
      // Remove empty params
      Object.keys(params).forEach(key => {
        if (!params[key] || params[key] === '') {
          delete params[key];
        }
      });

      const response = await getCards(params);
      if (response.success) {
        setCards(response.data || []);
      } else {
        throw new Error(response.message || 'Failed to fetch cards');
      }
      setError(null);
    } catch (err) {
      setError(err.message);
      showToast.error('Failed to load virtual cards');
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await getBankAccounts();
      if (response.success) {
        setAccounts(response.data.filter(account => account.isActive !== false));
      }
    } catch (err) {
      console.error('Failed to load accounts:', err);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await getCardsAnalyticsSummary();
      if (response.success) {
        setAnalytics(response.data);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
    setFormData(prev => ({
      ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
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

  const handleReplaceInputChange = (e) => {
    const { name, value } = e.target;
    setReplaceData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.cardNumber || !formData.cardName || !formData.expiredDate || !formData.cvv || !formData.bankAccount) {
      showToast.warning('Please fill all required fields');
      return;
    }

    try {
      setFormLoading(true);
      const response = await createCard(formData);
      
      if (response.success) {
        showToast.success('Virtual card created successfully');
        resetForm();
        setShowForm(false);
        fetchCards();
        fetchAnalytics();
      } else {
        throw new Error(response.message || 'Failed to create card');
      }
    } catch (err) {
      showToast.error(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedCard) return;

    try {
      setFormLoading(true);
      const response = await updateCard(selectedCard._id, editFormData);
      
      if (response.success) {
        showToast.success('Card updated successfully');
        setShowEditForm(false);
        setSelectedCard(null);
        resetEditForm();
        fetchCards();
        fetchAnalytics();
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
    if (!selectedCard) return;

    const confirmResult = await showAlert.confirm(
      'Delete Card?',
      `Are you sure you want to delete card ${maskCardNumber(selectedCard.cardNumber)}? This action cannot be undone.`,
      'Delete',
      'Cancel'
    );

    if (confirmResult.isConfirmed) {
      try {
        setFormLoading(true);
        const response = await deleteCard(selectedCard._id);
        
        if (response.success) {
          showToast.success('Card deleted successfully');
          setShowDeleteConfirm(false);
          setSelectedCard(null);
          fetchCards();
          fetchAnalytics();
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

  const handleMarkAsUsed = async (card) => {
    const confirmResult = await showAlert.confirm(
      'Mark Card as Used?',
      `Are you sure you want to mark card ${maskCardNumber(card.cardNumber)} as used? This will change its status and update usage statistics.`,
      'Mark as Used',
      'Cancel'
    );

    if (confirmResult.isConfirmed) {
      try {
        const response = await markCardAsUsed(card._id);
        
        if (response.success) {
          showToast.success('Card marked as used successfully');
          fetchCards();
          fetchAnalytics();
        } else {
          throw new Error(response.message || 'Failed to mark card as used');
        }
      } catch (err) {
        showToast.error(err.message);
      }
    }
  };

  const handleInitiateReplace = (card) => {
    setSelectedCard(card);
    setShowReplaceForm(true);
    // Reset replace form data
    setReplaceData({
      newCardNumber: '',
      newCardName: '',
      newExpiredDate: '',
      newCvv: '',
      reason: 'lost'
    });
  };

  const handleReplaceCard = async (e) => {
    e.preventDefault();
    
    if (!replaceData.newCardNumber || !replaceData.newCardName || !replaceData.newExpiredDate || !replaceData.newCvv) {
      showToast.warning('Please fill all required fields');
      return;
    }

    const confirmResult = await showAlert.confirm(
      'Replace Card?',
      `Are you sure you want to replace this card? Reason: ${replaceData.reason}`,
      'Replace',
      'Cancel'
    );

    if (confirmResult.isConfirmed) {
      try {
        setFormLoading(true);
        const response = await replaceCard(selectedCard._id, replaceData);
        
        if (response.success) {
          showToast.success('Card replaced successfully');
          setReplaceData({ newCardNumber: '', newCardName: '', newExpiredDate: '', newCvv: '', reason: 'lost' });
          setShowReplaceForm(false);
          setSelectedCard(null);
          fetchCards();
        } else {
          throw new Error(response.message || 'Failed to replace card');
        }
      } catch (err) {
        showToast.error(err.message);
      } finally {
        setFormLoading(false);
      }
    }
  };

  const handleViewCard = (card) => {
    navigate(`/virtual-cards/${card._id}`);
  };

  const handleEditCard = (card) => {
    setSelectedCard(card);
    setEditFormData({
      cardName: card.cardName,
      expiredDate: card.expiredDate ? new Date(card.expiredDate).toISOString().split('T')[0] : '',
      cvv: card.cvv,
      status: card.status,
      address: {
        street: card.address?.street || '',
        city: card.address?.city || '',
        state: card.address?.state || '',
        country: card.address?.country || '',
        postalCode: card.address?.postalCode || ''
      },
      useAccountAddress: card.useAccountAddress || false
    });
    setShowEditForm(true);
  };

  const resetForm = () => {
    setFormData({
      cardNumber: '',
      cardName: '',
      expiredDate: '',
      cvv: '',
      bankAccount: '',
      address: {
        street: '',
        city: '',
        state: '',
        country: '',
        postalCode: ''
      },
      useAccountAddress: true
    });
  };

  const resetEditForm = () => {
    setEditFormData({
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

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('');
    setFilterProvider('');
    setFilterBankAccount('');
    setCurrentPage(1);
  };

  // Get unique providers from accounts for filter dropdown
  const providers = useMemo(() => {
    const uniqueProviders = [...new Set(accounts.map(account => account.provider?.name).filter(Boolean))];
    return uniqueProviders.map(name => {
      const account = accounts.find(acc => acc.provider?.name === name);
      return {
        name,
        code: account?.provider?.code
      };
    });
  }, [accounts]);

  if (loading && cards.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-indigo-900 dark:to-purple-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Loading Header */}
          <div className="relative overflow-hidden rounded-3xl bg-white/10 dark:bg-white/5 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-2xl mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10 dark:from-blue-400/5 dark:via-purple-400/5 dark:to-pink-400/5"></div>
            <div className="relative px-8 py-12">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 shadow-lg animate-pulse">
                  <CreditCard className="w-8 h-8 text-white" />
        </div>
                <div className="space-y-2">
                  <div className="h-8 bg-white/30 dark:bg-white/20 rounded-lg w-64 animate-pulse"></div>
                  <div className="h-4 bg-white/20 dark:bg-white/10 rounded w-96 animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Loading Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div 
                key={i} 
                className="relative overflow-hidden rounded-3xl bg-white/20 dark:bg-white/10 backdrop-blur-2xl border border-white/30 dark:border-white/20 shadow-2xl"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5"></div>
                <div className="relative p-8 animate-pulse">
                  <div className="flex justify-between items-start mb-6">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-white/30 dark:bg-white/20 rounded-xl"></div>
                        <div className="h-6 bg-white/30 dark:bg-white/20 rounded-full w-20"></div>
                      </div>
                      <div className="h-6 bg-white/30 dark:bg-white/20 rounded w-48"></div>
                      <div className="h-5 bg-white/20 dark:bg-white/10 rounded w-32"></div>
                    </div>
                    <div className="h-6 w-6 bg-white/30 dark:bg-white/20 rounded"></div>
                  </div>
                  
                  <div className="space-y-4 mb-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="h-3 bg-white/20 dark:bg-white/10 rounded w-16"></div>
                        <div className="h-4 bg-white/30 dark:bg-white/20 rounded w-24"></div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 bg-white/20 dark:bg-white/10 rounded w-16"></div>
                        <div className="h-4 bg-white/30 dark:bg-white/20 rounded w-12"></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <div className="flex-1 h-12 bg-white/30 dark:bg-white/20 rounded-xl"></div>
                    <div className="h-12 w-12 bg-white/20 dark:bg-white/10 rounded-xl"></div>
                  </div>
              </div>
            </div>
          ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white/20 dark:bg-slate-800/20 backdrop-blur-xl rounded-2xl border border-white/40 dark:border-slate-700/30 shadow-lg">
            <CreditCard className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
        <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-slate-100">
              Virtual Cards
            </h1>
            <p className="text-gray-600 dark:text-slate-300 mt-2 text-lg">
              Kelola kartu virtual Anda dengan kontrol penuh dan keamanan tinggi
            </p>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-500 dark:text-slate-400">
                {statusCounts.active} kartu aktif
              </span>
        </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`group px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
              showFilters 
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' 
                : 'bg-white/30 dark:bg-slate-700/30 backdrop-blur-xl border border-white/50 dark:border-slate-600/50 text-gray-700 dark:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-700/40'
            }`}
          >
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filters
            </div>
          </button>
          
        <button
          onClick={() => setShowForm(!showForm)}
            className="group inline-flex items-center gap-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 transform focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2"
        >
            <Plus className="w-5 h-5 transition-transform duration-300 group-hover:rotate-90" />
            <span className="hidden sm:inline">Create Card</span>
            <span className="sm:hidden">Create</span>
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
            title="Active Cards"
            value={statusCounts.active}
            icon={CheckCircle}
          formatType="text"
        />
        </div>
        <div className="transform transition-all duration-300 hover:scale-105">
        <StatCard
            title="Used Cards"
            value={statusCounts.used}
            icon={TrendingUp}
          formatType="text"
        />
        </div>
        <div className="transform transition-all duration-300 hover:scale-105">
        <StatCard
          title="Expired Cards"
            value={statusCounts.expired}
            icon={Clock}
          formatType="text"
        />
        </div>
        <div className="transform transition-all duration-300 hover:scale-105">
        <StatCard
          title="Blocked Cards"
            value={statusCounts.blocked}
          icon={AlertTriangle}
          formatType="text"
        />
        </div>
      </div>



      {/* Advanced Filters */}
      {showFilters && (
        <div className="animate-in slide-in-from-top-4 duration-500 bg-white/30 dark:bg-slate-800/30 backdrop-blur-xl border border-white/50 dark:border-slate-700/40 rounded-2xl shadow-xl p-6 ring-1 ring-white/20 dark:ring-slate-700/30">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Advanced Filters</h3>
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterStatus('');
                setFilterProvider('');
                setFilterBankAccount('');
              }}
              className="px-4 py-2 rounded-xl font-medium bg-white/20 dark:bg-slate-700/30 backdrop-blur-md border border-white/40 dark:border-slate-600/40 text-gray-700 dark:text-slate-300 hover:bg-white/30 dark:hover:bg-slate-700/40 transition-all duration-300"
            >
              Clear All
            </button>
          </div>
              
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Search Cards</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-500 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by number, name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/40 dark:bg-slate-700/40 backdrop-blur-md border-2 border-white/50 dark:border-slate-600/50 rounded-xl text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25 transition-all duration-300"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-3 bg-white/40 dark:bg-slate-700/40 backdrop-blur-md border-2 border-white/50 dark:border-slate-600/50 rounded-xl text-gray-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25 transition-all duration-300"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="used">Used</option>
                <option value="expired">Expired</option>
                <option value="blocked">Blocked</option>
                  </select>
                </div>

            {/* Bank Account Filter */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Bank Account</label>
              <select
                value={filterBankAccount}
                onChange={(e) => setFilterBankAccount(e.target.value)}
                className="w-full px-4 py-3 bg-white/40 dark:bg-slate-700/40 backdrop-blur-md border-2 border-white/50 dark:border-slate-600/50 rounded-xl text-gray-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25 transition-all duration-300"
              >
                <option value="">All Accounts</option>
                {accounts.map(account => (
                  <option key={account._id} value={account._id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Sort By</label>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field);
                  setSortOrder(order);
                }}
                className="w-full px-4 py-3 bg-white/40 dark:bg-slate-700/40 backdrop-blur-md border-2 border-white/50 dark:border-slate-600/50 rounded-xl text-gray-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25 transition-all duration-300"
              >
                <option value="createdAt-desc">Newest First</option>
                <option value="createdAt-asc">Oldest First</option>
                <option value="cardName-asc">Name A-Z</option>
                <option value="cardName-desc">Name Z-A</option>
                <option value="status-asc">Status A-Z</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Create Form */}
      {showForm && (
        <div className="animate-in slide-in-from-top-4 duration-500 bg-white/30 dark:bg-slate-800/30 backdrop-blur-xl border border-white/50 dark:border-slate-700/40 rounded-3xl shadow-2xl p-8 ring-1 ring-white/20 dark:ring-slate-700/30 hover:shadow-3xl transition-all duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl">
              <Plus className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
              <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Create New Virtual Card</h2>
              <p className="text-sm text-gray-600 dark:text-slate-400">Tambahkan kartu virtual baru ke dalam sistem</p>
            </div>
            <button
              onClick={() => setShowForm(false)}
              className="absolute top-6 right-6 p-2 rounded-xl text-gray-500 dark:text-slate-400 hover:bg-white/20 dark:hover:bg-slate-700/20 transition-all duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-slate-300">
                      <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Card Number *
                </label>
                <input
                  type="text"
                  name="cardNumber"
                  value={formData.cardNumber}
                  onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-white/40 dark:bg-slate-700/40 backdrop-blur-md border-2 border-white/50 dark:border-slate-600/50 rounded-xl text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25 transition-all duration-300 hover:bg-white/50 dark:hover:bg-slate-700/50"
                      placeholder="💳 4111 1111 1111 1111"
                  maxLength="16"
                  required
                />
              </div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-slate-300">
                      <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      Cardholder Name *
                </label>
                <input
                  type="text"
                  name="cardName"
                  value={formData.cardName}
                  onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-white/40 dark:bg-slate-700/40 backdrop-blur-md border-2 border-white/50 dark:border-slate-600/50 rounded-xl text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25 transition-all duration-300 hover:bg-white/50 dark:hover:bg-slate-700/50"
                      placeholder="👤 John Doe"
                  required
                />
              </div>
            </div>
            
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-slate-300">
                      <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      Expiry Date *
                    </label>
                    <input
                      type="date"
                      name="expiredDate"
                      value={formData.expiredDate}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-white/40 dark:bg-slate-700/40 backdrop-blur-md border-2 border-white/50 dark:border-slate-600/50 rounded-xl text-gray-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25 transition-all duration-300 hover:bg-white/50 dark:hover:bg-slate-700/50"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-slate-300">
                      <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      CVV *
                    </label>
                    <input
                      type="text"
                      name="cvv"
                      value={formData.cvv}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-white/40 dark:bg-slate-700/40 backdrop-blur-md border-2 border-white/50 dark:border-slate-600/50 rounded-xl text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25 transition-all duration-300 hover:bg-white/50 dark:hover:bg-slate-700/50"
                      placeholder="🔒 123"
                      maxLength="4"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-slate-300">
                      <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Bank Account *
                </label>
                    <div className="relative">
                <select
                  name="bankAccount"
                  value={formData.bankAccount}
                  onChange={handleInputChange}
                        className="w-full px-4 py-3 pr-12 bg-white/40 dark:bg-slate-700/40 backdrop-blur-md border-2 border-white/50 dark:border-slate-600/50 rounded-xl text-gray-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25 transition-all duration-300 hover:bg-white/50 dark:hover:bg-slate-700/50 cursor-pointer appearance-none"
                  required
                >
                      <option value="" className="text-gray-500 dark:text-slate-400">🏦 Select Bank Account</option>
                  {accounts.map(account => (
                        <option 
                          key={account._id} 
                          value={account._id}
                          className="text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-800"
                        >
                          💳 {account.name} • {account.currency} • {account.provider?.name || 'Provider'}
                    </option>
                  ))}
                </select>
                      
                      {/* Custom Dropdown Arrow */}
                      <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                        <svg className="w-5 h-5 text-gray-600 dark:text-slate-400 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
              </div>
            </div>

                <div className="flex gap-4 pt-6">
              <button
                type="submit"
                disabled={formLoading}
                className="group flex-1 inline-flex items-center justify-center gap-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {formLoading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Creating Card...
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5 transition-transform duration-300 group-hover:rotate-90" />
                    Create Virtual Card
                  </>
                )}
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

      {/* Replace Form */}
      {showReplaceForm && selectedCard && (
        <div className="bg-white/20 backdrop-blur-xl border border-white/40 rounded-2xl shadow-xl p-6 ring-1 ring-white/10">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Replace Card: {maskCardNumber(selectedCard.cardNumber)}
          </h2>
          <form onSubmit={handleReplaceCard} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Card Number *
                </label>
                <input
                  type="text"
                  name="newCardNumber"
                  value={replaceData.newCardNumber}
                  onChange={handleReplaceInputChange}
                  className="w-full bg-white/30 backdrop-blur-md border border-white/40 rounded-xl px-4 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  placeholder="4111111111111112"
                  maxLength="16"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Card Name *
                </label>
                <input
                  type="text"
                  name="newCardName"
                  value={replaceData.newCardName}
                  onChange={handleReplaceInputChange}
                  className="w-full bg-white/30 backdrop-blur-md border border-white/40 rounded-xl px-4 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  placeholder="John Doe"
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Expiry Date *
                </label>
                <input
                  type="date"
                  name="newExpiredDate"
                  value={replaceData.newExpiredDate}
                  onChange={handleReplaceInputChange}
                  className="w-full bg-white/30 backdrop-blur-md border border-white/40 rounded-xl px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New CVV *
                </label>
                <input
                  type="text"
                  name="newCvv"
                  value={replaceData.newCvv}
                  onChange={handleReplaceInputChange}
                  className="w-full bg-white/30 backdrop-blur-md border border-white/40 rounded-xl px-4 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  placeholder="456"
                  maxLength="4"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason *
                </label>
                <select
                  name="reason"
                  value={replaceData.reason}
                  onChange={handleReplaceInputChange}
                  className="w-full bg-white/30 backdrop-blur-md border border-white/40 rounded-xl px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  required
                >
                  {replacementReasons.map(reason => (
                    <option key={reason.value} value={reason.value}>
                      {reason.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="submit"
                disabled={formLoading}
                className="bg-red-500/80 backdrop-blur-md border border-red-400/50 text-white px-4 py-2 rounded-xl hover:bg-red-600/80 transition-all duration-300 disabled:opacity-50"
              >
                {formLoading ? 'Replacing...' : 'Replace Card'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowReplaceForm(false);
                  setSelectedCard(null);
                }}
                className="bg-gray-500/80 backdrop-blur-md border border-gray-400/50 text-white px-4 py-2 rounded-xl hover:bg-gray-600/80 transition-all duration-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

        {/* Stunning Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {cards.map((card) => {
            const getStatusConfig = (status) => {
              const configs = {
                active: { icon: CheckCircle, color: 'emerald', label: 'Active', gradient: 'from-emerald-500 to-green-600' },
                used: { icon: CreditCard, color: 'blue', label: 'Used', gradient: 'from-blue-500 to-indigo-600' },
                expired: { icon: Clock, color: 'amber', label: 'Expired', gradient: 'from-amber-500 to-orange-600' },
                blocked: { icon: Shield, color: 'red', label: 'Blocked', gradient: 'from-red-500 to-pink-600' }
              };
              return configs[status] || configs.active;
            };

            const statusConfig = getStatusConfig(card.status);
            const StatusIcon = statusConfig.icon;
          
          return (
            <div
              key={card._id}
                className="group relative overflow-hidden rounded-3xl bg-white/20 dark:bg-white/10 backdrop-blur-2xl border border-white/30 dark:border-white/20 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105 hover:rotate-1 transform-gpu"
              >
                {/* Gradient Background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${statusConfig.gradient} opacity-5 group-hover:opacity-10 transition-opacity duration-500`}></div>
                
                {/* Card Content */}
                <div className="relative p-8">
                  {/* Card Header */}
                  <div className="flex justify-between items-start mb-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl bg-gradient-to-r ${statusConfig.gradient} shadow-lg`}>
                          <CreditCard className="w-5 h-5 text-white" />
                </div>
                        <div className={`px-3 py-1 rounded-full bg-${statusConfig.color}-100/80 dark:bg-${statusConfig.color}-900/40 border border-${statusConfig.color}-200 dark:border-${statusConfig.color}-700/50`}>
                <div className="flex items-center gap-2">
                            <StatusIcon className={`w-3 h-3 text-${statusConfig.color}-600 dark:text-${statusConfig.color}-400`} />
                            <span className={`text-xs font-semibold text-${statusConfig.color}-700 dark:text-${statusConfig.color}-300 uppercase tracking-wide`}>
                              {statusConfig.label}
                  </span>
                </div>
                        </div>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white font-mono tracking-wider">
                        {maskCardNumber(card.cardNumber)}
                      </h3>
                      <p className="text-lg text-gray-700 dark:text-slate-300 font-medium">
                        {card.cardName}
                      </p>
              </div>
              
                    <div className="relative group/menu">
                      <button className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-all duration-200">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Card Details */}
                  <div className="space-y-4 mb-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Bank Account</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {card.bankAccount?.name || 'N/A'}
                        </p>
                </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Currency</p>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {card.bankAccount?.currency || 'N/A'}
                  </span>
                        </div>
                </div>
              </div>

                    {card.binInfo && (
                      <div className="pt-3 border-t border-white/20 dark:border-white/10">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Scheme</p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white capitalize">
                              {card.binInfo.scheme || 'Unknown'}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Country</p>
                            <div className="flex items-center gap-1">
                              {card.binInfo.country?.emoji && (
                                <span className="text-sm">{card.binInfo.country.emoji}</span>
                              )}
                              <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                {card.binInfo.country?.name || 'Unknown'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                <button
                  onClick={() => handleViewCard(card)}
                      className="flex-1 group/btn relative overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <div className="absolute inset-0 bg-white/20 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                      <div className="relative flex items-center justify-center gap-2">
                        <Eye className="w-4 h-4" />
                        <span className="text-sm">View Details</span>
                      </div>
                </button>

                {card.status === 'active' && (
                  <button
                    onClick={() => handleInitiateReplace(card)}
                        className="px-4 py-3 bg-white/20 dark:bg-white/10 border border-white/30 dark:border-white/20 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-white/30 dark:hover:bg-white/20 transition-all duration-300"
                  >
                        <RefreshCw className="w-4 h-4" />
                  </button>
                )}
              </div>
                </div>

                {/* Hover Effects */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
            </div>
          );
        })}
      </div>

        {/* Beautiful Empty State */}
      {cards.length === 0 && !loading && (
          <div className="relative overflow-hidden rounded-3xl bg-white/20 dark:bg-white/10 backdrop-blur-2xl border border-white/30 dark:border-white/20 shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5"></div>
            <div className="relative text-center py-20 px-8">
              <div className="inline-flex p-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 shadow-2xl mb-6">
                <CreditCard className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">No Virtual Cards Yet</h3>
              <p className="text-lg text-gray-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
                Create your first virtual card to start managing your digital payments securely.
              </p>
          <button
            onClick={() => setShowForm(true)}
                className="group relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-white px-8 py-4 rounded-xl font-semibold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
              >
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex items-center gap-3">
                  <Plus className="w-5 h-5" />
                  <span>Create Your First Card</span>
                </div>
          </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default VirtualCards;

