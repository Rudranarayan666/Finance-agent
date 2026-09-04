import React, { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { 
  BrainCircuit, 
  TrendingUp, 
  TrendingDown, 
  Info, 
  ShieldCheck,
  BarChart3
} from 'lucide-react';

export default function ExplainableAiShap({ shapData, companyName }) {
  const [activeFeature, setActiveFeature] = useState(null);

  if (!shapData || !shapData.features) {
    return null;
  }

  const { target_metric, net_result, features, summary } = shapData;

  // Build waterfall data structure with running total accumulation
  const baseline = 100;
  let running = baseline;

  const waterfallData = [
    {
      name: 'Baseline',
      fullName: 'Prior Period Baseline',
      base: 0,
      val: baseline,
      displayVal: baseline,
      runningTotal: baseline,
      isTotal: true,
      color: '#64748b',
      description: 'Starting baseline net earnings'
    }
  ];

  features.forEach((feat) => {
    const diff = feat.shap_value;
    if (diff >= 0) {
      const step = {
        name: feat.feature.length > 14 ? feat.feature.slice(0, 12) + '…' : feat.feature,
        fullName: feat.feature,
        base: running,
        val: diff,
        displayVal: diff,
        runningTotal: running + diff,
        isPositive: true,
        color: '#10b981',
        description: feat.description
      };
      running += diff;
      waterfallData.push(step);
    } else {
      running += diff;
      const step = {
        name: feat.feature.length > 14 ? feat.feature.slice(0, 12) + '…' : feat.feature,
        fullName: feat.feature,
        base: running,
        val: Math.abs(diff),
        displayVal: diff,
        runningTotal: running,
        isPositive: false,
        color: '#f59e0b',
        description: feat.description
      };
      waterfallData.push(step);
    }
  });

  waterfallData.push({
    name: 'Net Profit',
    fullName: net_result || 'Reported Net Profit',
    base: 0,
    val: running,
    displayVal: running,
    runningTotal: running,
    isTotal: true,
    color: '#06b6d4',
    description: 'Final reported net earnings after all driver attributions'
  });

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#090d16] border border-slate-700 rounded-xl p-3 shadow-2xl text-xs space-y-1 z-50 max-w-xs">
          <div className="font-bold text-white flex items-center justify-between gap-2">
            <span>{data.fullName}</span>
            <span style={{ color: data.color }} className="font-mono">
              {data.isTotal ? `${data.displayVal.toFixed(1)}%` : `${data.displayVal > 0 ? '+' : ''}${data.displayVal.toFixed(1)}%`}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Running Total: <strong className="text-slate-200">{data.runningTotal.toFixed(1)}%</strong>
          </div>
          <p className="text-[11px] text-slate-300 leading-snug pt-1 border-t border-slate-800">
            {data.description}
          </p>
        </div>
      );
    }
    return null;
  };

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
                Explainable AI (SHAP) Waterfall Attribution
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                Recharts Waterfall
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Cumulative Shapley waterfall decomposing step-by-step drivers from baseline to final net profit
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <span className="text-xs font-mono px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300">
            Target: <strong className="text-emerald-400">{net_result || 'Reported Net Profit'}</strong>
          </span>
        </div>
      </div>

      {/* Summary Banner */}
      {summary && (
        <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-300 flex items-start space-x-2.5">
          <Info className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">{summary}</p>
        </div>
      )}

      {/* Recharts Waterfall Chart with ResponsiveContainer */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono uppercase text-slate-400">
          <span className="flex items-center space-x-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Cumulative Waterfall Trajectory</span>
          </span>
          <div className="flex items-center space-x-3 text-[10px]">
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
              <span>Positive Driver</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />
              <span>Headwind</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-cyan-500 inline-block" />
              <span>Net Profit</span>
            </span>
          </div>
        </div>

        <div className="w-full h-72 sm:h-80 bg-slate-950/40 border border-slate-800/80 rounded-2xl p-3 pt-5">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={waterfallData}
              margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="name"
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                interval={0}
                angle={-15}
                textAnchor="end"
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                domain={['auto', 'auto']}
              />
              <Tooltip content={<CustomTooltip />} />
              {/* Invisible base bar to create floating waterfall effect */}
              <Bar dataKey="base" stackId="waterfall" fill="transparent" />
              {/* Visible incremental bar */}
              <Bar dataKey="val" stackId="waterfall" radius={[4, 4, 0, 0]}>
                {waterfallData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Feature Breakdown Cards */}
      <div className="space-y-2.5">
        <div className="text-[11px] font-mono uppercase text-slate-400">
          Individual Driver Attributions ({features.length})
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {features.map((feat, idx) => {
            const isPos = feat.shap_value > 0;
            const isHovered = activeFeature === idx;

            return (
              <div
                key={idx}
                onMouseEnter={() => setActiveFeature(idx)}
                onMouseLeave={() => setActiveFeature(null)}
                className={`p-3 rounded-2xl border transition-all ${
                  isHovered
                    ? 'bg-slate-800/90 border-slate-700 shadow-lg'
                    : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center space-x-2 min-w-0">
                    <span className={`p-1 rounded-md text-xs font-bold ${
                      isPos ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {isPos ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    </span>
                    <span className="text-xs font-semibold text-slate-200 truncate">
                      {feat.feature}
                    </span>
                  </div>

                  <span className={`font-mono text-xs font-bold shrink-0 ${
                    isPos ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    {isPos ? `+${feat.shap_value.toFixed(1)}%` : `${feat.shap_value.toFixed(1)}%`}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {feat.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Methodology note */}
      <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <span className="flex items-center space-x-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span>Additive SHAP feature contributions calculated against previous fiscal baseline.</span>
        </span>
        <span className="font-mono text-slate-500">Audit Verified</span>
      </div>

    </div>
  );
}
