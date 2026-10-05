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
      color: '#CBD5E1',
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
        color: '#FFE600',
        description: feat.description
      };
      running += diff;
      waterfallData.push(step);
    } else {
      const absDiff = Math.abs(diff);
      const step = {
        name: feat.feature.length > 14 ? feat.feature.slice(0, 12) + '…' : feat.feature,
        fullName: feat.feature,
        base: running - absDiff,
        val: absDiff,
        displayVal: diff,
        runningTotal: running - absDiff,
        isPositive: false,
        color: '#F87171',
        description: feat.description
      };
      running -= absDiff;
      waterfallData.push(step);
    }
  });

  waterfallData.push({
    name: 'Final PAT',
    fullName: target_metric || 'Reported Net Profit',
    base: 0,
    val: running,
    displayVal: running,
    runningTotal: running,
    isTotal: true,
    color: '#93C5FD',
    description: `Final verified ${target_metric || 'Net Profit'} figure`
  });

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="neo-card bg-white p-2.5 border-2 border-black shadow-[3px_3px_0px_#000] text-xs font-mono max-w-xs">
          <div className="font-black text-black uppercase text-[11px] mb-1">{data.fullName}</div>
          <div className="space-y-0.5 text-zinc-700">
            <div>
              Impact: <strong className={data.displayVal >= 0 ? 'text-green-800' : 'text-rose-800'}>
                {data.displayVal >= 0 ? `+${data.displayVal}` : data.displayVal}
              </strong>
            </div>
            <div>Cumulative Total: <strong>{Math.round(data.runningTotal)}</strong></div>
            {data.description && (
              <div className="text-[10px] text-zinc-600 font-sans pt-1 border-t border-zinc-200 mt-1">
                {data.description}
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="neo-card bg-white border-3 shadow-[4px_4px_0px_0px_#000] p-4 sm:p-5 space-y-4 font-mono text-zinc-900">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-black pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 bg-[#FFE600] text-black border-2 border-black flex items-center justify-center font-bold">
            <BrainCircuit className="w-4 h-4 stroke-[3]" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-black uppercase tracking-wider">
              EXPLAINABLE AI (SHAP) ATTRIBUTION WATERFALL
            </h2>
            <p className="text-[11px] text-zinc-600 font-sans">
              Cumulative Shapley waterfall decomposing step-by-step drivers from baseline to net profit
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="neo-badge bg-[#F4F4F5] text-black">
            TARGET: <strong className="text-black ml-1">{net_result || 'Reported Net Profit'}</strong>
          </span>
        </div>
      </div>

      {/* Summary Banner */}
      {summary && (
        <div className="p-3 bg-[#FFFDE7] border-2 border-black text-xs text-zinc-900 flex items-start space-x-2.5">
          <Info className="w-4 h-4 text-black flex-shrink-0 mt-0.5 stroke-[2.5]" />
          <p className="leading-relaxed font-sans">{summary}</p>
        </div>
      )}

      {/* Recharts Waterfall Chart */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] uppercase text-zinc-700 border-b border-zinc-200 pb-1.5 font-black">
          <span className="flex items-center space-x-1">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>CUMULATIVE WATERFALL TRAJECTORY</span>
          </span>
          <div className="flex items-center space-x-3 text-[10px]">
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 bg-[#FFE600] border border-black inline-block" />
              <span>POSITIVE DRIVER</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 bg-[#F87171] border border-black inline-block" />
              <span>HEADWIND</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 bg-[#93C5FD] border border-black inline-block" />
              <span>NET PROFIT</span>
            </span>
          </div>
        </div>

        <div className="w-full h-72 sm:h-80 bg-[#FBFBFA] border-2 border-black p-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={waterfallData}
              margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" vertical={false} />
              <XAxis
                dataKey="name"
                stroke="#000"
                fontSize={10}
                tickLine={false}
                interval={0}
                angle={-15}
                textAnchor="end"
              />
              <YAxis
                stroke="#000"
                fontSize={10}
                tickLine={false}
                domain={['auto', 'auto']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="base" stackId="waterfall" fill="transparent" />
              <Bar dataKey="val" stackId="waterfall" stroke="#000" strokeWidth={1.5}>
                {waterfallData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Feature Attribution Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
        {features.map((feat, idx) => {
          const isPositive = feat.shap_value >= 0;
          return (
            <div
              key={idx}
              className="p-2.5 border-2 border-black bg-[#FBFBFA] text-xs space-y-1 hover:bg-[#FFF9C4]/40 transition"
            >
              <div className="flex items-center justify-between">
                <span className="font-black text-black uppercase truncate text-[11px]" title={feat.feature}>
                  {feat.feature}
                </span>
                <span className={`neo-badge text-[9px] py-0 ${isPositive ? 'bg-[#BBF7D0]' : 'bg-[#FECACA]'}`}>
                  {isPositive ? `+${feat.shap_value}` : feat.shap_value}
                </span>
              </div>
              <p className="text-[10px] text-zinc-600 font-sans line-clamp-2">
                {feat.description}
              </p>
            </div>
          );
        })}
      </div>

    </div>
  );
}
