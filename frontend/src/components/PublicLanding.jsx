import React from 'react';
import { 
  ShieldCheck, 
  FileCheck2, 
  Cpu, 
  BarChart3, 
  Lock, 
  ArrowRight, 
  CheckCircle2, 
  Database,
  Building2,
  FileSpreadsheet,
  HelpCircle,
  KeyRound,
  Zap,
  Layers,
  Search,
  Sparkles,
  Users,
  Check,
  Download,
  Flame
} from 'lucide-react';

export default function PublicLanding({ onOpenAuth }) {
  const handleAuth = (mode = 'register', plan = null) => {
    if (onOpenAuth) {
      onOpenAuth(mode, plan);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBFA] text-zinc-900 font-mono space-y-12 pb-16">
      
      {/* 1. HERO SECTION */}
      <section className="max-w-6xl mx-auto px-4 pt-8 sm:pt-12">
        <div className="neo-card bg-white border-3 shadow-[8px_8px_0px_0px_#000000] p-6 sm:p-12 space-y-6 text-center">
          
          <div className="inline-flex items-center gap-2 neo-badge bg-[#FFE600] text-black border-2 border-black font-extrabold text-xs">
            <Zap className="w-3.5 h-3.5 stroke-[3]" />
            <span>ENTERPRISE AGENTIC RAG &bull; DUCKDB ENGINE &bull; ZERO HALLUCINATIONS</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-black uppercase tracking-tight leading-tight max-w-4xl mx-auto">
            DETERMINISTIC FINANCIAL INTELLIGENCE &amp; <span className="bg-[#FFE600] px-2 py-0.5 border-2 border-black shadow-[3px_3px_0px_0px_#000]">AUDIT CITATIONS</span>
          </h1>

          <p className="text-xs sm:text-base text-zinc-700 max-w-2xl mx-auto leading-relaxed font-sans font-medium">
            Transform complex SEC 10-K &amp; 10-Q financial filings into verified executive scorecards. Powered by multi-agent table parsing, RRF reranking, in-memory DuckDB queries, and persistent credit accounting.
          </p>

          {/* Primary Action Buttons */}
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => handleAuth('register')}
              className="neo-button-primary text-xs sm:text-sm px-6 py-3 cursor-pointer flex items-center gap-2 shadow-[4px_4px_0px_0px_#000]"
            >
              <Zap className="w-4 h-4 stroke-[3]" />
              <span>GET STARTED &bull; SIGN UP FREE</span>
            </button>

            <button
              onClick={() => handleAuth('login')}
              className="neo-button-secondary text-xs sm:text-sm px-6 py-3 cursor-pointer flex items-center gap-2 shadow-[4px_4px_0px_0px_#000]"
            >
              <Lock className="w-4 h-4 stroke-[2.5]" />
              <span>SIGN IN TO WORKSPACE</span>
            </button>

            <a
              href="#plans"
              className="bg-white hover:bg-zinc-100 text-black border-2 border-black py-3 px-5 font-black text-xs sm:text-sm uppercase shadow-[3px_3px_0px_0px_#000] transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>VIEW 3 TIERS &amp; PRICING</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          {/* Instant Sandbox Notice */}
          <div className="pt-4 border-t-2 border-black max-w-xl mx-auto text-center">
            <span className="text-[11px] font-black uppercase text-zinc-800 bg-[#FFF9C4] border border-black px-2 py-0.5 inline-block">
              ⚡ DEV &amp; TEST READY: Select any tier immediately without requiring payment details!
            </span>
          </div>

        </div>
      </section>

      {/* 2. THREE-TIER SAAS SUBSCRIPTION PLANS */}
      <section id="plans" className="max-w-6xl mx-auto px-4 scroll-mt-20 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FFE600] border-2 border-black text-xs font-black uppercase shadow-[2px_2px_0px_0px_#000]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>TRANSPARENT TIER ARCHITECTURE</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black uppercase text-black">
            Choose Your FinanceAgent Plan
          </h2>
          <p className="text-xs sm:text-sm text-zinc-600 font-sans font-medium max-w-xl mx-auto">
            Persistent credit accounting, configurable active document storage, and strictly isolated private filings. Select a tier to begin immediately.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* TIER 1: BASIC (FREE) */}
          <div className="bg-white border-3 border-black p-6 space-y-6 flex flex-col justify-between shadow-[5px_5px_0px_0px_#000]">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-zinc-200 border border-black">
                  FREE FOREVER
                </span>
              </div>

              <div>
                <h3 className="text-xl font-black uppercase text-black">BASIC</h3>
                <p className="text-xs text-zinc-500 font-bold">Starter Financial Explorer</p>
                <div className="pt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-black">₹0</span>
                  <span className="text-xs font-bold text-zinc-500">/ month</span>
                </div>
              </div>

              <div className="p-3 bg-zinc-50 border-2 border-black space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-600">Active Documents:</span>
                  <strong className="text-black">2 Files Max</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Monthly Credits:</span>
                  <strong className="text-black">100 Credits</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Chatbot Limit:</span>
                  <strong className="text-black">5 Qs / document</strong>
                </div>
              </div>

              <ul className="text-xs space-y-2 font-medium">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 stroke-[3]" />
                  <span>Standard PDF upload &amp; indexing</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 stroke-[3]" />
                  <span>100% Verified page citations</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 stroke-[3]" />
                  <span>Deterministic 8-metric scorecard</span>
                </li>
                <li className="flex items-start gap-2 text-zinc-400">
                  <Lock className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                  <span>Report download &amp; exports locked</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleAuth('register', 'basic')}
              className="w-full bg-white hover:bg-zinc-100 text-black border-2 border-black py-2.5 px-4 font-black text-xs uppercase shadow-[3px_3px_0px_0px_#000] cursor-pointer flex items-center justify-center gap-1.5 transition"
            >
              <span>GET STARTED FREE &rarr;</span>
            </button>
          </div>

          {/* TIER 2: PRO (RECOMMENDED) */}
          <div className="bg-white border-3 border-black p-6 space-y-6 flex flex-col justify-between shadow-[8px_8px_0px_0px_#000] -translate-y-1 relative bg-yellow-50/30">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-[#FFE600] border border-black shadow-[1px_1px_0px_0px_#000]">
                  MOST POPULAR
                </span>
                <span className="text-[10px] font-black uppercase text-amber-900 bg-amber-100 border border-black px-1.5 py-0.2">
                  ★ RECOMMENDED
                </span>
              </div>

              <div>
                <h3 className="text-xl font-black uppercase text-black">PRO</h3>
                <p className="text-xs text-zinc-500 font-bold">Equity Analyst &amp; Portfolio Manager</p>
                <div className="pt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-black">₹299</span>
                  <span className="text-xs font-bold text-zinc-500">/ month</span>
                </div>
              </div>

              <div className="p-3 bg-[#FFF9C4] border-2 border-black space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-800">Active Documents:</span>
                  <strong className="text-black">10 Files Max</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-800">Monthly Credits:</span>
                  <strong className="text-black">500 Credits</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-800">Chatbot Limit:</span>
                  <strong className="text-black">10 Qs / document</strong>
                </div>
              </div>

              <ul className="text-xs space-y-2 font-medium">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 stroke-[3]" />
                  <span>Everything in Basic tier</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 stroke-[3]" />
                  <span>Downloadable financial reports (PDF/JSON/MD)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 stroke-[3]" />
                  <span>Multi-year comparisons &amp; KPI analytics</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 stroke-[3]" />
                  <span>Full usage ledger &amp; audit history</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleAuth('register', 'pro')}
              className="w-full bg-[#FFE600] hover:bg-amber-400 text-black border-2 border-black py-2.5 px-4 font-black text-xs uppercase shadow-[3px_3px_0px_0px_#000] cursor-pointer flex items-center justify-center gap-1.5 transition"
            >
              <span>SELECT PRO PLAN &bull; ₹299 &rarr;</span>
            </button>
          </div>

          {/* TIER 3: PREMIUM (POWER ANALYST) */}
          <div className="bg-white border-3 border-black p-6 space-y-6 flex flex-col justify-between shadow-[5px_5px_0px_0px_#000]">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-black text-white border border-black">
                  MAX CAPACITY
                </span>
              </div>

              <div>
                <h3 className="text-xl font-black uppercase text-black">PREMIUM</h3>
                <p className="text-xs text-zinc-500 font-bold">Institutional Investment Firm</p>
                <div className="pt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-black">₹799</span>
                  <span className="text-xs font-bold text-zinc-500">/ month</span>
                </div>
              </div>

              <div className="p-3 bg-zinc-50 border-2 border-black space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-600">Active Documents:</span>
                  <strong className="text-black">50 Files Max</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Monthly Credits:</span>
                  <strong className="text-black">2,000 Credits</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Chatbot Limit:</span>
                  <strong className="text-black">20 Qs / document</strong>
                </div>
              </div>

              <ul className="text-xs space-y-2 font-medium">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 stroke-[3]" />
                  <span>Everything in Pro tier</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 stroke-[3]" />
                  <span>50 Active filings capacity simultaneously</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 stroke-[3]" />
                  <span>Priority compute &amp; deep semantic indexing</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 stroke-[3]" />
                  <span>Unlimited executive scorecard exports</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleAuth('register', 'premium')}
              className="w-full bg-black hover:bg-zinc-800 text-white border-2 border-black py-2.5 px-4 font-black text-xs uppercase shadow-[3px_3px_0px_0px_#000] cursor-pointer flex items-center justify-center gap-1.5 transition"
            >
              <span>SELECT PREMIUM &bull; ₹799 &rarr;</span>
            </button>
          </div>

        </div>
      </section>

      {/* 3. CORE ARCHITECTURE FEATURES */}
      <section className="max-w-6xl mx-auto px-4 space-y-4">
        <div className="border-b-2 border-black pb-2">
          <h2 className="text-lg font-black uppercase text-black flex items-center gap-2">
            <Cpu className="w-5 h-5 stroke-[2.5]" />
            <span>ENTERPRISE RAG ARCHITECTURE SPECIFICATION</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="neo-card bg-white space-y-2 p-5 border-2 border-black shadow-[3px_3px_0px_0px_#000]">
            <div className="w-8 h-8 bg-[#FFE600] border-2 border-black flex items-center justify-center font-bold">
              <FileCheck2 className="w-4 h-4 stroke-[2.5]" />
            </div>
            <h3 className="text-xs font-black text-black uppercase">1. VERIFIABLE 1-INDEXED PAGE CITATIONS</h3>
            <p className="text-[11px] text-zinc-600 leading-relaxed font-sans">
              No fabricated quotes. Every figure returned maps to a strict 1-indexed PDF page with verifiable text anchors and direct PDF jumping.
            </p>
          </div>

          <div className="neo-card bg-white space-y-2 p-5 border-2 border-black shadow-[3px_3px_0px_0px_#000]">
            <div className="w-8 h-8 bg-[#FFE600] border-2 border-black flex items-center justify-center font-bold">
              <Database className="w-4 h-4 stroke-[2.5]" />
            </div>
            <h3 className="text-xs font-black text-black uppercase">2. VECTORIZED DUCKDB ANALYTICS</h3>
            <p className="text-[11px] text-zinc-600 leading-relaxed font-sans">
              Financial tables are mapped into columnar DuckDB relations. Queries compute margin metrics, solvency ratios, and growth percentages in sub-milliseconds.
            </p>
          </div>

          <div className="neo-card bg-white space-y-2 p-5 border-2 border-black shadow-[3px_3px_0px_0px_#000]">
            <div className="w-8 h-8 bg-[#FFE600] border-2 border-black flex items-center justify-center font-bold">
              <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
            </div>
            <h3 className="text-xs font-black text-black uppercase">3. CRYPTOGRAPHIC INTEGRITY SEALS</h3>
            <p className="text-[11px] text-zinc-600 leading-relaxed font-sans">
              SHA-256 binary validation, magic byte checking (%PDF-), anti-prompt injection barriers, and strict tenant ownership data isolation.
            </p>
          </div>
        </div>
      </section>

      {/* 4. FINAL CALL TO ACTION */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="neo-card bg-[#FFE600] border-3 shadow-[6px_6px_0px_0px_#000000] p-8 text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-black text-white border-2 border-black text-xs font-black uppercase">
            <Zap className="w-3.5 h-3.5" />
            <span>START YOUR WORKSPACE TODAY</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-black uppercase tracking-tight">
            ACCELERATE YOUR FINANCIAL AUDITS &amp; CITATIONS
          </h2>
          <p className="text-xs sm:text-sm text-zinc-900 max-w-xl mx-auto font-sans font-bold leading-relaxed">
            Create an account in seconds. Upload any SEC 10-K or 10-Q filing, verify exact page citations, and extract automated scorecards with zero hallucinations.
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => handleAuth('register')}
              className="bg-black hover:bg-zinc-800 text-white font-black text-xs sm:text-sm px-6 py-3 border-2 border-black shadow-[4px_4px_0px_0px_#fff] cursor-pointer flex items-center gap-2 transition"
            >
              <span>CREATE FREE ACCOUNT</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </button>
            <button
              onClick={() => handleAuth('login')}
              className="bg-white hover:bg-zinc-100 text-black font-black text-xs sm:text-sm px-6 py-3 border-2 border-black shadow-[4px_4px_0px_0px_#000] cursor-pointer transition"
            >
              <span>SIGN IN TO WORKSPACE</span>
            </button>
          </div>
        </div>
      </section>

    </div>
  );
}
