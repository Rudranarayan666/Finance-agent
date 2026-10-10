import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Zap, 
  ChevronDown, 
  ArrowUpRight, 
  Clock, 
  History, 
  AlertTriangle, 
  X,
  CreditCard,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';

export default function CreditMeter({ 
  user, 
  creditData, 
  onRefreshCredits, 
  onOpenPricing 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [loadingTx, setLoadingTx] = useState(false);
  const [flash, setFlash] = useState(false);
  const [ledgerBalance, setLedgerBalance] = useState(null); // authoritative balance from ledger
  const prevBalanceRef = useRef(null);
  const popoverRef = useRef(null);

  // Close popover on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Real-time polling every 30s — refresh both credits AND transactions
  useEffect(() => {
    if (!user) return;
    const refreshAll = async () => {
      try {
        const [txs] = await Promise.all([
          api.getCreditTransactions(15),
          onRefreshCredits ? onRefreshCredits() : Promise.resolve()
        ]);
        if (txs && txs.length > 0) {
          setTransactions(txs);
          setLedgerBalance(txs[0].balance_after);
        }
      } catch (_) {}
    };
    const interval = setInterval(refreshAll, 30000);
    return () => clearInterval(interval);
  }, [user, onRefreshCredits]);

  // Whenever parent refreshes creditData (e.g. after upload), sync ledger balance immediately
  useEffect(() => {
    if (!creditData) return;
    api.getCreditTransactions(5).then((txs) => {
      if (txs && txs.length > 0) {
        setTransactions((prev) => {
          // Merge: put new txs first, deduplicate by id
          const merged = [...txs, ...prev];
          const seen = new Set();
          return merged.filter((tx) => { if (seen.has(tx.id)) return false; seen.add(tx.id); return true; });
        });
        setLedgerBalance(txs[0].balance_after);
      }
    }).catch(() => {});
  }, [creditData]);

  // Flash when balance drops
  const currentBalance = creditData?.balance ?? (user?.credits_balance ?? 100);
  useEffect(() => {
    if (prevBalanceRef.current !== null && currentBalance < prevBalanceRef.current) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 1200);
      return () => clearTimeout(t);
    }
    prevBalanceRef.current = currentBalance;
  }, [currentBalance]);

  const fetchTransactions = async (alsoRefreshCredits = false) => {
    setLoadingTx(true);
    try {
      const [txs] = await Promise.all([
        api.getCreditTransactions(15),
        alsoRefreshCredits && onRefreshCredits ? onRefreshCredits() : Promise.resolve()
      ]);
      const list = txs || [];
      setTransactions(list);
      if (list.length > 0) setLedgerBalance(list[0].balance_after);
    } catch (err) {
      console.error('Failed to load credit transactions:', err);
    } finally {
      setLoadingTx(false);
    }
  };

  const handleToggle = () => {
    if (!isOpen) {
      // Fetch transactions AND credits together, then re-fetch credits after 2s for backend lag
      fetchTransactions(true);
      setTimeout(() => {
        if (onRefreshCredits) onRefreshCredits();
      }, 2000);
    }
    setIsOpen(!isOpen);
  };

  // If creditData hasn't caught up yet, use ledgerBalance (derived from transactions)
  const rawBalance = creditData?.balance ?? (user?.credits_balance ?? 100);
  // ledgerBalance is the most recent balance_after from the transaction log — always accurate
  const balance = (ledgerBalance !== null && ledgerBalance !== undefined && ledgerBalance < rawBalance)
    ? ledgerBalance
    : rawBalance;
  const allowance = creditData?.period_allowance ?? 100;
  const used = allowance - balance;
  const planKey = (creditData?.plan_key || user?.plan_key || 'basic').toUpperCase();

  // Percentage remaining (capped 0-100)
  const pctRemaining = allowance > 0 ? Math.min(100, Math.max(0, Math.round((balance / allowance) * 100))) : 0;

  // Visual warning colors
  let meterColor = '#10B981'; // Green
  let badgeBg = 'bg-emerald-100 text-emerald-800 border-emerald-600';
  let isLow = false;

  if (balance <= 0) {
    meterColor = '#EF4444'; // Red
    badgeBg = 'bg-rose-100 text-rose-800 border-rose-600';
    isLow = true;
  } else if (pctRemaining <= 10) {
    meterColor = '#EF4444'; // Red
    badgeBg = 'bg-rose-100 text-rose-800 border-rose-600';
    isLow = true;
  } else if (pctRemaining <= 20) {
    meterColor = '#F59E0B'; // Amber
    badgeBg = 'bg-amber-100 text-amber-800 border-amber-600';
    isLow = true;
  }

  // SVG Circular math
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pctRemaining / 100) * circumference;

  const formatDate = (isoString) => {
    if (!isoString) return 'Next billing cycle';
    try {
      return new Date(isoString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="relative font-mono" ref={popoverRef}>
      {/* Top Navigation Trigger Button */}
      <button
        onClick={handleToggle}
        className={`flex items-center gap-2.5 border-2 border-black px-3 py-1.5 shadow-[2px_2px_0px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all cursor-pointer ${
          flash ? 'bg-yellow-200' : isLow ? 'bg-amber-50' : 'bg-white'
        }`}
        title="Click to view credits & usage details"
        style={{ transition: 'background-color 0.4s ease, transform 0.1s' }}
      >
        {/* Circular Progress Meter */}
        <div className="relative w-7 h-7 flex items-center justify-center shrink-0">
          <svg className="w-7 h-7 transform -rotate-90">
            <circle cx="14" cy="14" r={radius} stroke="#E4E4E7" strokeWidth="3" fill="transparent" />
            <circle
              cx="14" cy="14" r={radius}
              stroke={meterColor}
              strokeWidth="3"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-500 ease-out"
            />
          </svg>
          <Zap className="w-3 h-3 absolute text-black fill-current stroke-[2.5]" />
        </div>

        {/* Credit Count & Plan Badge */}
        <div className="flex flex-col text-left">
          <div className="flex items-baseline gap-1">
            <span className={`text-sm font-black leading-none transition-all ${flash ? 'text-amber-700' : 'text-black'}`}>
              {balance}
            </span>
            <span className="text-xs text-zinc-500 font-bold leading-none">
              / {allowance} cr
            </span>
          </div>
          <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider mt-0.5">
            {planKey}
          </span>
        </div>

        <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-11 w-80 sm:w-96 bg-white border-3 border-black shadow-[6px_6px_0px_0px_#000] p-4 space-y-3.5 z-50 text-left animate-in fade-in">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 border-b-2 border-black">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-[#FFE600] border-2 border-black shadow-[1px_1px_0px_0px_#000] flex items-center justify-center">
                <Zap className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div>
                <h4 className="text-xs font-black text-black uppercase tracking-wider">
                  CREDIT USAGE & METER
                </h4>
                <p className="text-[10px] text-zinc-500 font-bold">
                  Active Tier: {planKey}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-zinc-500 hover:text-black p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Low Balance Warning Banner */}
          {isLow && (
            <div className="border-2 border-black bg-[#FFE600] p-2.5 flex items-start gap-2 shadow-[2px_2px_0px_0px_#000]">
              <AlertTriangle className="w-4 h-4 text-black shrink-0 mt-0.5 stroke-[2.5]" />
              <div className="text-[11px] font-bold text-black leading-tight">
                {balance <= 0 ? (
                  <span>Credits exhausted! Upgrade your plan or wait for your monthly cycle renewal to continue querying.</span>
                ) : (
                  <span>Low credits warning: {balance} credits remaining ({pctRemaining}% of allowance).</span>
                )}
              </div>
            </div>
          )}

          {/* Meter Breakdown Card */}
          <div className="border-2 border-black bg-zinc-50 p-3 space-y-2">
            <div className="flex justify-between items-center text-xs font-black">
              <span>AVAILABLE BALANCE:</span>
              <span className="text-base text-black bg-white px-2 py-0.5 border border-black shadow-[1px_1px_0px_0px_#000]">
                {balance} <span className="text-xs text-zinc-500 font-normal">credits</span>
              </span>
            </div>

            {/* Linear Progress Bar */}
            <div className="w-full bg-zinc-200 h-2.5 border border-black overflow-hidden">
              <div 
                className="h-full transition-all duration-500"
                style={{ width: `${pctRemaining}%`, backgroundColor: meterColor }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
              <div className="border border-zinc-300 p-1.5 bg-white">
                <span className="text-zinc-500 block text-[9px] font-black uppercase">USED THIS CYCLE:</span>
                <span className="font-black text-black">{used} credits</span>
              </div>
              <div className="border border-zinc-300 p-1.5 bg-white">
                <span className="text-zinc-500 block text-[9px] font-black uppercase">MONTHLY ALLOWANCE:</span>
                <span className="font-black text-black">{allowance} credits</span>
              </div>
            </div>

            {creditData?.period_end && (
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-600 pt-1 font-bold">
                <Clock className="w-3 h-3 text-zinc-500" />
                <span>Next reset date: {formatDate(creditData.period_end)}</span>
              </div>
            )}
          </div>

          {/* Pricing Upgrade Button */}
          {onOpenPricing && (
            <button
              onClick={() => {
                setIsOpen(false);
                onOpenPricing();
              }}
              className="w-full bg-[#FFE600] text-black border-2 border-black font-extrabold py-2 px-3 text-xs uppercase shadow-[2px_2px_0px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>UPGRADE PLAN / GET MORE CREDITS</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Recent Activity Ledger */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[10px] font-black uppercase text-zinc-500">
              <span className="flex items-center gap-1">
                <History className="w-3 h-3" />
                RECENT ACTIVITY LEDGER
              </span>
              <button 
                onClick={fetchTransactions} 
                className="hover:text-black underline cursor-pointer"
              >
                Refresh
              </button>
            </div>

            <div className="max-h-36 overflow-y-auto border border-black bg-white divide-y divide-zinc-200">
              {loadingTx ? (
                <div className="p-3 text-center text-xs text-zinc-500 font-bold">
                  Loading ledger entries...
                </div>
              ) : transactions.length === 0 ? (
                <div className="p-3 text-center text-xs text-zinc-500 font-bold">
                  No recent credit transactions found.
                </div>
              ) : (
                transactions.map((tx) => (
                  <div key={tx.id} className="p-2 flex items-center justify-between text-[10px]">
                    <div className="space-y-0.5 max-w-[200px]">
                      <p className="font-black text-black truncate uppercase">
                        {tx.reason || tx.transaction_type}
                      </p>
                      <p className="text-[9px] text-zinc-500">
                        {tx.created_at ? new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''} &bull; Balance: {tx.balance_after}
                      </p>
                    </div>
                    <span className={`font-black px-1.5 py-0.5 border ${
                      tx.amount > 0 
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-600' 
                        : 'bg-rose-100 text-rose-800 border-rose-600'
                    }`}>
                      {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Rates breakdown note */}
          <div className="text-[9px] text-zinc-500 font-bold border-t border-zinc-200 pt-2 flex justify-between">
            <span>Upload: 10 cr</span>
            <span>&bull;</span>
            <span>Chat: 15 cr</span>
            <span>&bull;</span>
            <span>Visual: 10 cr</span>
            <span>&bull;</span>
            <span>Reports: Included</span>
          </div>

        </div>
      )}
    </div>
  );
}
