import React, { useState } from 'react';
import { 
  Check, 
  Sparkles, 
  Shield, 
  Zap, 
  FileText, 
  Download, 
  HelpCircle, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Lock,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';

export default function PricingView({ 
  user, 
  currentSubscription, 
  onSubscriptionUpdated,
  onNavigate 
}) {
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const activePlanKey = (currentSubscription?.plan?.key || user?.plan_key || 'basic').toLowerCase();

  const handleSelectPlan = async (planKey) => {
    setLoadingPlan(planKey);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await api.selectPlan(planKey);
      setSuccessMsg(`Successfully activated ${res.plan?.name || planKey.toUpperCase()} plan! Workspace updated with ${res.plan?.monthly_credits || ''} monthly credits.`);
      if (onSubscriptionUpdated) onSubscriptionUpdated(res);
    } catch (err) {
      setErrorMsg(err.message || `Failed to activate ${planKey.toUpperCase()} plan.`);
    } finally {
      setLoadingPlan(null);
    }
  };

  const handlePaidCheckout = async (planKey) => {
    setLoadingPlan(planKey);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      // 1. Create order on backend
      const orderData = await api.checkoutSubscription(planKey);

      // 2. In Test / Sandbox Mode, simulate verified Razorpay checkout
      const mockPaymentId = `pay_test_${Math.random().toString(36).substring(2, 10)}`;
      const mockSignature = `test_sig_sandbox_${Math.random().toString(36).substring(2, 10)}`;

      // 3. Complete backend verification and activation
      const activatedSub = await api.verifyPayment(
        orderData.order_id,
        mockPaymentId,
        mockSignature,
        planKey
      );

      setSuccessMsg(`Payment verified! ${activatedSub.plan.name} plan activated with ${activatedSub.plan.monthly_credits} monthly credits.`);
      if (onSubscriptionUpdated) onSubscriptionUpdated(activatedSub);
    } catch (err) {
      setErrorMsg(err.message || `Payment activation failed for ${planKey.toUpperCase()}.`);
    } finally {
      setLoadingPlan(null);
    }
  };

  const plans = [
    {
      key: 'basic',
      name: 'BASIC',
      subtitle: 'Starter Financial Explorer',
      price: '₹0',
      period: 'per month',
      badge: 'FREE FOREVER',
      badgeColor: 'bg-zinc-200 text-black border-zinc-400',
      description: 'Essential AI-assisted analysis for individual investors and students.',
      limits: {
        documents: '2 active documents simultaneously',
        credits: '100 credits per month',
        questions: 'Up to 5 questions per document / cycle'
      },
      features: [
        'Basic PDF upload & secure processing',
        'Deterministic semantic search & RAG chat',
        'Verified source page citations',
        'Standard document management',
        'Real-time credit usage meter',
        'Upgrade prompts upon limit reach'
      ],
      notIncluded: [
        'Financial report PDF downloads',
        'Multi-year KPI comparison exports',
        'Priority model execution queue'
      ]
    },
    {
      key: 'pro',
      name: 'PRO',
      subtitle: 'Professional Financial Analyst',
      price: '₹299',
      period: 'per month',
      badge: 'MOST POPULAR',
      badgeColor: 'bg-[#FFE600] text-black border-black',
      isPopular: true,
      description: 'Comprehensive tooling for equity researchers, financial advisors, and CFOs.',
      limits: {
        documents: '10 active documents simultaneously',
        credits: '500 credits per month',
        questions: 'Up to 10 questions per document / cycle'
      },
      features: [
        'All Basic features included',
        'Financial KPI ratio analysis',
        'Multi-year filing comparisons',
        'Downloadable financial reports & summaries',
        'Full CSV & PDF analysis exports',
        'Persistent usage history & billing portal',
        'Standard customer support'
      ],
      notIncluded: [
        'Dedicated high-throughput priority queue'
      ]
    },
    {
      key: 'premium',
      name: 'PREMIUM',
      subtitle: 'Institutional & Enterprise Scale',
      price: '₹799',
      period: 'per month',
      badge: 'MAXIMUM POWER',
      badgeColor: 'bg-black text-white border-black',
      description: 'High-volume intelligence for investment funds, hedge funds, and audit firms.',
      limits: {
        documents: '50 active documents (configurable to 100+)',
        credits: '2,000 credits per month',
        questions: 'Up to 20 questions per document / cycle'
      },
      features: [
        'All Pro features included',
        'Massive 50 active filing library',
        '2,000 monthly credits allowance',
        'Up to 20 questions per filing cap',
        'Full financial statement table extraction',
        'Downloadable verified audit reports',
        'Priority GPU model inference speed',
        'Enterprise data isolation'
      ],
      notIncluded: []
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 font-mono text-black space-y-8 animate-in fade-in">
      
      {/* Title & Introduction */}
      <div className="text-center space-y-3 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 border-2 border-black bg-[#FFE600] shadow-[2px_2px_0px_0px_#000] text-xs font-black uppercase">
          <Sparkles className="w-3.5 h-3.5" />
          <span>FLEXIBLE SAAS SUBSCRIPTIONS & CREDIT TIERS</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-black">
          Transparent Pricing for Financial Intelligence
        </h1>
        <p className="text-sm text-zinc-600 font-bold">
          Choose the right capacity for your research needs. Scale active documents, monthly credits, and question caps on demand with instant activation.
        </p>

        {/* Razorpay Test Mode Notice */}
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-100 border border-black text-[11px] font-bold text-zinc-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span>Razorpay Test Sandbox Mode Active &bull; Instant Verification & Mock Activation</span>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="border-3 border-black bg-emerald-100 p-4 shadow-[4px_4px_0px_0px_#000] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-800 shrink-0 stroke-[2.5]" />
            <p className="text-xs font-extrabold text-emerald-950 uppercase">{successMsg}</p>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('dashboard')}
              className="bg-black text-white px-3 py-1 text-xs font-black uppercase hover:bg-zinc-800"
            >
              GO TO WORKSPACE
            </button>
          )}
        </div>
      )}

      {errorMsg && (
        <div className="border-3 border-black bg-rose-100 p-4 shadow-[4px_4px_0px_0px_#000] flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-800 shrink-0 stroke-[2.5]" />
          <p className="text-xs font-extrabold text-rose-950 uppercase">{errorMsg}</p>
        </div>
      )}

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 pt-4">
        {plans.map((p) => {
          const isCurrent = activePlanKey === p.key;
          const isLoading = loadingPlan === p.key;

          return (
            <div
              key={p.key}
              className={`bg-white border-3 border-black p-6 space-y-6 flex flex-col justify-between transition-all relative ${
                p.isPopular 
                  ? 'shadow-[8px_8px_0px_0px_#000] -translate-y-1' 
                  : 'shadow-[5px_5px_0px_0px_#000]'
              } ${isCurrent ? 'ring-2 ring-emerald-500' : ''}`}
            >
              {/* Badge */}
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 border ${p.badgeColor}`}>
                  {p.badge}
                </span>
                {isCurrent && (
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-emerald-500 text-white border border-black shadow-[1px_1px_0px_0px_#000]">
                    CURRENT PLAN
                  </span>
                )}
              </div>

              {/* Plan Header */}
              <div className="space-y-1">
                <h3 className="text-xl font-black uppercase text-black">{p.name}</h3>
                <p className="text-xs text-zinc-500 font-bold">{p.subtitle}</p>
                <div className="pt-2 flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-black text-black">{p.price}</span>
                  <span className="text-xs text-zinc-500 font-bold">{p.period}</span>
                </div>
                <p className="text-xs text-zinc-600 pt-2 font-bold leading-relaxed">{p.description}</p>
              </div>

              {/* Core Limits Box */}
              <div className="border-2 border-black bg-zinc-50 p-3 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-black">
                  <FileText className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                  <span>{p.limits.documents}</span>
                </div>
                <div className="flex items-center gap-2 font-black">
                  <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>{p.limits.credits}</span>
                </div>
                <div className="flex items-center gap-2 font-black">
                  <HelpCircle className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                  <span>{p.limits.questions}</span>
                </div>
              </div>

              {/* Included Features */}
              <div className="space-y-2 pt-2 flex-1">
                <span className="text-[10px] font-black uppercase text-zinc-500 tracking-wider block">
                  INCLUDED FEATURES:
                </span>
                <ul className="space-y-2 text-xs font-bold">
                  {p.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5 stroke-[3]" />
                      <span>{feat}</span>
                    </li>
                  ))}
                  {p.notIncluded.map((notFeat, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-zinc-400">
                      <Lock className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                      <span>{notFeat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Button */}
              <div className="pt-4 border-t-2 border-black">
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full bg-zinc-200 text-zinc-600 border-2 border-black py-2.5 px-4 font-black text-xs uppercase cursor-not-allowed shadow-[2px_2px_0px_0px_#000]"
                  >
                    ACTIVE PLAN
                  </button>
                ) : p.key === 'basic' ? (
                  <button
                    onClick={() => handleSelectPlan('basic')}
                    disabled={isLoading}
                    className="w-full bg-white hover:bg-zinc-100 text-black border-2 border-black py-2.5 px-4 font-black text-xs uppercase shadow-[3px_3px_0px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    <span>SWITCH TO BASIC</span>
                  </button>
                ) : (
                  <div className="space-y-2">
                    <button
                      onClick={() => handleSelectPlan(p.key)}
                      disabled={isLoading}
                      className="w-full bg-[#FFE600] hover:bg-amber-400 text-black border-2 border-black py-2.5 px-4 font-black text-xs uppercase shadow-[3px_3px_0px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 transition cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <span>ACTIVATE {p.name} (INSTANT)</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePaidCheckout(p.key)}
                      disabled={isLoading}
                      className="w-full text-center text-[10px] font-bold text-zinc-500 hover:text-black underline cursor-pointer py-0.5"
                    >
                      Or simulate Razorpay test checkout &rarr;
                    </button>
                  </div>
                )}
              </div>

            </div>
          );
        })}
      </div>

      {/* Credit Consumption Breakdown Table */}
      <div className="border-3 border-black bg-white p-6 shadow-[5px_5px_0px_0px_#000] space-y-4">
        <h3 className="text-base font-black uppercase text-black flex items-center gap-2">
          <Zap className="w-4 h-4 text-black stroke-[2.5]" />
          <span>TRANSPARENT CREDIT CONSUMPTION MATRIX</span>
        </h3>
        <p className="text-xs text-zinc-600 font-bold">
          Credits are debited strictly upon successful operation completion. Failed queries, blocked injection attempts, or rejected uploads are never charged.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-black">
            <thead className="bg-[#FFE600] border-b-2 border-black text-black">
              <tr>
                <th className="p-2.5 border-r border-black font-black uppercase">Operation</th>
                <th className="p-2.5 border-r border-black font-black uppercase">Credit Cost</th>
                <th className="p-2.5 border-r border-black font-black uppercase">Gating & Protection</th>
                <th className="p-2.5 font-black uppercase">Failure Policy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black font-bold">
              <tr>
                <td className="p-2.5 border-r border-black">PDF Upload & Multimodal Indexing</td>
                <td className="p-2.5 border-r border-black font-black text-emerald-700">10 credits</td>
                <td className="p-2.5 border-r border-black">Enforces active document allowance limit</td>
                <td className="p-2.5 text-zinc-600">Zero charge on validation or parsing failure</td>
              </tr>
              <tr>
                <td className="p-2.5 border-r border-black">AI Chatbot Grounded Question</td>
                <td className="p-2.5 border-r border-black font-black text-emerald-700">15 credits</td>
                <td className="p-2.5 border-r border-black">Enforces per-document question cap (5 / 10 / 20)</td>
                <td className="p-2.5 text-zinc-600">Zero charge on rejected input or model failure</td>
              </tr>
              <tr>
                <td className="p-2.5 border-r border-black">Visual & Chart Region Analysis</td>
                <td className="p-2.5 border-r border-black font-black text-emerald-700">10 credits</td>
                <td className="p-2.5 border-r border-black">Extracts high-resolution visual bounding boxes</td>
                <td className="p-2.5 text-zinc-600">Zero charge on OCR/render failure</td>
              </tr>
              <tr>
                <td className="p-2.5 border-r border-black">Financial Report PDF Export & Download</td>
                <td className="p-2.5 border-r border-black font-black text-black">Included (0 cr)</td>
                <td className="p-2.5 border-r border-black">Restricted to Pro and Premium subscribers</td>
                <td className="p-2.5 text-zinc-600">Basic tier receives 403 upgrade prompt</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
