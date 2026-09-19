import React, { useState, useRef, useEffect } from 'react';
import { 
  BarChart3, 
  MessageSquare, 
  FileText, 
  Shield, 
  LogOut, 
  ChevronDown, 
  Menu, 
  X, 
  TrendingUp,
  Building2,
  Lock
} from 'lucide-react';

export default function Navbar({ user, onLogout, activeTab, setActiveTab, onOpenAuth }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (name) => {
    if (!name) return 'FA';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const navItems = [
    { id: 'visualizations', label: 'Analytics', icon: BarChart3 },
    { id: 'chat', label: 'AI Chat', icon: MessageSquare },
    { id: 'history', label: 'Documents', icon: FileText },
    ...(user?.role === 'admin' ? [{ id: 'admin', label: 'Admin', icon: Shield }] : [])
  ];

  const handleNavClick = (id) => {
    setActiveTab(id);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="border-b border-slate-800/80 bg-[#090d16]/95 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-15 flex items-center justify-between">
        
        {/* Brand Logo - Minimal & Clean */}
        <button 
          onClick={() => handleNavClick('visualizations')}
          className="flex items-center space-x-2.5 focus:outline-none group"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/25 transition">
            <TrendingUp className="w-4 h-4" />
          </div>
          <span className="font-bold text-base tracking-tight text-white group-hover:text-emerald-400 transition">
            FinanceAgent
          </span>
        </button>

        {/* Central Navigation Tabs (Desktop) - Clean, Uniform & Minimal */}
        {user && (
          <nav className="hidden md:flex items-center space-x-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id || (item.id === 'visualizations' && activeTab === 'dashboard');
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center space-x-2 ${
                    isActive
                      ? 'bg-slate-800 text-white shadow-sm border border-slate-700/60'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        )}

        {/* Right Section: User Profile & Mobile Hamburger */}
        <div className="flex items-center space-x-2">
          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-2 p-1.5 rounded-lg hover:bg-slate-900 border border-transparent hover:border-slate-800 transition focus:outline-none"
                title="Account Menu"
              >
                <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-semibold text-xs flex items-center justify-center">
                  {getInitials(user.full_name)}
                </div>
                <span className="hidden sm:inline text-xs font-medium text-slate-300 max-w-[120px] truncate">
                  {user.full_name || user.email}
                </span>
                <span className="hidden xs:inline text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  {user.role}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Minimal Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 top-11 w-56 rounded-xl bg-[#0c1220] border border-slate-800 shadow-xl p-3 space-y-2.5 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="pb-2 border-b border-slate-800/80 space-y-0.5">
                    <p className="text-xs font-semibold text-white truncate">{user.full_name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                    <div className="flex items-center space-x-1 text-[10px] text-emerald-400/90 pt-1">
                      <Building2 className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{user.organization_name || 'FinanceCorp Global'}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onLogout();
                    }}
                    className="w-full py-1.5 px-2.5 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 transition flex items-center space-x-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition flex items-center space-x-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}

          {/* Mobile Menu Toggle Button */}
          {user && (
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 focus:outline-none"
              aria-label="Toggle navigation"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}
        </div>

      </div>

      {/* Mobile Drawer Navigation */}
      {user && isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-[#090d16] px-4 py-2.5 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id || (item.id === 'visualizations' && activeTab === 'dashboard');
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full px-3 py-2 rounded-lg text-xs font-medium flex items-center space-x-2.5 transition ${
                  isActive
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
}
