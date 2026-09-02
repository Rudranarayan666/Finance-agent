import React, { useState } from 'react';
import { Lock, Mail, User, KeyRound, Sparkles, X, AlertCircle, CheckCircle2, Shield } from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';

export default function LoginModal({ isOpen, onClose, onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('analyst@finance.corp');
  const [password, setPassword] = useState('AnalystPass123!');
  const [fullName, setFullName] = useState('Senior Equity Analyst');
  const [role, setRole] = useState('analyst');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isRegister) {
        await api.register(email, password, fullName, role);
      }
      const loginRes = await api.login(email, password);
      setIsLoading(false);
      
      // Confetti celebration on login
      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 }
        });
      } catch (e) {}

      onLoginSuccess(loginRes.user);
      onClose();
    } catch (err) {
      setIsLoading(false);
      setError(err.message || 'Authentication failed. Please verify credentials.');
    }
  };

  const handleQuickDemoRole = (roleType) => {
    if (roleType === 'admin') {
      setEmail('admin@finance.corp');
      setPassword('AdminPass123!');
      setFullName('Chief Risk Officer');
      setRole('admin');
    } else if (roleType === 'analyst') {
      setEmail('analyst@finance.corp');
      setPassword('AnalystPass123!');
      setFullName('Senior Equity Analyst');
      setRole('analyst');
    } else {
      setEmail('viewer@finance.corp');
      setPassword('ViewerPass123!');
      setFullName('Portfolio Investor');
      setRole('viewer');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-[#0e1424] border border-slate-700/90 w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        
        {/* Top Accent Gradient */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-950">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            {isRegister ? 'Create Corporate Account' : 'Sign In to FinanceAgent'}
          </h2>
          <p className="text-xs text-slate-400">
            Multi-Agent Financial Analyzer • Role-Based Access Control
          </p>
        </div>

        {/* Quick Role Demo Selector */}
        <div className="mb-6 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5">
          <div className="text-[11px] font-mono uppercase text-slate-400 flex items-center justify-between">
            <span>One-Click Role Presets:</span>
            <span className="text-emerald-400 font-bold">Auto-Seeded</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemoRole('analyst')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition flex flex-col items-center space-y-0.5 border ${
                role === 'analyst'
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-lg shadow-emerald-950'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              <span>Analyst</span>
              <span className="text-[9px] font-normal opacity-80">Full Access</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemoRole('admin')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition flex flex-col items-center space-y-0.5 border ${
                role === 'admin'
                  ? 'bg-purple-600 text-white border-purple-400 shadow-lg shadow-purple-950'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              <span>Admin</span>
              <span className="text-[9px] font-normal opacity-80">Audit & Users</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemoRole('viewer')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition flex flex-col items-center space-y-0.5 border ${
                role === 'viewer'
                  ? 'bg-blue-600 text-white border-blue-400 shadow-lg shadow-blue-950'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              <span>Viewer</span>
              <span className="text-[9px] font-normal opacity-80">Shared Only</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center space-x-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {isRegister && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 font-mono">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Senior Financial Analyst"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1 font-mono">Corporate Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="analyst@finance.corp"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1 font-mono">Password</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold tracking-wide transition shadow-xl shadow-emerald-950 flex items-center justify-center space-x-2 mt-2"
          >
            <Sparkles className="w-4 h-4 text-white" />
            <span>{isLoading ? 'Authenticating...' : isRegister ? 'Register & Sign In' : 'Sign In to Dashboard'}</span>
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            className="text-xs text-slate-400 hover:text-emerald-400 transition"
          >
            {isRegister ? 'Already have an account? Sign In' : "Need a custom account? Register here"}
          </button>
        </div>

      </div>
    </div>
  );
}
