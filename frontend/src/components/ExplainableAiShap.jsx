import React, { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  ReferenceLine
} from 'recharts';
import { 
  BrainCircuit, 
  TrendingUp, 
  TrendingDown, 
  Info, 
  BarChart3,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  SlidersHorizontal
} from 'lucide-react';

export default function ExplainableAiShap({ shapData, companyName }) {
  const [filterMode, setFilterMode] = useState('all'); // 'all', 'positive', 'negative'
  const [selectedFeature, setSelectedFeature] = useState(null);

  if (!shapData || !shapData.features || shapData.features.length === 0) {
    return null;
  }

  const { target_metric, net_result, features, summary } = shapData;

  // Calculate totals
  const positiveFeatures = features.filter(f => f.shap_value > 0);
  const negativeFeatures = features.filter(f => f.shap_value < 0);
  
  const totalPositive = positiveFeatures.reduce((acc, f) => acc + f.shap_value, 0);
  const totalNegative = Math.abs(negativeFeatures.reduce((acc, f) => acc + f.shap_value, 0));
  const netImpact = totalPositive - totalNegative;

  // Filter features based on active tab
  const displayedFeatures = features.filter(f => {
    if (filterMode === 'positive') return f.shap_value > 0;
    if (filterMode === 'negative') return f.shap_value < 0;
    return true;
  });

  // Sort descending by magnitude
  const sortedChartData = [...displayedFeatures].sort((a, b) => b.shap_value - a.shap_value).map(f => ({
    name: f.feature.length > 22 ? f.feature.slice(0, 20) + '…' : f.feature,
    fullName: f.feature,
    impact: f.shap_value,
    isPositive: f.shap_value >= 0,
    description: f.description,
    direction: f.direction || (f.shap_value >= 0 ? 'positive' : 'negative')
  }));

  const maxMagnitude = Math.max(...features.map(f => Math.abs(f.shap_value)), 1);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border-2 border-black p-3 shadow-[4px_4px_0px_#000] text-xs font-mono max-w-xs space-y-1.5">
          <div className="font-black text-black uppercase text-xs border-b border-black pb-1">
            {data.fullName}
          </div>
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-zinc-600">Impact Score:</span>
            <span className={data.isPositive ? 'text-emerald-700' : 'text-rose-700'}>
              {data.isPositive ? `+${data.impact}` : data.impact} pts
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold">
            <span className="text-zinc-500">Direction:</span>
            <span className={data.isPositive ? 'text-emerald-700' : 'text-rose-700'}>
              {data.isPositive ? 'Positive Booster' : 'Cost Headwind'}
            </span>
          </div>
          {data.description && (
            <p className="text-[11px] text-zinc-700 font-sans border-t border-zinc-200 pt-1 leading-snug">
              {data.description}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="neo-card bg-white border-3 shadow-[5px_5px_0px_0px_#000] p-5 sm:p-6 space-y-5 font-mono text-zinc-900">
      
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-black pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#FFE600] text-black border-2 border-black shadow-[2px_2px_0px_0px_#000] flex items-center justify-center font-bold shrink-0">
            <BrainCircuit className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-black uppercase tracking-wider flex items-center gap-2">
              <span>EXPLAINABLE AI (SHAP) ATTRIBUTION</span>
              <span className="neo-badge bg-zinc-100 text-[10px] text-zinc-700 hidden sm:inline-block">
                VERIFIED MODEL
              </span>
            </h2>
            <p className="text-xs text-zinc-600 font-sans mt-0.5">
              Clear breakdown of individual drivers increasing or decreasing financial performance for <strong>{companyName || 'this corporate entity'}</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="neo-badge bg-[#FFE600] text-black font-extrabold text-xs">
            TARGET: {target_metric || 'Net Margin & Earnings'}
          </span>
        </div>
      </div>

      {/* 2. Executive Summary Ribbon (Key Numbers at a Glance) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Positive Drivers */}
        <div className="border-2 border-black bg-emerald-50 p-3 shadow-[2px_2px_0px_0px_#000] space-y-1">
          <div className="flex items-center justify-between text-xs font-black uppercase text-emerald-900">
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-700 stroke-[3]" />
              <span>Positive Boosters</span>
            </span>
            <span className="neo-badge bg-emerald-200 text-emerald-950 text-[10px] py-0">
              {positiveFeatures.length} factors
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700">
            +{totalPositive.toFixed(1)} <span className="text-xs font-bold text-emerald-900">pts</span>
          </div>
          <p className="text-[11px] text-emerald-800 font-sans leading-tight">
            Revenue expansion, volume additions & operating leverage.
          </p>
        </div>

        {/* Headwinds */}
        <div className="border-2 border-black bg-rose-50 p-3 shadow-[2px_2px_0px_0px_#000] space-y-1">
          <div className="flex items-center justify-between text-xs font-black uppercase text-rose-900">
            <span className="flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5 text-rose-700 stroke-[3]" />
              <span>Cost Headwinds</span>
            </span>
            <span className="neo-badge bg-rose-200 text-rose-950 text-[10px] py-0">
              {negativeFeatures.length} factors
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-700">
            -{totalNegative.toFixed(1)} <span className="text-xs font-bold text-rose-900">pts</span>
          </div>
          <p className="text-[11px] text-rose-800 font-sans leading-tight">
            Input costs, procurement inflation & depreciation load.
          </p>
        </div>

        {/* Net Driver Impact */}
        <div className="border-2 border-black bg-yellow-50 p-3 shadow-[2px_2px_0px_0px_#000] space-y-1">
          <div className="flex items-center justify-between text-xs font-black uppercase text-yellow-950">
            <span className="flex items-center gap-1">
              <BarChart3 className="w-3.5 h-3.5 text-black stroke-[3]" />
              <span>Net AI Impact</span>
            </span>
            <span className="neo-badge bg-[#FFE600] text-black text-[10px] py-0">
              NET EFFECT
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-black">
            {netImpact >= 0 ? `+${netImpact.toFixed(1)}` : netImpact.toFixed(1)} <span className="text-xs font-bold text-zinc-600">pts</span>
          </div>
          <p className="text-[11px] text-zinc-700 font-sans leading-tight">
            Combined net impact towards reported earnings performance.
          </p>
        </div>
      </div>

      {/* 3. Plain English Insight Banner */}
      {summary && (
        <div className="p-3 bg-zinc-50 border-2 border-black text-xs text-zinc-900 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-black shrink-0 mt-0.5 stroke-[2.5]" />
          <p className="leading-relaxed font-sans font-medium text-xs text-zinc-800">
            <strong className="font-mono text-black uppercase">Executive Summary: </strong>
            {summary}
          </p>
        </div>
      )}

      {/* 4. Filter Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-zinc-200">
        <div className="flex items-center gap-1.5 text-xs font-bold">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span className="text-zinc-700 uppercase">View Filter:</span>
        </div>
        <div className="flex items-center gap-1 bg-zinc-100 border-2 border-black p-0.5 text-xs font-bold">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1 cursor-pointer transition ${
              filterMode === 'all' ? 'bg-[#FFE600] text-black border border-black shadow-[1px_1px_0px_0px_#000]' : 'text-zinc-600 hover:text-black'
            }`}
          >
            All Factors ({features.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('positive')}
            className={`px-3 py-1 cursor-pointer transition ${
              filterMode === 'positive' ? 'bg-[#BBF7D0] text-emerald-950 border border-black shadow-[1px_1px_0px_0px_#000]' : 'text-zinc-600 hover:text-black'
            }`}
          >
            Positive (+{positiveFeatures.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('negative')}
            className={`px-3 py-1 cursor-pointer transition ${
              filterMode === 'negative' ? 'bg-[#FECACA] text-rose-950 border border-black shadow-[1px_1px_0px_0px_#000]' : 'text-zinc-600 hover:text-black'
            }`}
          >
            Headwinds (-{negativeFeatures.length})
          </button>
        </div>
      </div>

      {/* 5. Clear Diverging Horizontal Impact Chart */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs uppercase text-zinc-700 font-black">
          <span>RELATIVE FACTOR IMPACT RANKING</span>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-[#10B981] border border-black inline-block" />
              <span>Positive (+ Earnings)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-[#EF4444] border border-black inline-block" />
              <span>Negative (- Costs)</span>
            </span>
          </div>
        </div>

        <div className="w-full h-72 sm:h-80 bg-[#FAFAFA] border-2 border-black p-3 sm:p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={sortedChartData}
              layout="vertical"
              margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" horizontal={false} />
              <XAxis 
                type="number" 
                stroke="#000" 
                fontSize={11} 
                tickLine={false}
                domain={['auto', 'auto']}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                stroke="#000" 
                fontSize={11} 
                tickLine={false}
                width={140}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine x={0} stroke="#000" strokeWidth={2} />
              <Bar dataKey="impact" stroke="#000" strokeWidth={1.5}>
                {sortedChartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.isPositive ? '#10B981' : '#EF4444'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 6. Explanatory Driver Cards (Easy to read for executives) */}
      <div className="space-y-2 pt-2">
        <div className="text-xs font-black uppercase text-zinc-700">
          DETAILED DRIVER BREAKDOWN &amp; EVIDENCE
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {displayedFeatures.map((feat, idx) => {
            const isPositive = feat.shap_value >= 0;
            const pct = Math.min(Math.round((Math.abs(feat.shap_value) / maxMagnitude) * 100), 100);

            return (
              <div
                key={idx}
                className={`p-3 border-2 border-black bg-white shadow-[2px_2px_0px_0px_#000] space-y-2 transition-all hover:bg-zinc-50 ${
                  isPositive ? 'border-l-6 border-l-emerald-500' : 'border-l-6 border-l-rose-500'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-black text-black uppercase text-xs">
                    {feat.feature}
                  </div>
                  <span className={`neo-badge text-xs py-0 shrink-0 font-black ${
                    isPositive ? 'bg-emerald-200 text-emerald-950' : 'bg-rose-200 text-rose-950'
                  }`}>
                    {isPositive ? `+${feat.shap_value}` : feat.shap_value} pts
                  </span>
                </div>

                {/* Magnitude visual bar */}
                <div className="w-full bg-zinc-100 border border-black h-2 overflow-hidden">
                  <div 
                    className={`h-full ${isPositive ? 'bg-emerald-500' : 'bg-rose-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <p className="text-xs text-zinc-700 font-sans leading-relaxed">
                  {feat.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 7. Footer note explaining SHAP simply */}
      <div className="p-2.5 bg-zinc-100 border border-black text-[11px] text-zinc-600 flex items-center gap-2">
        <HelpCircle className="w-3.5 h-3.5 text-zinc-800 shrink-0" />
        <span>
          <strong>How SHAP works:</strong> Cooperative Shapley game theory allocates exact credit to each financial factor, showing why profitability shifted between filing periods.
        </span>
      </div>

    </div>
  );
}
