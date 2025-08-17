import { useState, useEffect, useCallback, useMemo } from 'react';
import { Routes, Route } from 'react-router-dom';
import { DollarSign, TrendingUp, Info } from 'lucide-react';
import { getCurrencies, getLive, getHistory } from './services/api';
import Chart from './components/Chart';
import Controls from './components/Controls';
import StatCard from './components/StatCard';
import Alert from './components/Alert';
import Converter from './components/Converter';
import Navigation from './components/Navigation';

// Import all pages
import BankProviders from './pages/BankProviders';
import BankAccounts from './pages/BankAccounts';
import VirtualCards from './pages/VirtualCards';
import TopUps from './pages/TopUps';
import Transfers from './pages/Transfers';
import MultiStepTransactions from './pages/MultiStepTransactions';
import FraudDetection from './pages/FraudDetection';
import Analytics from './pages/Analytics';

import Dashboard from './pages/Dashboard';

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100">
      {/* Navigation Sidebar */}
      <Navigation />
      
      {/* Main Content Wrapper */}
      <div className="lg:ml-64">
        {/* Header */}
        <header className="bg-white/10 backdrop-blur-lg border-b border-white/30 shadow-lg">
          <div className="px-6 sm:px-8 lg:px-12 py-6">
            <div className="max-w-6xl mx-auto">
              <h1 className="text-3xl font-bold text-gray-900">FX Management System</h1>
              <p className="text-gray-600 mt-1">Complete foreign exchange and banking management solution</p>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="px-6 sm:px-8 lg:px-12 py-8">
          <div className="max-w-6xl mx-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/bank-providers" element={<BankProviders />} />
              <Route path="/bank-accounts" element={<BankAccounts />} />
              <Route path="/cards" element={<VirtualCards />} />
              <Route path="/topups" element={<TopUps />} />
              <Route path="/transactions" element={<Transfers />} />
              <Route path="/multi-step" element={<MultiStepTransactions />} />
              <Route path="/fraud-detection" element={<FraudDetection />} />
              <Route path="/analytics" element={<Analytics />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}


