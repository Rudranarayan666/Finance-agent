import React from 'react';
import { 
  AlertTriangle, 
  Sparkles, 
  X, 
  ArrowRight, 
  Zap, 
  FileText, 
  HelpCircle 
} from 'lucide-react';

export default function UpgradeModal({ 
  limitType, // 'document_limit', 'insufficient_credits', 'question_cap', 'report_download'
  limitDetails, 
  onClose, 
  onUpgrade 
}) {
  if (!limitType) return null;

  const contentMap = {
    document_limit: {
      title: 'ACTIVE DOCUMENT CAPACITY REACHED',
      icon: FileText,
      badge: 'STORAGE LIMIT',
      description: limitDetails?.message || 'You have reached the maximum number of active documents allowed on your current plan.',
      cta: 'UPGRADE FOR MORE DOCUMENT SLOTS'
    },
    insufficient_credits: {
      title: 'INSUFFICIENT CREDITS',
      icon: Zap,
      badge: 'CREDITS DEPLETED',
      description: limitDetails?.message || 'You have exhausted your available credit balance. Upgrade your tier or wait for your next billing cycle renewal.',
      cta: 'UPGRADE & GET MORE CREDITS'
    },
    question_cap: {
      title: 'DOCUMENT QUESTION CAP REACHED',
      icon: HelpCircle,
      badge: 'QUESTION ALLOWANCE',
      description: limitDetails?.message || 'You have reached the maximum question allowance for this document in the current billing cycle.',
      cta: 'UPGRADE FOR HIGHER QUESTION CAPS'
    },
    report_download: {
      title: 'REPORT DOWNLOADS RESTRICTED',
      icon: Sparkles,
      badge: 'PRO FEATURE',
      description: limitDetails?.message || 'Downloading financial reports and summaries is available exclusively to Pro and Premium subscribers.',
      cta: 'UPGRADE TO PRO TO DOWNLOAD'
    }
  };

  const current = contentMap[limitType] || contentMap.insufficient_credits;
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm font-mono text-black animate-in fade-in">
      <div className="bg-white border-3 border-black shadow-[8px_8px_0px_0px_#000] w-full max-w-md p-6 space-y-5 relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-black p-1 cursor-pointer"
        >
          <X className="w-5 h-5 stroke-[2.5]" />
        </button>

        {/* Icon & Badge */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-[#FFE600] border-2 border-black shadow-[1px_1px_0px_0px_#000]">
              {current.badge}
            </span>
          </div>
          <div className="flex items-center gap-2.5 pt-1">
            <div className="w-9 h-9 bg-rose-100 border-2 border-black flex items-center justify-center text-rose-800 shadow-[2px_2px_0px_0px_#000] shrink-0">
              <Icon className="w-5 h-5 stroke-[2.5]" />
            </div>
            <h3 className="text-base font-black uppercase text-black">
              {current.title}
            </h3>
          </div>
        </div>

        {/* Description Box */}
        <div className="border-2 border-black bg-zinc-50 p-3.5 text-xs font-bold text-zinc-800 leading-relaxed">
          {current.description}
        </div>

        {/* Tier Comparisons Note */}
        <div className="text-[11px] font-bold text-zinc-600 space-y-1">
          <p>&bull; <strong>Pro:</strong> 10 documents, 500 credits, 10 questions/doc, downloads enabled</p>
          <p>&bull; <strong>Premium:</strong> 50 documents, 2,000 credits, 20 questions/doc, priority GPU</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => {
              onClose();
              if (onUpgrade) onUpgrade();
            }}
            className="flex-1 bg-[#FFE600] hover:bg-amber-400 text-black border-2 border-black py-2.5 px-4 font-black text-xs uppercase shadow-[3px_3px_0px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>{current.cta}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="bg-white hover:bg-zinc-100 text-black border-2 border-black py-2.5 px-3 font-black text-xs uppercase shadow-[2px_2px_0px_0px_#000] cursor-pointer"
          >
            DISMISS
          </button>
        </div>

      </div>
    </div>
  );
}
