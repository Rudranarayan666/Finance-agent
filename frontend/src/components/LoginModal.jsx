import React, { useState } from 'react';
import { Lock, Mail, User, KeyRound, Sparkles, X, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
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

  const isAdmin = email.toLowerCase().includes('admin');

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('Please enter a valid corporate email.');
      return;
    }
    if (password.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }

    setIsLoading(true);
    try {
      if (isRegister) {
        const finalRole = cleanEmail.includes('admin') ? 'admin' : role;
        await api.register(cleanEmail, password, fullName, finalRole);
      }
      const loginRes = await api.login(cleanEmail, password);
      setIsLoading(false);
      
      try {
        confetti({ particleCount: 50, spread: 50, origin: { y: 0.6 } });
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 font-mono text-zinc-900">
      <div className="bg-white border-3 border-black shadow-[6px_6px_0px_0px_#000000] max-w-md w-full p-6 relative space-y-4">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 border-2 border-black bg-zinc-100 hover:bg-[#FFE600] transition"
        >
          <X className="w-4 h-4 stroke-[3]" />
        </button>

        {/* Brand Header */}
        <div className="border-b-2 border-black pb-3 text-center space-y-1">
          <div className="w-9 h-9 bg-[#FFE600] border-2 border-black shadow-[2px_2px_0px_0px_#000] mx-auto flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-black stroke-[2.5]" />
          </div>
          <h2 className="text-base font-black text-black uppercase tracking-wider">
            FINANCEAGENT ACCESS PORTAL
          </h2>
          <p className="text-[10px] text-zinc-600 font-sans">
            Role-Based Access Control &bull; Grounded Citations Engine
          </p>
        </div>

        {/* Tab switch */}
        <div className="grid grid-cols-2 gap-1 bg-zinc-100 p-1 border-2 border-black">
          <button
            type="button"
            onClick={() => setIsRegister(false)}
            className={`py-1 text-xs font-bold uppercase ${
              !isRegister ? 'bg-[#FFE600] text-black border-2 border-black shadow-[2px_2px_0px_0px_#000]' : 'text-zinc-600 hover:text-black'
            }`}
          >
            SIGN IN
          </button>
          <button
            type="button"
            onClick={() => setIsRegister(true)}
            className={`py-1 text-xs font-bold uppercase ${
              isRegister ? 'bg-[#FFE600] text-black border-2 border-black shadow-[2px_2px_0px_0px_#000]' : 'text-zinc-600 hover:text-black'
            }`}
          >
            REGISTER
          </button>
        </div>

        {/* Admin detection hint */}
        {isAdmin && (
          <div className="p-2 bg-[#FFF9C4] border-2 border-black text-[11px] text-black font-sans flex items-center gap-1.5 font-bold">
            <ShieldCheck className="w-4 h-4 text-black stroke-[2.5]" />
            <span>Administrator access will be granted for this email.</span>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-2.5 bg-[#FEE2E2] border-2 border-black text-xs text-rose-950 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
            <span className="font-sans text-[11px] font-semibold">{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {isRegister && (
            <div>
              <label className="block text-[10px] font-black uppercase text-black mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Analyst"
                className="neo-input"
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] font-black uppercase text-black mb-1">
              Corporate Email (use "admin" for Admin Rights)
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="analyst@finance.corp"
              className="neo-input"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-black mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="neo-input"
            />
          </div>

          {isRegister && (
            <div>
              <label className="block text-[10px] font-black uppercase text-black mb-1">
                Role Tier
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="neo-input cursor-pointer"
              >
                <option value="analyst">Analyst (Extraction &amp; RAG)</option>
                <option value="admin">Admin (Site-Wide Control &amp; Audits)</option>
                <option value="viewer">Viewer (Read-Only Access)</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="neo-button-primary w-full justify-center py-2 text-xs font-black shadow-[3px_3px_0px_0px_#000000] mt-1"
          >
            {isLoading ? 'VERIFYING...' : isRegister ? 'CREATE ACCOUNT' : 'ENTER WORKSPACE'}
          </button>
        </form>

        {/* 1-Click Evaluation Presets */}
        <div className="pt-2 border-t-2 border-black">
          <div className="text-[10px] font-black uppercase text-zinc-500 text-center mb-1.5">
            DEMO PRESET ACCOUNTS:
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemoRole('admin')}
              className="neo-button-secondary text-[11px] py-1 justify-center bg-[#FFF9C4] font-black"
            >
              ADMIN
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoRole('analyst')}
              className="neo-button-secondary text-[11px] py-1 justify-center bg-[#E0F2FE] font-black"
            >
              ANALYST
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoRole('viewer')}
              className="neo-button-secondary text-[11px] py-1 justify-center bg-[#F4F4F5] font-black"
            >
              VIEWER
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
