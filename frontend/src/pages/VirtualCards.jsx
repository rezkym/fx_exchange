import { useState, useEffect } from 'react';
import { Plus, CreditCard, RefreshCw, Eye, AlertTriangle, CheckCircle } from 'lucide-react';
import { getCards, createCard, replaceCard, getBankAccounts } from '../services/api';
import { showToast, showAlert } from '../utils/notifications';
import StatCard from '../components/StatCard';
import Alert from '../components/Alert';

const VirtualCards = () => {
  const [cards, setCards] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showReplaceForm, setShowReplaceForm] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [formData, setFormData] = useState({
    cardNumber: '',
    cardName: '',
    expiredDate: '',
    cvv: '',
    bankAccount: ''
  });
  const [replaceData, setReplaceData] = useState({
    newCardNumber: '',
    newCardName: '',
    newExpiredDate: '',
    newCvv: '',
    reason: 'lost'
  });
  const [formLoading, setFormLoading] = useState(false);

  const cardStatuses = {
    active: { color: 'green', icon: CheckCircle },
    used: { color: 'blue', icon: CreditCard },
    expired: { color: 'yellow', icon: AlertTriangle },
    blocked: { color: 'red', icon: AlertTriangle }
  };

  const replacementReasons = [
    { value: 'lost', label: 'Lost' },
    { value: 'stolen', label: 'Stolen' },
    { value: 'damaged', label: 'Damaged' },
    { value: 'expired', label: 'Expired' },
    { value: 'compromise', label: 'Compromised' }
  ];

  useEffect(() => {
    Promise.all([fetchCards(), fetchAccounts()]);
  }, []);

  const fetchCards = async () => {
    try {
      setLoading(true);
      const response = await getCards();
      if (response.success) {
        setCards(response.data);
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
        setAccounts(response.data);
      }
    } catch (err) {
      console.error('Failed to load accounts:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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
        setFormData({ cardNumber: '', cardName: '', expiredDate: '', cvv: '', bankAccount: '' });
        setShowForm(false);
        fetchCards();
      } else {
        throw new Error(response.message || 'Failed to create card');
      }
    } catch (err) {
      showToast.error(err.message);
    } finally {
      setFormLoading(false);
    }
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
    showAlert.success(
      `Card: ${card.cardNumber}`,
      `Card Name: ${card.cardName}\nStatus: ${card.status}\nBank Account: ${card.bankAccount?.name || 'N/A'}\nCurrency: ${card.bankAccount?.currency || 'N/A'}`
    );
  };

  const handleInitiateReplace = (card) => {
    setSelectedCard(card);
    setShowReplaceForm(true);
    setReplaceData(prev => ({ ...prev, newCardName: card.cardName }));
  };

  const maskCardNumber = (cardNumber) => {
    if (!cardNumber) return '';
    return cardNumber.replace(/(\d{4})(\d{4})(\d{4})(\d{4})/, '$1****$3****');
  };

  const getCardsByStatus = () => {
    const statusCounts = {};
    cards.forEach(card => {
      statusCounts[card.status] = (statusCounts[card.status] || 0) + 1;
    });
    return statusCounts;
  };

  if (loading && cards.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Virtual Cards</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
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

  const statusCounts = getCardsByStatus();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Virtual Cards</h1>
          <p className="text-gray-600 mt-1">Manage your virtual cards and track their status</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-xl border border-white/40 rounded-xl px-4 py-2 text-gray-900 hover:bg-white/30 transition-all duration-300 shadow-lg"
        >
          <Plus className="w-4 h-4" />
          Create Card
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

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <StatCard
          title="Total Cards"
          value={cards.length}
          icon={CreditCard}
          formatType="text"
        />
        <StatCard
          title="Active Cards"
          value={statusCounts.active || 0}
          icon={CheckCircle}
          formatType="text"
        />
        <StatCard
          title="Expired Cards"
          value={statusCounts.expired || 0}
          icon={AlertTriangle}
          formatType="text"
        />
        <StatCard
          title="Blocked Cards"
          value={statusCounts.blocked || 0}
          icon={AlertTriangle}
          formatType="text"
        />
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white/20 backdrop-blur-xl border border-white/40 rounded-2xl shadow-xl p-6 ring-1 ring-white/10">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Card</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Card Number *
                </label>
                <input
                  type="text"
                  name="cardNumber"
                  value={formData.cardNumber}
                  onChange={handleInputChange}
                  className="w-full bg-white/30 backdrop-blur-md border border-white/40 rounded-xl px-4 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  placeholder="4111111111111111"
                  maxLength="16"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Card Name *
                </label>
                <input
                  type="text"
                  name="cardName"
                  value={formData.cardName}
                  onChange={handleInputChange}
                  className="w-full bg-white/30 backdrop-blur-md border border-white/40 rounded-xl px-4 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  placeholder="John Doe"
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expiry Date *
                </label>
                <input
                  type="date"
                  name="expiredDate"
                  value={formData.expiredDate}
                  onChange={handleInputChange}
                  className="w-full bg-white/30 backdrop-blur-md border border-white/40 rounded-xl px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CVV *
                </label>
                <input
                  type="text"
                  name="cvv"
                  value={formData.cvv}
                  onChange={handleInputChange}
                  className="w-full bg-white/30 backdrop-blur-md border border-white/40 rounded-xl px-4 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  placeholder="123"
                  maxLength="4"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bank Account *
                </label>
                <select
                  name="bankAccount"
                  value={formData.bankAccount}
                  onChange={handleInputChange}
                  className="w-full bg-white/30 backdrop-blur-md border border-white/40 rounded-xl px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
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
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="submit"
                disabled={formLoading}
                className="bg-blue-500/80 backdrop-blur-md border border-blue-400/50 text-white px-4 py-2 rounded-xl hover:bg-blue-600/80 transition-all duration-300 disabled:opacity-50"
              >
                {formLoading ? 'Creating...' : 'Create Card'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="bg-gray-500/80 backdrop-blur-md border border-gray-400/50 text-white px-4 py-2 rounded-xl hover:bg-gray-600/80 transition-all duration-300"
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

      {/* Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => {
          const StatusIcon = cardStatuses[card.status]?.icon || CreditCard;
          const statusColor = cardStatuses[card.status]?.color || 'gray';
          
          return (
            <div
              key={card._id}
              className="bg-white/20 backdrop-blur-xl border border-white/40 rounded-2xl shadow-xl p-6 ring-1 ring-white/10 hover:bg-white/25 transition-all duration-300"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{maskCardNumber(card.cardNumber)}</h3>
                  <p className="text-sm text-gray-600">{card.cardName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusIcon className={`w-5 h-5 text-${statusColor}-500`} />
                  <span className={`text-xs px-2 py-1 rounded-lg bg-${statusColor}-100/60 text-${statusColor}-800`}>
                    {card.status}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Bank Account:</span>
                  <span className="text-sm text-gray-900 font-medium">
                    {card.bankAccount?.name || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Currency:</span>
                  <span className="text-sm text-gray-900 font-medium">
                    {card.bankAccount?.currency || 'N/A'}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleViewCard(card)}
                  className="flex items-center gap-1 bg-blue-100/60 backdrop-blur-md text-blue-700 px-3 py-1 rounded-lg hover:bg-blue-200/60 transition-all duration-300 text-sm"
                >
                  <Eye className="w-3 h-3" />
                  View
                </button>
                {card.status === 'active' && (
                  <button
                    onClick={() => handleInitiateReplace(card)}
                    className="flex items-center gap-1 bg-orange-100/60 backdrop-blur-md text-orange-700 px-3 py-1 rounded-lg hover:bg-orange-200/60 transition-all duration-300 text-sm"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Replace
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {cards.length === 0 && !loading && (
        <div className="text-center py-12">
          <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No cards found</h3>
          <p className="text-gray-600 mb-4">Get started by creating your first virtual card.</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 bg-blue-500/80 backdrop-blur-md border border-blue-400/50 text-white px-4 py-2 rounded-xl hover:bg-blue-600/80 transition-all duration-300"
          >
            <Plus className="w-4 h-4" />
            Create First Card
          </button>
        </div>
      )}
    </div>
  );
};

export default VirtualCards;

