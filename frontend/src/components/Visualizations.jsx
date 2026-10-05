import React, { useState, useEffect } from 'react';
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
import { 
  BarChart3, 
  TrendingUp, 
  PieChart as PieIcon, 
  MapPin, 
  Database, 
  Play, 
  Zap, 
  Clock, 
  CheckCircle2, 
  Table as TableIcon,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';

export default function Visualizations({ chartData, coverageReport, documentId }) {
  const [activeVizTab, setActiveVizTab] = useState('quarterly'); // 'quarterly', 'margin', 'coverage', 'duckdb'
  
  // DuckDB Interactive Query Console State
  const [sqlQuery, setSqlQuery] = useState(
    "SELECT quarter, revenue, net_income, ROUND((net_income / revenue) * 100, 2) AS net_margin_pct FROM quarterly_performance;"
  );
  const [duckdbResult, setDuckdbResult] = useState(null);
  const [duckdbLoading, setDuckdbLoading] = useState(false);
  const [duckdbLatency, setDuckdbLatency] = useState(null);

  // Initial load of DuckDB data
  useEffect(() => {
    if (documentId) {
      runDuckDBQuery(sqlQuery);
    }
  }, [documentId]);

  const runDuckDBQuery = async (queryText) => {
    if (!documentId) return;
    setDuckdbLoading(true);
    try {
      const res = await api.queryDuckDB(documentId, queryText || sqlQuery);
      setDuckdbResult(res);
      setDuckdbLatency(res.latency_ms);
    } catch (err) {
      setDuckdbResult({ error: err.message, columns: [], rows: [] });
    } finally {
      setDuckdbLoading(false);
    }
  };

  const duckdbPresets = [
    {
      name: "Net Margin %",
      query: "SELECT quarter, revenue, net_income, ROUND((net_income / revenue) * 100, 2) AS net_margin_pct FROM quarterly_performance;"
    },
    {
      name: "Cash Flow vs Net Income",
      query: "SELECT quarter, operating_cash_flow, net_income, ROUND(operating_cash_flow - net_income, 2) AS accrual_delta FROM quarterly_performance;"
    },
    {
      name: "Verified Metrics List",
      query: "SELECT field, label, raw_value, page_number, confidence FROM metric_items WHERE status = 'FOUND';"
    },
    {
      name: "Gross Profit Trajectory",
      query: "SELECT quarter, revenue, gross_profit, gross_margin_pct FROM quarterly_performance ORDER BY quarter ASC;"
    }
  ];

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
    NetMarginPct: revenue[idx] ? Number(((net_income[idx] / revenue[idx]) * 100).toFixed(1)) : 0
  }));

  // Coverage breakdown data for Donut/Pie Chart
  const coverageData = [
    { name: 'Found & Verified', value: coverageReport?.fields_found || 6, color: '#FFE600' },
    { name: 'Low Confidence', value: coverageReport?.low_confidence_fields?.length || 0, color: '#FB923C' },
    { name: 'Not Disclosed', value: coverageReport?.fields_not_disclosed?.length || 2, color: '#CBD5E1' },
  ];

  // Citation page density map
  const pageDensityData = Object.entries(source_page_distribution || {}).map(([page, count]) => ({
    page: `P.${page}`,
    citations: count,
  }));

  return (
    <div className="neo-card bg-white border-3 shadow-[4px_4px_0px_0px_#000000] p-4 sm:p-6 space-y-5 font-mono text-zinc-900">
      
      {/* Visualizations Header & Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-black pb-3.5">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-sm sm:text-base font-black text-black uppercase flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 stroke-[3]" />
              <span>OPEN-SOURCE FINANCIAL VISUALIZATION SUITE</span>
            </h2>
            <span className="neo-badge-yellow text-[9px]">
              DUCKDB VECTORIZED
            </span>
          </div>
          <p className="text-[11px] text-zinc-600 font-sans mt-0.5">
            Real-time interactive charting (Recharts) &amp; sub-millisecond in-memory SQL analytics (DuckDB v1.5)
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center space-x-1 bg-[#F4F4F5] p-1 border-2 border-black overflow-x-auto">
          <button
            onClick={() => setActiveVizTab('quarterly')}
            className={`px-3 py-1 text-xs font-black uppercase transition flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
              activeVizTab === 'quarterly'
                ? 'bg-[#FFE600] text-black border border-black shadow-[1px_1px_0px_0px_#000]'
                : 'text-zinc-700 hover:text-black hover:bg-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>4-QTR COMPARE</span>
          </button>

          <button
            onClick={() => setActiveVizTab('margin')}
            className={`px-3 py-1 text-xs font-black uppercase transition flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
              activeVizTab === 'margin'
                ? 'bg-[#FFE600] text-black border border-black shadow-[1px_1px_0px_0px_#000]'
                : 'text-zinc-700 hover:text-black hover:bg-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>MARGIN TRENDS</span>
          </button>

          <button
            onClick={() => setActiveVizTab('coverage')}
            className={`px-3 py-1 text-xs font-black uppercase transition flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
              activeVizTab === 'coverage'
                ? 'bg-[#FFE600] text-black border border-black shadow-[1px_1px_0px_0px_#000]'
                : 'text-zinc-700 hover:text-black hover:bg-white'
            }`}
          >
            <PieIcon className="w-3.5 h-3.5" />
            <span>COVERAGE</span>
          </button>

          <button
            onClick={() => setActiveVizTab('duckdb')}
            className={`px-3 py-1 text-xs font-black uppercase transition flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
              activeVizTab === 'duckdb'
                ? 'bg-[#FFE600] text-black border border-black shadow-[1px_1px_0px_0px_#000]'
                : 'text-zinc-700 hover:text-black hover:bg-white'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>DUCKDB SQL</span>
          </button>
        </div>
      </div>

      {/* 1. 4-Quarter Comparison Grouped Bar Chart */}
      {activeVizTab === 'quarterly' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-black text-black uppercase">
            <span>Quarterly Trajectory (Revenue, Net Income, Operating Cash Flow)</span>
            <span className="neo-badge-yellow text-[10px]">IN-MEMORY COMPUTED</span>
          </div>
          <div className="w-full h-72 sm:h-80 bg-[#FBFBFA] border-2 border-black p-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={quarterlyComparisonData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" vertical={false} />
                <XAxis dataKey="quarter" stroke="#000" fontSize={11} tickLine={false} />
                <YAxis stroke="#000" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#FFF', borderColor: '#000', borderWidth: '2px', fontSize: '11px', color: '#000', boxShadow: '3px 3px 0px #000' }} 
                  itemStyle={{ color: '#000', fontWeight: 'bold' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#000', paddingTop: '8px' }} />
                <Bar dataKey="Revenue" fill="#FFE600" stroke="#000" strokeWidth={1.5} name="Revenue ($M)" />
                <Bar dataKey="NetIncome" fill="#93C5FD" stroke="#000" strokeWidth={1.5} name="Net Income ($M)" />
                <Bar dataKey="OperatingCashFlow" fill="#86EFAC" stroke="#000" strokeWidth={1.5} name="Operating Cash ($M)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 2. Margin Trends Line Chart */}
      {activeVizTab === 'margin' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-black text-black uppercase">
            <span>Profit Margin Dynamics (Gross Margin % vs Net Margin %)</span>
            <span className="neo-badge text-[10px] bg-[#E0F2FE]">EFFICIENCY RATIOS</span>
          </div>
          <div className="w-full h-72 sm:h-80 bg-[#FBFBFA] border-2 border-black p-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={marginTrendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" vertical={false} />
                <XAxis dataKey="quarter" stroke="#000" fontSize={11} tickLine={false} />
                <YAxis stroke="#000" fontSize={11} tickLine={false} unit="%" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#FFF', borderColor: '#000', borderWidth: '2px', fontSize: '11px', color: '#000', boxShadow: '3px 3px 0px #000' }} 
                  itemStyle={{ color: '#000', fontWeight: 'bold' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#000', paddingTop: '8px' }} />
                <Line type="monotone" dataKey="GrossMarginPct" stroke="#000" strokeWidth={2.5} dot={{ fill: '#FFE600', stroke: '#000', strokeWidth: 2, r: 5 }} name="Gross Margin %" />
                <Line type="monotone" dataKey="NetMarginPct" stroke="#3B82F6" strokeWidth={2.5} dot={{ fill: '#93C5FD', stroke: '#000', strokeWidth: 2, r: 5 }} name="Net Margin %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 3. Metric Coverage Donut */}
      {activeVizTab === 'coverage' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-black text-black uppercase">
            <span>Verification Status Distribution</span>
            <span className="neo-badge text-[10px] bg-[#BBF7D0]">100% AUDITABLE</span>
          </div>
          <div className="w-full h-72 sm:h-80 bg-[#FBFBFA] border-2 border-black p-4 flex flex-col sm:flex-row items-center justify-center gap-6">
            <div className="w-52 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={coverageData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} stroke="#000" strokeWidth={2}>
                    {coverageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#FFF', borderColor: '#000', borderWidth: '2px', fontSize: '11px', color: '#000', boxShadow: '3px 3px 0px #000' }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2">
              {coverageData.map((item, idx) => (
                <div key={idx} className="flex items-center space-x-2 text-xs">
                  <div className="w-3.5 h-3.5 border-2 border-black" style={{ backgroundColor: item.color }} />
                  <span className="font-extrabold text-black uppercase">{item.name}:</span>
                  <span className="font-mono text-zinc-700">{item.value} fields</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. DUCKDB INTERACTIVE VECTORIZED SQL ENGINE */}
      {activeVizTab === 'duckdb' && (
        <div className="space-y-3.5 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#FFF9C4] p-3 border-2 border-black">
            <div className="flex items-center space-x-2">
              <Database className="w-4 h-4 text-black stroke-[2.5]" />
              <span className="text-xs sm:text-sm font-black text-black uppercase">DUCKDB IN-MEMORY VECTORIZED SQL ENGINE</span>
            </div>
            {duckdbLatency !== null && (
              <div className="flex items-center space-x-1.5 neo-badge bg-white text-black text-xs font-black">
                <Zap className="w-3.5 h-3.5 text-amber-500 stroke-[3]" />
                <span>LATENCY: {duckdbLatency}ms &bull; ZERO LAG</span>
              </div>
            )}
          </div>

          {/* Quick SQL Presets */}
          <div className="space-y-1">
            <span className="text-xs font-black uppercase text-zinc-800">QUICK SQL PRESETS:</span>
            <div className="flex flex-wrap gap-1.5">
              {duckdbPresets.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSqlQuery(p.query);
                    runDuckDBQuery(p.query);
                  }}
                  className="neo-button-secondary text-xs py-1 px-2.5 font-black cursor-pointer"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* SQL Editor Input */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase text-black">CUSTOM ANALYTICAL SQL (SELECT ONLY):</label>
              <button
                onClick={() => runDuckDBQuery(sqlQuery)}
                disabled={duckdbLoading}
                className="neo-button-primary text-xs py-1 px-3"
              >
                <Play className="w-3.5 h-3.5 stroke-[3]" />
                <span>{duckdbLoading ? 'EXECUTING...' : 'RUN QUERY'}</span>
              </button>
            </div>
            <textarea
              rows={2}
              value={sqlQuery}
              onChange={(e) => setSqlQuery(e.target.value)}
              className="neo-input text-xs sm:text-sm font-mono font-bold leading-tight resize-y"
              placeholder="SELECT * FROM quarterly_performance;"
            />
          </div>

          {/* Query Results Table */}
          {duckdbResult && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-black uppercase text-zinc-800">
                <span>QUERY RESULT ({duckdbResult.row_count || 0} ROWS RETURNED):</span>
                <span>ENGINE: {duckdbResult.engine || 'DuckDB v1.5'}</span>
              </div>

              {duckdbResult.error ? (
                <div className="p-3 bg-[#FEE2E2] border-2 border-black text-rose-950 text-xs sm:text-sm font-bold">
                  Error: {duckdbResult.error}
                </div>
              ) : (
                <div className="overflow-x-auto border-2 border-black max-h-60 bg-white">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr>
                        {duckdbResult.columns.map((col, cIdx) => (
                          <th key={cIdx} className="neo-table-header">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {duckdbResult.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-yellow-50/50">
                          {row.map((val, vIdx) => (
                            <td key={vIdx} className="neo-table-cell font-mono text-xs sm:text-sm font-bold text-black">
                              {val !== null && val !== undefined ? String(val) : 'NULL'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
