import { useState, useEffect } from 'react';
import { Plus, ArrowLeftRight, Send, Eye, RefreshCw } from 'lucide-react';
import { getTransactions, transferBetweenBanks, getBankAccounts, getCards } from '../services/api';
import { showToast, showAlert } from '../utils/notifications';
import { formatRate } from '../utils/format';
import StatCard from '../components/StatCard';
import Alert from '../components/Alert';

const Transfers = () => {
  const [transfers, setTransfers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    fromAccount: '',
    toAccount: '',
    amount: '',
    cardId: ''
  });
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    Promise.all([fetchTransfers(), fetchAccounts(), fetchCards()]);
  }, []);

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      const response = await getTransactions();
      if (response.success) {
        setTransfers(response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch transfers');
      }
      setError(null);
    } catch (err) {
      setError(err.message);
      showToast.error('Failed to load transfers');
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

  const fetchCards = async () => {
    try {
      const response = await getCards();
      if (response.success) {
        setCards(response.data.filter(card => card.status === 'active'));
      }
    } catch (err) {
      console.error('Failed to load cards:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.fromAccount || !formData.toAccount || !formData.amount || !formData.cardId) {
      showToast.warning('Please fill all required fields');
      return;
    }

    if (formData.fromAccount === formData.toAccount) {
      showToast.warning('Source and destination accounts cannot be the same');
      return;
    }

    const fromAccount = accounts.find(acc => acc._id === formData.fromAccount);
    const toAccount = accounts.find(acc => acc._id === formData.toAccount);
    const transferAmount = parseFloat(formData.amount);

    if (fromAccount && fromAccount.balance < transferAmount) {
      showToast.warning('Insufficient balance in source account');
      return;
    }

    const confirmResult = await showAlert.confirm(
      'Confirm Transfer',
      `Transfer ${formatRate(transferAmount, fromAccount?.currency)} from ${fromAccount?.name} to ${toAccount?.name}?`,
      'Transfer',
      'Cancel'
    );

    if (confirmResult.isConfirmed) {
      try {
        setFormLoading(true);
        const transferPayload = {
          fromAccount: formData.fromAccount,
          toAccount: formData.toAccount,
          amount: transferAmount,
          cardId: formData.cardId
        };

        const response = await transferBetweenBanks(transferPayload);
        
        if (response.success) {
          showToast.success('Transfer completed successfully');
          setFormData({ fromAccount: '', toAccount: '', amount: '', cardId: '' });
          setShowForm(false);
          fetchTransfers();
          fetchAccounts(); // Refresh account balances
        } else {
          throw new Error(response.message || 'Failed to process transfer');
        }
      } catch (err) {
        showToast.error(err.message);
      } finally {
        setFormLoading(false);
      }
    }
  };

  const handleViewTransfer = (transfer) => {
    showAlert.success(
      `Transfer Details`,
      `From: ${transfer.fromAccount?.name || 'N/A'}\nTo: ${transfer.toAccount?.name || 'N/A'}\nAmount: ${formatRate(transfer.amount, transfer.fromAccount?.currency)}\nCard Used: ${transfer.card?.cardNumber || 'N/A'}\nDate: ${new Date(transfer.createdAt).toLocaleString()}\nStatus: ${transfer.status || 'N/A'}`
    );
  };

  const getAvailableCards = () => {
    if (!formData.fromAccount) return [];
    const selectedAccount = accounts.find(acc => acc._id === formData.fromAccount);
    return cards.filter(card => card.bankAccount?._id === formData.fromAccount);
  };

  const getTransferStats = () => {
    const totalAmount = transfers.reduce((sum, transfer) => {
      if (transfer.status === 'completed') {
        return sum + (transfer.amount || 0);
      }
      return sum;
    }, 0);

    const successfulTransfers = transfers.filter(t => t.status === 'completed').length;
    const failedTransfers = transfers.filter(t => t.status === 'failed').length;
    const pendingTransfers = transfers.filter(t => t.status === 'pending').length;

    return { totalAmount, successfulTransfers, failedTransfers, pendingTransfers };
  };

  if (loading && transfers.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Transfers</h1>
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

  const stats = getTransferStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bank Transfers</h1>
          <p className="text-gray-600 mt-1">Transfer funds between your bank accounts</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-xl border border-white/40 rounded-xl px-4 py-2 text-gray-900 hover:bg-white/30 transition-all duration-300 shadow-lg"
          >
            <Plus className="w-4 h-4" />
            New Transfer
          </button>
          <button
            onClick={fetchTransfers}
            className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-xl border border-white/40 rounded-xl px-4 py-2 text-gray-900 hover:bg-white/30 transition-all duration-300 shadow-lg"
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
          title="Total Transfers"
          value={transfers.length}
          icon={ArrowLeftRight}
          formatType="text"
        />
        <StatCard
          title="Total Volume"
          value={stats.totalAmount}
          icon={Send}
          currency="USD"
        />
        <StatCard
          title="Successful"
          value={stats.successfulTransfers}
          icon={ArrowLeftRight}
          formatType="text"
        />
        <StatCard
          title="Pending"
          value={stats.pendingTransfers}
          icon={ArrowLeftRight}
          formatType="text"
        />
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white/20 backdrop-blur-xl border border-white/40 rounded-2xl shadow-xl p-6 ring-1 ring-white/10">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Transfer</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From Account *
                </label>
                <select
                  name="fromAccount"
                  value={formData.fromAccount}
                  onChange={handleInputChange}
                  className="w-full bg-white/30 backdrop-blur-md border border-white/40 rounded-xl px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  required
                >
                  <option value="">Select Source Account</option>
                  {accounts.map(account => (
                    <option key={account._id} value={account._id}>
                      {account.name} ({account.currency}) - Balance: {formatRate(account.balance, account.currency)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  To Account *
                </label>
                <select
                  name="toAccount"
                  value={formData.toAccount}
                  onChange={handleInputChange}
                  className="w-full bg-white/30 backdrop-blur-md border border-white/40 rounded-xl px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  required
                >
                  <option value="">Select Destination Account</option>
                  {accounts
                    .filter(account => account._id !== formData.fromAccount)
                    .map(account => (
                    <option key={account._id} value={account._id}>
                      {account.name} ({account.currency})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount *
                </label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  className="w-full bg-white/30 backdrop-blur-md border border-white/40 rounded-xl px-4 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  placeholder="100.00"
                  step="0.01"
                  min="0.01"
                  required
                />
                {formData.fromAccount && (
                  <p className="text-xs text-gray-600 mt-1">
                    Available: {formatRate(
                      accounts.find(acc => acc._id === formData.fromAccount)?.balance || 0,
                      accounts.find(acc => acc._id === formData.fromAccount)?.currency || 'USD'
                    )}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Card to Use *
                </label>
                <select
                  name="cardId"
                  value={formData.cardId}
                  onChange={handleInputChange}
                  className="w-full bg-white/30 backdrop-blur-md border border-white/40 rounded-xl px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  required
                  disabled={!formData.fromAccount}
                >
                  <option value="">Select Card</option>
                  {getAvailableCards().map(card => (
                    <option key={card._id} value={card._id}>
                      {card.cardNumber?.replace(/(\d{4})(\d{4})(\d{4})(\d{4})/, '$1****$3****')} - {card.cardName}
                    </option>
                  ))}
                </select>
                {formData.fromAccount && getAvailableCards().length === 0 && (
                  <p className="text-xs text-red-600 mt-1">
                    No active cards available for this account
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="submit"
                disabled={formLoading}
                className="bg-blue-500/80 backdrop-blur-md border border-blue-400/50 text-white px-4 py-2 rounded-xl hover:bg-blue-600/80 transition-all duration-300 disabled:opacity-50"
              >
                {formLoading ? 'Processing...' : 'Transfer'}
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

      {/* Transfers List */}
      <div className="grid grid-cols-1 gap-4">
        {transfers.map((transfer) => (
          <div
            key={transfer._id}
            className="bg-white/20 backdrop-blur-xl border border-white/40 rounded-2xl shadow-xl p-6 ring-1 ring-white/10 hover:bg-white/25 transition-all duration-300"
          >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <ArrowLeftRight className="w-5 h-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    {formatRate(transfer.amount, transfer.fromAccount?.currency)}
                  </h3>
                  <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                    transfer.status === 'completed' 
                      ? 'bg-green-100/60 text-green-800'
                      : transfer.status === 'failed'
                      ? 'bg-red-100/60 text-red-800'
                      : 'bg-yellow-100/60 text-yellow-800'
                  }`}>
                    {transfer.status || 'pending'}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">From:</span>
                    <p className="font-medium text-gray-900">{transfer.fromAccount?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">To:</span>
                    <p className="font-medium text-gray-900">{transfer.toAccount?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Card:</span>
                    <p className="font-medium text-gray-900">
                      {transfer.card?.cardNumber?.replace(/(\d{4})(\d{4})(\d{4})(\d{4})/, '$1****$3****') || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Date:</span>
                    <p className="font-medium text-gray-900">
                      {new Date(transfer.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => handleViewTransfer(transfer)}
                className="flex items-center gap-1 bg-blue-100/60 backdrop-blur-md text-blue-700 px-3 py-1 rounded-lg hover:bg-blue-200/60 transition-all duration-300 text-sm"
              >
                <Eye className="w-3 h-3" />
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {transfers.length === 0 && !loading && (
        <div className="text-center py-12">
          <ArrowLeftRight className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No transfers found</h3>
          <p className="text-gray-600 mb-4">Get started by creating your first transfer.</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 bg-blue-500/80 backdrop-blur-md border border-blue-400/50 text-white px-4 py-2 rounded-xl hover:bg-blue-600/80 transition-all duration-300"
          >
            <Plus className="w-4 h-4" />
            Create First Transfer
          </button>
        </div>
      )}
    </div>
  );
};

export default Transfers;
