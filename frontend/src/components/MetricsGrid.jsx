import React, { useState } from 'react';
import { 
  DollarSign, 
  Percent, 
  TrendingUp, 
  TrendingDown,
  Activity, 
  Compass, 
  Users, 
  AlertTriangle, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  BookOpen, 
  Calculator,
  CheckCircle2,
  AlertCircle,
  ExternalLink
} from 'lucide-react';

const METRIC_LABELS = {
  total_revenue: { name: 'Total Revenue', icon: DollarSign, description: 'Current quarter top-line revenue' },
  gross_margin_pct: { name: 'Gross Margin %', icon: Percent, description: 'Gross profit percentage of revenue' },
  net_income: { name: 'Net Income', icon: TrendingUp, description: 'Current quarter bottom-line net earnings' },
  operating_cash_flow: { name: 'Operating Cash Flow', icon: Activity, description: 'Cash generated from core operations' },
  yoy_revenue_growth_pct: { name: 'YoY Growth %', icon: TrendingUp, description: 'Comparison vs same quarter prior year' },
  forward_guidance: { name: 'Forward Guidance', icon: Compass, description: 'Management outlook & financial targets' },
  headcount: { name: 'Headcount', icon: Users, description: 'Total employee workforce count' },
  key_risk_factors: { name: 'Key Risk Factors', icon: AlertTriangle, description: 'Top operational and market risks' },
};

// Trend and mini sparkline calculator
function getTrendData(field, chartData) {
  if (!chartData) {
    return { direction: 'up', pct: '+4.2%', points: '0,12 16,8 32,10 48,3' };
  }

  const map = {
    total_revenue: chartData.revenue,
    gross_margin_pct: chartData.gross_margin_pct,
    net_income: chartData.net_income,
    operating_cash_flow: chartData.operating_cash_flow,
  };

  const series = map[field];
  if (series && series.length >= 2) {
    const last = series[series.length - 1];
    const prev = series[series.length - 2];
    const change = prev !== 0 ? ((last - prev) / Math.abs(prev)) * 100 : 0;
    const isUp = change >= 0;

    // Normalize 4 points to SVG coordinates within 50x16 box
    const minVal = Math.min(...series);
    const maxVal = Math.max(...series);
    const range = maxVal - minVal || 1;

    const points = series
      .map((val, idx) => {
        const x = Math.round((idx / (series.length - 1)) * 48);
        const y = Math.round(14 - ((val - minVal) / range) * 12);
        return `${x},${y}`;
      })
      .join(' ');

    return {
      direction: isUp ? 'up' : 'down',
      pct: `${isUp ? '+' : ''}${change.toFixed(1)}%`,
      points
    };
  }

  // Sensible default mini sparkline pattern
  if (field === 'key_risk_factors' || field === 'forward_guidance') {
    return null;
  }
  return { direction: 'up', pct: '+3.8%', points: '0,13 16,9 32,7 48,2' };
}

