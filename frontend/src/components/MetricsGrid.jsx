import React, { useState } from 'react';
import { 
  DollarSign, 
  Percent, 
  TrendingUp, 
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
  XCircle,
  ExternalLink,
  Sparkles
} from 'lucide-react';

const METRIC_LABELS = {
  total_revenue: { name: 'Total Revenue', icon: DollarSign, description: 'Current quarter top-line revenue' },
  gross_margin_pct: { name: 'Gross Margin %', icon: Percent, description: 'Gross profit percentage of revenue' },
  net_income: { name: 'Net Income', icon: TrendingUp, description: 'Current quarter bottom-line net earnings' },
  operating_cash_flow: { name: 'Operating Cash Flow', icon: Activity, description: 'Cash generated from core operations' },
  yoy_revenue_growth_pct: { name: 'YoY Revenue Growth', icon: TrendingUp, description: 'Comparison vs same quarter prior year' },
  forward_guidance: { name: 'Forward Guidance', icon: Compass, description: 'Management outlook & financial targets' },
  headcount: { name: 'Headcount', icon: Users, description: 'Total employee workforce count' },
  key_risk_factors: { name: 'Key Risk Factors', icon: AlertTriangle, description: 'Top operational and market risks' },
};

export default function MetricsGrid({ metrics = [], onInspectCitation, companyName }) {
  const [expandedField, setExpandedField] = useState(null);

  const toggleExpand = (field) => {
    setExpandedField(expandedField === field ? null : field);
  };

  const getConfidenceBadge = (confidence, status) => {
    if (status === 'NOT_DISCLOSED' || confidence === 'not_disclosed') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
          Not Disclosed
        </span>
      );
    }
    if (status === 'AMBIGUOUS') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
          Ambiguous Discl.
        </span>
      );
    }
    if (confidence === 'high') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-950">
          <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-400" /> High Conf.
        </span>
      );
    }
    if (confidence === 'medium') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
          Medium Conf.
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
        <XCircle className="w-3 h-3 mr-1" /> Low Conf.
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center space-x-2">
            <span>8 Key Financial Metrics</span>
          </h2>
          <p className="text-xs text-slate-400">
            Click any metric card to inspect exact page numbers and verbatim quote citations
          </p>
        </div>
      </div>

      {/* Responsive Grid: 2 columns on mobile (minmax 160px), 4 columns on desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {metrics.map((metric) => {
          const meta = METRIC_LABELS[metric.field] || { name: metric.field, icon: HelpCircle, description: '' };
          const Icon = meta.icon;
          const isExpanded = expandedField === metric.field;
          const isDisclosed = metric.value !== null && metric.confidence !== 'not_disclosed';

          return (
            <div
              key={metric.field}
              onClick={() => toggleExpand(metric.field)}
              className={`bg-slate-900/80 backdrop-blur-sm border rounded-2xl p-4 sm:p-5 transition-all duration-300 cursor-pointer flex flex-col justify-between group hover:shadow-xl hover:shadow-emerald-950/20 ${
                isExpanded 
                  ? 'border-emerald-500/70 ring-2 ring-emerald-500/20 bg-slate-900 shadow-xl' 
                  : 'border-slate-800/80 hover:border-slate-700 bg-slate-900/60 hover:bg-slate-900/90 hover:-translate-y-0.5'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2.5 rounded-xl bg-slate-800/90 text-emerald-400 border border-slate-700/60 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/30 transition">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-200">{meta.name}</span>
                  </div>
                  {getConfidenceBadge(metric.confidence, metric.status)}
                </div>

                {/* Metric Value */}
                <div className="mt-4">
                  <div className="text-xl sm:text-2xl font-black tracking-tight text-white line-clamp-2">
                    {isDisclosed ? (
                      metric.value
                    ) : (
                      <span className="text-slate-500 text-sm italic font-normal">Not Disclosed</span>
                    )}
                  </div>
                  {metric.unit && (
                    <div className="text-[11px] text-slate-400 font-mono mt-1">{metric.unit}</div>
                  )}
                </div>
              </div>

              {/* Footer Indicator & Quick Modal Trigger */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center space-x-1">
                  {metric.extraction_method === 'computed' ? (
                    <span className="text-teal-400 flex items-center font-mono font-medium">
                      <Calculator className="w-3.5 h-3.5 mr-1" /> Computed
                    </span>
                  ) : metric.source?.page ? (
                    <span className="flex items-center font-mono text-emerald-400 font-medium">
                      <BookOpen className="w-3.5 h-3.5 mr-1" /> Page {metric.source.page}
                    </span>
                  ) : (
                    <span>No citation</span>
                  )}
                </span>

                <div className="flex items-center space-x-2">
                  {metric.source?.quote && onInspectCitation && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onInspectCitation({
                          title: meta.name,
                          field: metric.field,
                          value: metric.value,
                          unit: metric.unit,
                          page: metric.source?.page,
                          quote: metric.source?.quote,
                          confidence: metric.confidence,
                          method: metric.extraction_method,
                          formula: metric.calculation_details,
                          company: companyName
                        });
                      }}
                      className="px-2 py-0.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-[10px] font-mono flex items-center space-x-1 transition"
                      title="Inspect Citation in Modal"
                    >
                      <span>Inspect</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}

                  <span className="text-slate-400">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </span>
                </div>
              </div>

              {/* Expanded Citation Accordion */}
              {isExpanded && (
                <div 
                  className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-300 space-y-2.5 animate-in fade-in duration-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  {metric.source?.quote ? (
                    <div className="p-3 rounded-xl bg-black/70 border border-emerald-500/20 font-mono text-[11px] text-slate-300">
                      <div className="text-emerald-400 font-bold mb-1 flex items-center justify-between">
                        <span>Verifiable Excerpt (Page {metric.source.page}):</span>
                      </div>
                      <p className="italic leading-relaxed text-emerald-200/90">"{metric.source.quote}"</p>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-slate-950/60 text-slate-500 text-[11px] italic">
                      No verbatim quote available in filing.
                    </div>
                  )}

                  {metric.calculation_details && (
                    <div className="p-2.5 rounded-xl bg-teal-950/30 border border-teal-800/40 text-[11px] text-teal-300 font-mono">
                      <strong>Formula:</strong> {metric.calculation_details}
                    </div>
                  )}

                  <div className="text-[10px] text-slate-400 flex items-center justify-between font-mono">
                    <span>Method: {metric.extraction_method}</span>
                    <span>Status: {metric.status}</span>
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
