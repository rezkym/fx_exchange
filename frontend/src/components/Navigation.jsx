import { useState, useEffect } from 'react';
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
  X,
  ChevronDown,
  ChevronRight,
  Building,
  UserCheck
} from 'lucide-react';

const Navigation = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({});
  const location = useLocation();

  // Auto-expand Banking menu if user is on banking pages
  const bankingPaths = ['/bank-providers', '/bank-accounts', '/cards'];
  const isOnBankingPage = bankingPaths.includes(location.pathname);
  
  // Auto-expand Banking menu on initial load if on banking page
  useEffect(() => {
    if (isOnBankingPage) {
      setExpandedMenus(prev => ({ ...prev, 'Banking': true }));
    }
  }, [isOnBankingPage]);

  const navigationItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    {
      label: 'Banking',
      icon: Building,
      children: [
        { path: '/bank-providers', icon: Building2, label: 'Bank Providers' },
        { path: '/bank-accounts', icon: Wallet, label: 'Bank Accounts' },
        { path: '/cards', icon: CreditCard, label: 'Virtual Cards' },
      ]
    },
    { path: '/topups', icon: ArrowUpCircle, label: 'TopUps' },
    { path: '/transactions', icon: ArrowLeftRight, label: 'Transfers' },
    { path: '/multi-step', icon: Route, label: 'Multi-Step' },
    { path: '/fraud-detection', icon: Shield, label: 'Fraud Detection' },
    { path: '/analytics', icon: TrendingUp, label: 'Analytics' },
  ];

  const toggleMenu = (label) => {
    setExpandedMenus(prev => ({
      ...prev,
      [label]: !prev[label]
    }));
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const isParentActive = (children) => {
    return children?.some(child => location.pathname === child.path);
  };

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden lg:block fixed left-0 top-0 bg-white/10 dark:bg-slate-800/20 backdrop-blur-lg border-r border-white/30 dark:border-slate-700/30 w-64 h-full shadow-lg dark:shadow-slate-900/20 z-30 transition-colors duration-300">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-8 transition-colors duration-300">FX Management</h2>
          <ul className="space-y-2">
            {navigationItems.map((item, index) => (
              <li key={item.path || item.label}>
                {/* Regular menu item with path */}
                {item.path ? (
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
                ) : (
                  /* Parent menu item with children */
                  <div>
                    <button
                      onClick={() => toggleMenu(item.label)}
                      className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                        isParentActive(item.children)
                          ? 'bg-white/30 dark:bg-slate-700/40 backdrop-blur-md border border-white/40 dark:border-slate-600/40 text-gray-900 dark:text-slate-100 shadow-lg dark:shadow-slate-900/20'
                          : 'text-gray-700 dark:text-slate-300 hover:bg-white/20 dark:hover:bg-slate-700/30 hover:backdrop-blur-md hover:border hover:border-white/30 dark:hover:border-slate-600/30 hover:shadow-md dark:hover:shadow-slate-900/10 hover:text-gray-900 dark:hover:text-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="w-5 h-5" />
                        <span className="font-medium">{item.label}</span>
                      </div>
                      {expandedMenus[item.label] ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                    
                    {/* Child menu items */}
                    {expandedMenus[item.label] && (
                      <ul className="mt-2 ml-6 space-y-1">
                        {item.children?.map((child) => (
                          <li key={child.path}>
                            <Link
                              to={child.path}
                              className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-300 ${
                                isActive(child.path)
                                  ? 'bg-white/40 dark:bg-slate-600/50 backdrop-blur-md border border-white/50 dark:border-slate-500/50 text-gray-900 dark:text-slate-100 shadow-md dark:shadow-slate-900/15'
                                  : 'text-gray-600 dark:text-slate-400 hover:bg-white/25 dark:hover:bg-slate-600/35 hover:backdrop-blur-md hover:border hover:border-white/40 dark:hover:border-slate-500/40 hover:shadow-sm dark:hover:shadow-slate-900/10 hover:text-gray-900 dark:hover:text-slate-100'
                              }`}
                            >
                              <child.icon className="w-4 h-4" />
                              <span className="text-sm font-medium">{child.label}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
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
                  {navigationItems.map((item, index) => (
                    <li key={item.path || item.label}>
                      {/* Regular menu item with path */}
                      {item.path ? (
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
                      ) : (
                        /* Parent menu item with children */
                        <div>
                          <button
                            onClick={() => toggleMenu(item.label)}
                            className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                              isParentActive(item.children)
                                ? 'bg-white/30 dark:bg-slate-700/40 backdrop-blur-md border border-white/40 dark:border-slate-600/40 text-gray-900 dark:text-slate-100 shadow-lg dark:shadow-slate-900/20'
                                : 'text-gray-700 dark:text-slate-300 hover:bg-white/20 dark:hover:bg-slate-700/30 hover:backdrop-blur-md hover:border hover:border-white/30 dark:hover:border-slate-600/30 hover:shadow-md dark:hover:shadow-slate-900/10 hover:text-gray-900 dark:hover:text-slate-100'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <item.icon className="w-5 h-5" />
                              <span className="font-medium">{item.label}</span>
                            </div>
                            {expandedMenus[item.label] ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                          
                          {/* Child menu items */}
                          {expandedMenus[item.label] && (
                            <ul className="mt-2 ml-6 space-y-1">
                              {item.children?.map((child) => (
                                <li key={child.path}>
                                  <Link
                                    to={child.path}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-300 ${
                                      isActive(child.path)
                                        ? 'bg-white/40 dark:bg-slate-600/50 backdrop-blur-md border border-white/50 dark:border-slate-500/50 text-gray-900 dark:text-slate-100 shadow-md dark:shadow-slate-900/15'
                                        : 'text-gray-600 dark:text-slate-400 hover:bg-white/25 dark:hover:bg-slate-600/35 hover:backdrop-blur-md hover:border hover:border-white/40 dark:hover:border-slate-500/40 hover:shadow-sm dark:hover:shadow-slate-900/10 hover:text-gray-900 dark:hover:text-slate-100'
                                    }`}
                                  >
                                    <child.icon className="w-4 h-4" />
                                    <span className="text-sm font-medium">{child.label}</span>
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
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
