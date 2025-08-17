import { Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import Navigation from './components/Navigation';
import ThemeToggle from './components/ThemeToggle';
import RefreshButton from './components/RefreshButton';

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
    <ThemeProvider>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 dark:from-slate-900 dark:via-slate-800 dark:to-gray-900 transition-colors duration-300">
        {/* Navigation Sidebar */}
        <Navigation />
        
        {/* Main Content Wrapper */}
        <div className="lg:ml-64">
          {/* Header */}
          <header className="bg-white/10 dark:bg-slate-800/20 backdrop-blur-lg border-b border-white/30 dark:border-slate-700/30 shadow-lg transition-colors duration-300 sticky top-0 z-40">
            <div className="px-6 sm:px-8 lg:px-12 py-3">
              <div className="max-w-6xl mx-auto relative flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100 transition-colors duration-300">FX Management System</h1>
                  <p className="text-gray-600 dark:text-slate-300 text-sm transition-colors duration-300">Complete foreign exchange and banking management solution</p>
                </div>
                
                {/* Theme Toggle and Refresh Button Container */}
                <div className="flex items-center gap-2">
                  <ThemeToggle />
                </div>
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
    </ThemeProvider>
  );
}