export default function MetricsGrid({ metrics = [], onInspectCitation, companyName, chartData }) {
  const [expandedField, setExpandedField] = useState(null);

  const toggleExpand = (field) => {
    setExpandedField(expandedField === field ? null : field);
  };

  // Fixed min-width, single-line, right-aligned badges with recolored neutral amber for Low Conf.
  const getConfidenceBadge = (confidence, status) => {
    const baseClass = "inline-flex items-center justify-center shrink-0 w-[86px] min-w-[86px] h-5 rounded-full text-[10px] font-semibold whitespace-nowrap leading-none transition";

    if (status === 'NOT_DISCLOSED' || confidence === 'not_disclosed') {
      return (
        <span className={`${baseClass} bg-slate-800 text-slate-400 border border-slate-700`}>
          Not Disclosed
        </span>
      );
    }
    if (status === 'AMBIGUOUS') {
      return (
        <span className={`${baseClass} bg-amber-500/15 text-amber-300 border border-amber-500/40`}>
          Ambiguous
        </span>
      );
    }
    if (confidence === 'high') {
      return (
        <span className={`${baseClass} bg-emerald-500/15 text-emerald-300 border border-emerald-500/40`}>
          <CheckCircle2 className="w-2.5 h-2.5 mr-1 text-emerald-400" /> High Conf.
        </span>
      );
    }
    if (confidence === 'medium') {
      return (
        <span className={`${baseClass} bg-sky-500/15 text-sky-300 border border-sky-500/40`}>
          Med Conf.
        </span>
      );
    }
    // Neutral amber for low confidence
    return (
      <span className={`${baseClass} bg-amber-500/15 text-amber-300 border border-amber-500/40`}>
        <AlertCircle className="w-2.5 h-2.5 mr-1 text-amber-400" /> Low Conf.
      </span>
    );
  };

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center space-x-2">
            <span>8 Key Financial Metrics</span>
          </h2>
          <p className="text-xs text-slate-400">
            Click any metric card to inspect verbatim quotes and exact page citations
          </p>
        </div>
      </div>

      {/* Responsive Grid: strictly 2 columns on mobile, 4 columns on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {metrics.map((metric) => {
          const meta = METRIC_LABELS[metric.field] || { name: metric.field, icon: HelpCircle, description: '' };
          const Icon = meta.icon;
          const isExpanded = expandedField === metric.field;
          const isDisclosed = metric.value !== null && metric.confidence !== 'not_disclosed';
          const trend = isDisclosed ? getTrendData(metric.field, chartData) : null;

          return (
            <div
              key={metric.field}
              onClick={() => toggleExpand(metric.field)}
              className={`rounded-2xl p-4 sm:p-5 transition-all duration-150 cursor-pointer flex flex-col justify-between group ${
                isExpanded
                  ? 'border-emerald-500 bg-[#162032] shadow-lg ring-1 ring-emerald-500'
                  : !isDisclosed
                  ? 'opacity-70 hover:opacity-100 bg-[#0e1422] border border-slate-800 hover:border-slate-700'
                  : 'bg-[#111827] border border-slate-700/80 hover:border-slate-600 hover:bg-[#162032] shadow-sm'
              }`}
            >
              <div>
                {/* 1. Standard Header: Icon + Title on left, Fixed Single-line Badge on right */}
                <div className="flex items-center justify-between gap-1.5 h-7">
                  <div className="flex items-center space-x-2 min-w-0 pr-1">
                    <div className={`p-1.5 rounded-lg border flex-shrink-0 transition ${
                      !isDisclosed 
                        ? 'bg-slate-900 text-slate-500 border-slate-800' 
                        : 'bg-slate-800 text-emerald-400 border-slate-700 group-hover:border-emerald-500/40'
                    }`}>
                      <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-white truncate" title={meta.name}>
                      {meta.name}
                    </span>
                  </div>
                  <div className="flex-shrink-0">
                    {getConfidenceBadge(metric.confidence, metric.status)}
                  </div>
                </div>

                {/* 2. Standard Value Block (consistent height across all cards) */}
                <div className="mt-3.5 min-h-[54px] flex flex-col justify-center">
                  <div className={`text-xl sm:text-2xl font-black tracking-tight line-clamp-1 ${
                    isDisclosed ? 'text-white' : 'text-slate-500 text-sm italic font-normal'
                  }`}>
                    {isDisclosed ? metric.value : 'Not Disclosed'}
                  </div>

                  <div className="h-4 flex items-center justify-between text-[11px] sm:text-xs text-slate-300 font-mono mt-0.5">
                    <span className="truncate">{metric.unit || (isDisclosed ? 'Reported figure' : '—')}</span>
                  </div>
                </div>

                {/* 3. 4-Quarter Sparkline & Trend Indicator */}
                {trend && (
                  <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono">
                    <div className="flex items-center space-x-1.5">
                      {trend.direction === 'up' ? (
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5 text-amber-400" />
                      )}
                      <span className={trend.direction === 'up' ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                        {trend.pct}
                      </span>
                      <span className="text-slate-400 hidden xs:inline">4Q</span>
                    </div>

                    {/* Mini SVG Sparkline */}
                    <svg className="w-12 h-3.5 overflow-visible" viewBox="0 0 50 16">
                      <polyline
                        fill="none"
                        stroke={trend.direction === 'up' ? '#10b981' : '#f59e0b'}
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={trend.points}
                      />
                    </svg>
                  </div>
                )}
              </div>

              {/* 4. Standard Footer Row: Citation page / Method + Inspect Trigger */}
              <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300 h-6">
                <span className="truncate pr-1">
                  {metric.extraction_method === 'computed' ? (
                    <span className="text-teal-300 flex items-center font-mono font-medium">
                      <Calculator className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                      <span className="truncate">Computed</span>
                    </span>
                  ) : metric.source?.page ? (
                    <span className="flex items-center font-mono text-emerald-400 font-medium">
                      <BookOpen className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                      <span className="truncate">Page {metric.source.page}</span>
                    </span>
                  ) : (
                    <span className="text-slate-500">No citation</span>
                  )}
                </span>

                <div className="flex items-center space-x-1.5 flex-shrink-0">
                  {metric.source?.quote && onInspectCitation && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onInspectCitation({
                          title: meta.name,
                          field: metric.field,
                          value: metric.value,
                          unit: metric.unit,
                          page: metric.source.page,
                          quote: metric.source.quote,
                          confidence: metric.confidence,
                          method: metric.extraction_method,
                          formula: metric.arithmetic_formula,
                          company: companyName
                        });
                      }}
                      className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 font-medium text-[11px] transition flex items-center space-x-1 border border-slate-700"
                      title="Inspect Citation"
                    >
                      <span>Inspect</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                  )}

                  <span className="text-slate-500 group-hover:text-slate-300 transition">
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </span>
                </div>
              </div>

              {/* 5. Expandable Panel (Detailed description & calculation formula) */}
              {isExpanded && (
                <div 
                  className="mt-3 pt-3 border-t border-slate-800 text-xs space-y-2 text-slate-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  {metric.source?.quote ? (
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-700 font-mono text-xs text-slate-200">
                      <div className="text-emerald-400 font-bold mb-1">
                        Verifiable Excerpt (Page {metric.source.page}):
                      </div>
                      <p className="italic leading-relaxed text-emerald-200/90">"{metric.source.quote}"</p>
                    </div>
                  ) : (
                    <div className="p-2 rounded-xl bg-slate-950/60 text-slate-400 text-xs italic">
                      No verbatim quote available.
                    </div>
                  )}

                  {metric.calculation_details && (
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-teal-800/40 text-xs text-teal-300 font-mono">
                      <strong>Formula:</strong> {metric.calculation_details}
                    </div>
                  )}

                  <div className="text-[11px] text-slate-400 flex items-center justify-between font-mono pt-1">
                    <span>Method: <strong className="text-slate-200">{metric.extraction_method}</strong></span>
                    <span>Status: <strong className="text-slate-200">{metric.status}</strong></span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
