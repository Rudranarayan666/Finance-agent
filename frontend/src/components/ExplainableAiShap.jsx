import React, { useState } from 'react';
import { 
  BrainCircuit, 
  HelpCircle, 
  TrendingUp, 
  TrendingDown, 
  Sparkles, 
  Info, 
  Layers,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

export default function ExplainableAiShap({ shapData, companyName }) {
  const [activeFeature, setActiveFeature] = useState(null);

  if (!shapData || !shapData.features) {
    return null;
  }

  const { target_metric, net_result, features, summary } = shapData;

  // Max absolute value for relative bar sizing
  const maxVal = Math.max(...features.map((f) => Math.abs(f.shap_value)), 50);

  return (
    <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-3xl p-5 sm:p-7 space-y-6 shadow-xl shadow-black/40">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex-shrink-0">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-100">
                Explainable AI (SHAP) Attribution
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                XAI Sensitivity
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Shapley additive explanations decomposing key drivers behind reported net earnings
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <span className="text-xs font-mono px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 text-slate-300">
            Target: <strong className="text-emerald-400">{net_result || 'Reported Net Profit'}</strong>
          </span>
        </div>
      </div>

      {/* Summary Banner */}
      {summary && (
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-xs sm:text-sm text-slate-300 flex items-start space-x-3">
          <Info className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">{summary}</p>
        </div>
      )}

      {/* Horizontal Waterfall Attribution Bars */}
      <div className="space-y-4">
        <div className="text-[11px] font-mono uppercase text-slate-400 flex items-center justify-between">
          <span>Feature Contribution (+ / - Drivers)</span>
          <span className="hidden sm:inline">Relative SHAP Impact (%)</span>
        </div>

        <div className="space-y-3">
          {features.map((feat, idx) => {
            const isPos = feat.shap_value > 0;
            const barWidth = Math.min((Math.abs(feat.shap_value) / maxVal) * 100, 100);
            const isHovered = activeFeature === idx;

            return (
              <div
                key={idx}
                onMouseEnter={() => setActiveFeature(idx)}
                onMouseLeave={() => setActiveFeature(null)}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
                  isHovered
                    ? 'bg-slate-800/90 border-slate-700 shadow-lg'
                    : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center space-x-2.5">
                    <span className={`p-1.5 rounded-lg text-xs font-bold ${
                      isPos ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                    }`}>
                      {isPos ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-slate-200">
                      {feat.feature}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 self-end sm:self-auto font-mono text-xs font-bold">
                    <span className={isPos ? 'text-emerald-400' : 'text-rose-400'}>
                      {isPos ? `+${feat.shap_value.toFixed(1)}%` : `${feat.shap_value.toFixed(1)}%`}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden flex">
                  {isPos ? (
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                      style={{ width: `${barWidth}%` }}
                    />
                  ) : (
                    <div
                      className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${barWidth}%` }}
                    />
                  )}
                </div>

                {/* Description / Explanation */}
                <p className="text-[11px] sm:text-xs text-slate-400 mt-2 leading-relaxed">
                  {feat.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* XAI Methodology Note */}
      <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <span className="flex items-center space-x-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span>Shapley value additive feature attributions calculated against prior baseline.</span>
        </span>
        <span className="font-mono text-slate-400">Zero-sum normalized</span>
      </div>

    </div>
  );
}
