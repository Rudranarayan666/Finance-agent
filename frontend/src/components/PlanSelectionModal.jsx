import React, { useState } from 'react';
import { 
  Sparkles, 
  Check, 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  FileText, 
  Loader2,
  ArrowLeft,
  X,
  Lock,
  CheckCircle2
} from 'lucide-react';
import { api } from '../services/api';

export default function PlanSelectionModal({ 
  isOpen,
  user, 
  onClose,
  onPlanSelected,
  onBackToLanding 
}) {
  const [loadingKey, setLoadingKey] = useState(null);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const currentPlanKey = (user?.plan_key || user?.subscription?.plan?.key || '').toLowerCase();

  const handleSelectPlan = async (planKey) => {
    setLoadingKey(planKey);
    setError(null);
    try {
      const res = await api.selectPlan(planKey);
      if (onPlanSelected) onPlanSelected(res);
    } catch (err) {
      setError(err.message || `Failed to activate ${planKey.toUpperCase()} plan.`);
    } finally {
      setLoadingKey(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm font-mono text-black animate-in fade-in">
      <div className="bg-white border-3 border-black shadow-[8px_8px_0px_0px_#000] w-full max-w-3xl p-6 sm:p-8 space-y-6 relative max-h-[90vh] overflow-y-auto">
        
        {/* Top Actions: Back to landing or Close */}
        <div className="flex items-center justify-between border-b-2 border-black pb-3">
          {onBackToLanding ? (
            <button
              onClick={onBackToLanding}
              className="neo-button-secondary text-xs py-1 px-2.5 flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>BACK TO LANDING PAGE</span>
            </button>
          ) : <div />}

          <div className="flex items-center gap-2">
            {currentPlanKey && onClose && (
              <button
                onClick={onClose}
                className="neo-button-primary text-xs py-1 px-3 flex items-center gap-1 cursor-pointer"
              >
                <span>CONTINUE WITH CURRENT PLAN</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            {(onClose || onBackToLanding) && (
              <button
                onClick={onClose || onBackToLanding}
                className="text-black p-1 border-2 border-black bg-zinc-100 hover:bg-[#FFE600] transition cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4 stroke-[3]" />
              </button>
            )}
          </div>
        </div>

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FFE600] border-2 border-black shadow-[2px_2px_0px_0px_#000] text-xs font-black uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{currentPlanKey ? 'ACTIVE SUBSCRIPTION · SWITCH OR RENEW PLAN' : 'ACCOUNT CREATED · SELECT YOUR WORKSPACE TIER'}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black uppercase text-black">
            {currentPlanKey ? 'Your Current Subscription Plans' : 'Choose Your Subscription Plan'}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-600 font-bold max-w-lg mx-auto font-sans">
            {currentPlanKey 
              ? 'You have an active plan. Select a tier below to change allowances or keep your current workspace setup.'
              : 'Select any tier to enter your private workspace. Credits and document quotas are assigned immediately. No payment details required.'}
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-100 border-2 border-black text-rose-900 text-xs font-bold">
            {error}
          </div>
        )}

        {/* 3 Plan Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          {/* BASIC */}
          <div className={`border-2 border-black p-4 space-y-4 flex flex-col justify-between hover:bg-zinc-50 transition shadow-[3px_3px_0px_0px_#000] bg-white ${
            currentPlanKey === 'basic' ? 'ring-2 ring-emerald-500 bg-emerald-50/20' : ''
          }`}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-zinc-200 border border-black inline-block">
                  FREE FOREVER
                </span>
                {currentPlanKey === 'basic' && (
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 bg-emerald-500 text-white border border-black">
                    CURRENT
                  </span>
                )}
              </div>
              <div>
                <h4 className="text-lg font-black uppercase text-black">BASIC</h4>
                <p className="text-2xl font-black text-black">₹0<span className="text-xs font-normal text-zinc-500">/mo</span></p>
              </div>
              <ul className="text-xs font-bold space-y-1.5 text-zinc-800 pt-1 border-t border-zinc-200">
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                  <span>2 active documents</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                  <span>100 monthly credits</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                  <span>5 questions / filing</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                  <span>Verified citations</span>
                </li>
                <li className="flex items-center gap-1.5 text-zinc-400">
                  <Lock className="w-3.5 h-3.5" />
                  <span>No report downloads</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => handleSelectPlan('basic')}
              disabled={loadingKey !== null}
              className={`w-full border-2 border-black py-2.5 font-black text-xs uppercase shadow-[2px_2px_0px_0px_#000] cursor-pointer flex items-center justify-center gap-1.5 transition ${
                currentPlanKey === 'basic' ? 'bg-emerald-100 text-emerald-950' : 'bg-white hover:bg-zinc-100'
              }`}
            >
              {loadingKey === 'basic' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>{currentPlanKey === 'basic' ? 'CURRENT ACTIVE PLAN' : 'SELECT BASIC (FREE)'}</span>
            </button>
          </div>

          {/* PRO */}
          <div className={`border-3 border-black p-4 space-y-4 flex flex-col justify-between bg-[#FFFDE7] relative shadow-[5px_5px_0px_0px_#000] ${
            currentPlanKey === 'pro' ? 'ring-2 ring-emerald-500' : ''
          }`}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-[#FFE600] border border-black shadow-[1px_1px_0px_0px_#000] inline-block">
                  RECOMMENDED
                </span>
                {currentPlanKey === 'pro' && (
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 bg-emerald-500 text-white border border-black">
                    CURRENT
                  </span>
                )}
              </div>
              <div>
                <h4 className="text-lg font-black uppercase text-black">PRO</h4>
                <p className="text-2xl font-black text-black">₹299<span className="text-xs font-normal text-zinc-500">/mo</span></p>
              </div>
              <ul className="text-xs font-bold space-y-1.5 text-zinc-800 pt-1 border-t border-zinc-200">
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                  <span>10 active documents</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                  <span>500 monthly credits</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                  <span>10 questions / filing</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                  <span>Download reports (PDF/MD)</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                  <span>Multi-year comparisons</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => handleSelectPlan('pro')}
              disabled={loadingKey !== null}
              className={`w-full border-2 border-black py-2.5 font-black text-xs uppercase shadow-[2px_2px_0px_0px_#000] cursor-pointer flex items-center justify-center gap-1.5 transition ${
                currentPlanKey === 'pro' ? 'bg-emerald-400 text-black' : 'bg-[#FFE600] hover:bg-amber-400'
              }`}
            >
              {loadingKey === 'pro' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>{currentPlanKey === 'pro' ? 'CURRENT ACTIVE PLAN' : 'SELECT PRO PLAN · ₹299'}</span>
            </button>
          </div>

          {/* PREMIUM */}
          <div className={`border-2 border-black p-4 space-y-4 flex flex-col justify-between hover:bg-zinc-50 transition shadow-[3px_3px_0px_0px_#000] bg-white ${
            currentPlanKey === 'premium' ? 'ring-2 ring-emerald-500' : ''
          }`}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-black text-white border border-black inline-block">
                  MAX POWER
                </span>
                {currentPlanKey === 'premium' && (
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 bg-emerald-500 text-white border border-black">
                    CURRENT
                  </span>
                )}
              </div>
              <div>
                <h4 className="text-lg font-black uppercase text-black">PREMIUM</h4>
                <p className="text-2xl font-black text-black">₹799<span className="text-xs font-normal text-zinc-500">/mo</span></p>
              </div>
              <ul className="text-xs font-bold space-y-1.5 text-zinc-800 pt-1 border-t border-zinc-200">
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                  <span>50 active documents</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                  <span>2,000 monthly credits</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                  <span>20 questions / filing</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                  <span>Priority compute</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                  <span>Full executive exports</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => handleSelectPlan('premium')}
              disabled={loadingKey !== null}
              className={`w-full border-2 border-black py-2.5 font-black text-xs uppercase shadow-[2px_2px_0px_0px_#000] cursor-pointer flex items-center justify-center gap-1.5 transition ${
                currentPlanKey === 'premium' ? 'bg-emerald-600 text-white' : 'bg-black hover:bg-zinc-800 text-white'
              }`}
            >
              {loadingKey === 'premium' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>{currentPlanKey === 'premium' ? 'CURRENT ACTIVE PLAN' : 'SELECT PREMIUM · ₹799'}</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
