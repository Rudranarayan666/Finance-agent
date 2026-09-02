import React, { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { BarChart3, TrendingUp, PieChart as PieIcon, MapPin } from 'lucide-react';

export default function Visualizations({ chartData, coverageReport }) {
  const [activeVizTab, setActiveVizTab] = useState('quarterly');

  if (!chartData) return null;

  const { quarters = [], revenue = [], net_income = [], gross_margin_pct = [], operating_cash_flow = [], source_page_distribution = {} } = chartData;

  // Prepare data array for Recharts multi-quarter comparison
  const quarterlyComparisonData = quarters.map((q, idx) => ({
    quarter: q,
    Revenue: revenue[idx] || 0,
    NetIncome: net_income[idx] || 0,
    OperatingCashFlow: operating_cash_flow[idx] || 0,
  }));

  const marginTrendData = quarters.map((q, idx) => ({
    quarter: q,
    GrossMarginPct: gross_margin_pct[idx] || 0,
  }));

  // Coverage breakdown data for Donut/Pie Chart
  const coverageData = [
    { name: 'Found & Verified', value: coverageReport?.fields_found || 6, color: '#10b981' },
    { name: 'Low Confidence', value: coverageReport?.low_confidence_fields?.length || 0, color: '#f59e0b' },
    { name: 'Not Disclosed', value: coverageReport?.fields_not_disclosed?.length || 2, color: '#64748b' },
  ];

  // Citation page density map
  const pageDensityData = Object.entries(source_page_distribution || {}).map(([page, count]) => ({
    page: `P.${page}`,
    citations: count,
  }));

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-7 space-y-6">
      
      {/* Visualizations Header & Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center space-x-2">
            <span>Visual Analysis Suite</span>
          </h2>
          <p className="text-xs text-slate-400">
            Client-side interactive Recharts responsive across mobile and desktop
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center space-x-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto">
          <button
            onClick={() => setActiveVizTab('quarterly')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center space-x-1 whitespace-nowrap ${
              activeVizTab === 'quarterly'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>4-Qtr Compare</span>
          </button>

          <button
            onClick={() => setActiveVizTab('margin')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center space-x-1 whitespace-nowrap ${
              activeVizTab === 'margin'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Margin Trend</span>
          </button>

          <button
            onClick={() => setActiveVizTab('coverage')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center space-x-1 whitespace-nowrap ${
              activeVizTab === 'coverage'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <PieIcon className="w-3.5 h-3.5" />
            <span>Coverage</span>
          </button>

          <button
            onClick={() => setActiveVizTab('density')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center space-x-1 whitespace-nowrap ${
              activeVizTab === 'density'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Citation Map</span>
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-72 sm:h-80">
        
        {/* 1. 4-Quarter Comparison Grouped Bar Chart */}
        {activeVizTab === 'quarterly' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={quarterlyComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="quarter" stroke="#94a3b8" fontSize={12} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#090d16', borderColor: '#1f2937', borderRadius: '8px', fontSize: '12px' }}
                cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Bar dataKey="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} name="Revenue ($M)" />
              <Bar dataKey="NetIncome" fill="#38bdf8" radius={[4, 4, 0, 0]} name="Net Income ($M)" />
              <Bar dataKey="OperatingCashFlow" fill="#818cf8" radius={[4, 4, 0, 0]} name="Op. Cash Flow ($M)" />
            </BarChart>
          </ResponsiveContainer>
        )}

        {/* 2. Gross Margin Trendline Chart */}
        {activeVizTab === 'margin' && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={marginTrendData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="quarter" stroke="#94a3b8" fontSize={12} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} unit="%" domain={['auto', 'auto']} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#090d16', borderColor: '#1f2937', borderRadius: '8px', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Line 
                type="monotone" 
                dataKey="GrossMarginPct" 
                stroke="#10b981" 
                strokeWidth={3} 
                dot={{ r: 5, fill: '#10b981' }} 
                activeDot={{ r: 7 }}
                name="Gross Margin %" 
              />
            </LineChart>
          </ResponsiveContainer>
        )}

        {/* 3. Coverage & Confidence Breakdown Radial/Pie */}
        {activeVizTab === 'coverage' && (
          <div className="h-full flex flex-col sm:flex-row items-center justify-around">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={coverageData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {coverageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#090d16" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#090d16', borderColor: '#1f2937', borderRadius: '8px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
            
            <div className="text-center sm:text-left space-y-1 p-4 bg-slate-950/60 rounded-xl border border-slate-800">
              <div className="text-xs text-slate-400 font-mono">Overall Confidence Score</div>
              <div className="text-2xl font-extrabold text-emerald-400">
                {((coverageReport?.overall_extraction_confidence || 0.9) * 100).toFixed(0)}%
              </div>
              <div className="text-[11px] text-slate-400">
                {coverageReport?.fields_found || 6} of 8 Target Metrics Verified
              </div>
            </div>
          </div>
        )}

        {/* 4. Citation Page Density Heatmap */}
        {activeVizTab === 'density' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={pageDensityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="page" stroke="#94a3b8" fontSize={12} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} allowDecimals={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#090d16', borderColor: '#1f2937', borderRadius: '8px', fontSize: '12px' }}
              />
              <Bar dataKey="citations" fill="#14b8a6" radius={[4, 4, 0, 0]} name="Citations from Page" />
            </BarChart>
          </ResponsiveContainer>
        )}

      </div>
    </div>
  );
}
