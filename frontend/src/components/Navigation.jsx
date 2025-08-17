import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Building2, 
  Wallet, 
  CreditCard, 
  ArrowUpCircle, 
  ArrowLeftRight, 
  Route, 
  Shield, 
  TrendingUp, 
  Menu, 
  X 
} from 'lucide-react';

const Navigation = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navigationItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/bank-providers', icon: Building2, label: 'Bank Providers' },
    { path: '/bank-accounts', icon: Wallet, label: 'Bank Accounts' },
    { path: '/cards', icon: CreditCard, label: 'Virtual Cards' },
    { path: '/topups', icon: ArrowUpCircle, label: 'TopUps' },
    { path: '/transactions', icon: ArrowLeftRight, label: 'Transfers' },
    { path: '/multi-step', icon: Route, label: 'Multi-Step' },
    { path: '/fraud-detection', icon: Shield, label: 'Fraud Detection' },
    { path: '/analytics', icon: TrendingUp, label: 'Analytics' },
  ];

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden lg:block fixed left-0 top-0 bg-white/10 dark:bg-slate-800/20 backdrop-blur-lg border-r border-white/30 dark:border-slate-700/30 w-64 h-full shadow-lg dark:shadow-slate-900/20 z-30 transition-colors duration-300">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-8 transition-colors duration-300">FX Management</h2>
          <ul className="space-y-2">
            {navigationItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                    isActive(item.path)
                      ? 'bg-white/30 dark:bg-slate-700/40 backdrop-blur-md border border-white/40 dark:border-slate-600/40 text-gray-900 dark:text-slate-100 shadow-lg dark:shadow-slate-900/20'
                      : 'text-gray-700 dark:text-slate-300 hover:bg-white/20 dark:hover:bg-slate-700/30 hover:backdrop-blur-md hover:border hover:border-white/30 dark:hover:border-slate-600/30 hover:shadow-md dark:hover:shadow-slate-900/10 hover:text-gray-900 dark:hover:text-slate-100'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <div className="lg:hidden">
        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="fixed top-4 left-4 z-50 bg-white/20 dark:bg-slate-800/30 backdrop-blur-xl border border-white/40 dark:border-slate-600/40 rounded-xl p-3 shadow-lg dark:shadow-slate-900/20 transition-colors duration-300"
        >
          {isMobileMenuOpen ? (
            <X className="w-6 h-6 text-gray-900 dark:text-slate-100 transition-colors duration-300" />
          ) : (
            <Menu className="w-6 h-6 text-gray-900 dark:text-slate-100 transition-colors duration-300" />
          )}
        </button>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-40 bg-black/50 dark:bg-black/70 backdrop-blur-sm lg:hidden transition-colors duration-300">
            <nav className="fixed left-0 top-0 h-full w-80 bg-white/10 dark:bg-slate-800/20 backdrop-blur-lg border-r border-white/30 dark:border-slate-700/30 shadow-lg dark:shadow-slate-900/20 transition-colors duration-300">
              <div className="p-6 pt-20">
                <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-8 transition-colors duration-300">FX Management</h2>
                <ul className="space-y-2">
                  {navigationItems.map((item) => (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                          isActive(item.path)
                            ? 'bg-white/30 dark:bg-slate-700/40 backdrop-blur-md border border-white/40 dark:border-slate-600/40 text-gray-900 dark:text-slate-100 shadow-lg dark:shadow-slate-900/20'
                            : 'text-gray-700 dark:text-slate-300 hover:bg-white/20 dark:hover:bg-slate-700/30 hover:backdrop-blur-md hover:border hover:border-white/30 dark:hover:border-slate-600/30 hover:shadow-md dark:hover:shadow-slate-900/10 hover:text-gray-900 dark:hover:text-slate-100'
                        }`}
                      >
                        <item.icon className="w-5 h-5" />
                        <span className="font-medium">{item.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </nav>
          </div>
        )}
      </div>
    </>
  );
};

export default Navigation;
