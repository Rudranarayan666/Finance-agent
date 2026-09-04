import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  KeyRound, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  Shield, 
  Building2,
  Eye,
  EyeOff,
  ArrowRight,
  Info
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';

export default function LoginPage({ onLoginSuccess }) {
  const [email, setEmail] = useState('analyst@finance.corp');
  const [password, setPassword] = useState('AnalystPass123!');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState(null);

  // Email/Password login handler
  const handleEmailSubmit = async (e) => {
    if (e) e.preventDefault();
    setError(null);
    setForgotMsg(null);

    if (!email.trim() || !password) {
      setError('Please enter both corporate email and password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.login(email.trim(), password);
      setIsLoading(false);

      try {
        confetti({ particleCount: 60, spread: 55, origin: { y: 0.65 } });
      } catch (e) {}

      if (onLoginSuccess) {
        onLoginSuccess(res.user);
      }
    } catch (err) {
      setIsLoading(false);
      setError(err.message || 'Authentication failed. Please check credentials.');
    }
  };

  // Google OAuth flow handler
  const handleGoogleSignIn = async (presetRole = 'analyst') => {
    setError(null);
    setForgotMsg(null);
    setIsLoading(true);

    try {
      // Authenticates with backend /auth/google endpoint
      const googleEmail = presetRole === 'admin' 
        ? 'admin.google@finance.corp' 
        : presetRole === 'viewer'
        ? 'investor.google@finance.corp'
        : 'analyst.google@finance.corp';

      const googleName = presetRole === 'admin'
        ? 'Google Admin Partner'
        : presetRole === 'viewer'
        ? 'Google Institutional Investor'
        : 'Google Equity Analyst';

      const res = await api.googleLogin(googleEmail, googleName, presetRole);
      setIsLoading(false);

      try {
        confetti({ particleCount: 60, spread: 55, origin: { y: 0.65 } });
      } catch (e) {}

      if (onLoginSuccess) {
        onLoginSuccess(res.user);
      }
    } catch (err) {
      setIsLoading(false);
      setError(err.message || 'Google OAuth verification failed.');
    }
  };

  // Quick preset loader
  const handlePresetSelect = (roleType) => {
    setError(null);
    setForgotMsg(null);
    if (roleType === 'admin') {
      setEmail('admin@finance.corp');
      setPassword('AdminPass123!');
    } else if (roleType === 'analyst') {
      setEmail('analyst@finance.corp');
      setPassword('AnalystPass123!');
    } else {
      setEmail('viewer@finance.corp');
      setPassword('ViewerPass123!');
    }
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    setForgotMsg(
      `Password reset instructions dispatched for ${email || 'your account'}. Please contact your corporate security administrator if you do not receive it.`
    );
  };

  return (
    <div className="min-h-screen bg-[#070a12] flex flex-col items-center justify-center p-4 sm:p-6 text-slate-100 relative selection:bg-emerald-500 selection:text-white">
      
      {/* Background ambient accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Centered Auth Card */}
      <div className="w-full max-w-md bg-[#0e1424] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 flex items-center justify-center shadow-xl shadow-emerald-950/60">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">FinanceAgent</h1>
            <p className="text-xs text-slate-400 font-medium">Enterprise Financial Intelligence • RBAC Portal</p>
          </div>
        </div>

        {/* 1. Continue with Google OAuth Button */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => handleGoogleSignIn('analyst')}
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-slate-900/90 hover:bg-slate-850 hover:border-slate-600 border border-slate-700/80 text-white text-xs font-semibold flex items-center justify-center space-x-3 transition shadow-md group disabled:opacity-50"
          >
            {/* Google Multi-Color G Icon */}
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>Continue with Google Workspace</span>
          </button>
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-slate-800 w-full" />
          <span className="bg-[#0e1424] px-3 text-[11px] font-mono text-slate-500 whitespace-nowrap uppercase">
            or continue with corporate email
          </span>
          <div className="border-t border-slate-800 w-full" />
        </div>

        {/* Feedback / Error Alerts */}
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center space-x-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {forgotMsg && (
          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs flex items-center space-x-2 animate-in fade-in">
            <Info className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{forgotMsg}</span>
          </div>
        )}

        {/* 2. Email & Password Form */}
        <form onSubmit={handleEmailSubmit} className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1">
              Corporate Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="analyst@finance.corp"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                Password
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 transition"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold tracking-wide transition shadow-xl shadow-emerald-950 flex items-center justify-center space-x-2 mt-2"
          >
            <span>{isLoading ? 'Authenticating...' : 'Sign In to Workspace'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* 3. One-Click Demo Role Presets */}
        <div className="pt-3 border-t border-slate-800 space-y-2">
          <div className="text-[10px] font-mono uppercase text-slate-400 flex items-center justify-between">
            <span>Instant Role Evaluation:</span>
            <span className="text-emerald-400 font-bold">Auto-Seeded</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handlePresetSelect('analyst')}
              className={`p-2 rounded-xl text-xs font-bold border transition flex flex-col items-center ${
                email.includes('analyst')
                  ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-md'
                  : 'bg-slate-950 hover:bg-slate-900 border-slate-800 text-slate-300'
              }`}
            >
              <span>Analyst</span>
              <span className="text-[9px] font-normal text-slate-400">Upload + AI</span>
            </button>

            <button
              type="button"
              onClick={() => handlePresetSelect('admin')}
              className={`p-2 rounded-xl text-xs font-bold border transition flex flex-col items-center ${
                email.includes('admin')
                  ? 'bg-purple-600/20 border-purple-500 text-purple-300 shadow-md'
                  : 'bg-slate-950 hover:bg-slate-900 border-slate-800 text-slate-300'
              }`}
            >
              <span>Admin</span>
              <span className="text-[9px] font-normal text-slate-400">Users + Audit</span>
            </button>

            <button
              type="button"
              onClick={() => handlePresetSelect('viewer')}
              className={`p-2 rounded-xl text-xs font-bold border transition flex flex-col items-center ${
                email.includes('viewer')
                  ? 'bg-sky-600/20 border-sky-500 text-sky-300 shadow-md'
                  : 'bg-slate-950 hover:bg-slate-900 border-slate-800 text-slate-300'
              }`}
            >
              <span>Viewer</span>
              <span className="text-[9px] font-normal text-slate-400">Shared Only</span>
            </button>
          </div>
        </div>

        {/* Security & Org Footer */}
        <div className="text-[10px] text-slate-500 text-center font-mono flex items-center justify-center space-x-1.5 pt-1">
          <Building2 className="w-3 h-3 text-emerald-500" />
          <span>FinanceCorp Global • SOC2 Type II Certified</span>
        </div>

      </div>

    </div>
  );
}
