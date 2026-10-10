import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Table as TableIcon, 
  BarChart3, 
  ShieldCheck,
  Maximize2,
  RefreshCw,
  Layers
} from 'lucide-react';
import { api } from '../services/api';

export default function PdfSourceViewer({ 
  citation, 
  citations = [],
  documentId, 
  documentVersion = 'v1',
  companyName = 'Corporate Filing',
  onClose 
}) {
  const allCitations = citations.length > 0 ? citations : (citation ? [citation] : []);
  const [activeCiteIndex, setActiveCiteIndex] = useState(0);

  const activeCitation = allCitations[activeCiteIndex] || citation;

  const initialPage = activeCitation?.physical_page_number || activeCitation?.page || 1;
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(activeCitation?.total_pages || 1);
  const [printedLabel, setPrintedLabel] = useState(activeCitation?.printed_page_label || null);
  const [pageEvidence, setPageEvidence] = useState(null);
  const [pageImageBlobUrl, setPageImageBlobUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(100);

  const imageContainerRef = useRef(null);

  // Sync with active citation change
  useEffect(() => {
    if (activeCitation) {
      const targetPage = activeCitation.physical_page_number || activeCitation.page || 1;
      setCurrentPage(targetPage);
      setPrintedLabel(activeCitation.printed_page_label || null);
    }
  }, [activeCiteIndex, activeCitation]);

  // Load page evidence and image for currentPage
  useEffect(() => {
    let isCancelled = false;
    const loadPageData = async () => {
      const docId = activeCitation?.document_id || activeCitation?.doc_id || documentId;
      if (!docId) {
        setError('No document ID available for citation verification.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Fetch structured layout evidence
        const evidenceRes = await api.getDocumentPageEvidence(docId, currentPage);
        if (isCancelled) return;
        setPageEvidence(evidenceRes);
        if (evidenceRes.printed_page_label) {
          setPrintedLabel(evidenceRes.printed_page_label);
        }

        // Fetch authenticated page image as blob
        const token = api.token;
        const imgUrl = `${api.getDocumentPdfUrl(docId).replace('/file', '')}/page/${currentPage}/image?dpi=150`;
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const res = await fetch(imgUrl, { headers });
        if (!res.ok) {
          throw new Error(`Failed to load page image (HTTP ${res.status})`);
        }
        const blob = await res.blob();
        if (isCancelled) return;

        if (pageImageBlobUrl) {
          URL.revokeObjectURL(pageImageBlobUrl);
        }
        const blobUrl = URL.createObjectURL(blob);
        setPageImageBlobUrl(blobUrl);
        setIsLoading(false);
      } catch (err) {
        if (!isCancelled) {
          setError(err.message || 'Error loading authenticated page source.');
          setIsLoading(false);
        }
      }
    };

    loadPageData();

    return () => {
      isCancelled = true;
    };
  }, [currentPage, activeCitation?.document_id, documentId]);

  const docId = activeCitation?.document_id || activeCitation?.doc_id || documentId;
  const region = activeCitation?.region;
  const quote = activeCitation?.quote || activeCitation?.snippet || '';
  const contentType = activeCitation?.content_type || 'text';

  // Compute bounding box styling relative to original page dimensions
  const renderBoundingBoxOverlay = () => {
    if (!region || !pageEvidence || !pageEvidence.width || !pageEvidence.height) {
      return null;
    }

    const { x0, y0, x1, y1 } = region;
    const pw = pageEvidence.width;
    const ph = pageEvidence.height;

    const leftPct = (x0 / pw) * 100;
    const topPct = (y0 / ph) * 100;
    const widthPct = ((x1 - x0) / pw) * 100;
    const heightPct = ((y1 - y0) / ph) * 100;

    return (
      <div 
        className="absolute border-3 border-red-600 bg-red-400/25 pointer-events-none transition-all shadow-[0_0_12px_rgba(239,68,68,0.7)] animate-pulse"
        style={{
          left: `${leftPct}%`,
          top: `${topPct}%`,
          width: `${Math.max(widthPct, 2)}%`,
          height: `${Math.max(heightPct, 2)}%`
        }}
      >
        <span className="absolute -top-6 left-0 bg-red-600 text-white font-mono text-[10px] font-black px-1.5 py-0.5 rounded-none uppercase shadow-[2px_2px_0px_#000]">
          CITED REGION
        </span>
      </div>
    );
  };

  const handleOpenRawPdf = () => {
    if (docId) {
      const url = api.getDocumentPdfUrl(docId) + `#page=${currentPage}`;
      window.open(url, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs font-mono text-zinc-900">
      <div 
        className="bg-white border-3 border-black shadow-[10px_10px_0px_0px_#000000] w-full max-w-6xl h-[92vh] flex flex-col relative overflow-hidden animate-in fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between px-4 py-3 bg-[#FFE600] border-b-3 border-black gap-2 select-none">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 bg-black text-[#FFE600] border-2 border-black flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs sm:text-sm font-black text-black uppercase tracking-wider">
                  SOURCE VERIFICATION AUDIT PANEL
                </span>
                <span className="neo-badge text-[9px] bg-white border border-black text-black font-bold">
                  VERSION {activeCitation?.document_version || documentVersion}
                </span>
              </div>
              <p className="text-[11px] text-zinc-900 font-sans font-medium truncate max-w-md">
                Filing: <strong>{companyName}</strong> &bull; Document ID: <code>{docId?.slice(0, 8)}...</code>
              </p>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center bg-white border-2 border-black shadow-[2px_2px_0px_#000]">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-1.5 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed border-r-2 border-black text-black"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4 stroke-[3]" />
              </button>
              <div className="px-3 text-xs font-black text-black flex items-center space-x-1">
                <span>PDF PAGE {currentPage}</span>
                {printedLabel && (
                  <span className="text-zinc-600 font-normal">
                    (Printed: {printedLabel})
                  </span>
                )}
              </div>
              <button
                onClick={() => setCurrentPage((p) => p + 1)}
                className="p-1.5 hover:bg-zinc-100 border-l-2 border-black text-black"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4 stroke-[3]" />
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center bg-white border-2 border-black shadow-[2px_2px_0px_#000]">
              <button
                onClick={() => setZoomLevel((z) => Math.max(60, z - 20))}
                className="p-1.5 hover:bg-zinc-100 border-r-2 border-black text-black"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4 stroke-[2.5]" />
              </button>
              <span className="px-2 text-xs font-bold text-black">{zoomLevel}%</span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(200, z + 20))}
                className="p-1.5 hover:bg-zinc-100 border-l-2 border-black text-black"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Raw PDF link */}
            <button
              onClick={handleOpenRawPdf}
              className="neo-button-secondary text-xs py-1.5 px-2.5 hidden md:flex items-center space-x-1"
              title="Open Raw PDF in New Tab"
            >
              <span>RAW PDF</span>
              <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 bg-black text-white hover:bg-zinc-800 transition shadow-[2px_2px_0px_#000]"
              title="Close Viewer"
            >
              <X className="w-5 h-5 stroke-[3]" />
            </button>
          </div>
        </div>

        {/* Multiple Citations Selector Bar */}
        {allCitations.length > 1 && (
          <div className="flex items-center px-4 py-2 bg-zinc-100 border-b-2 border-black gap-2 overflow-x-auto text-xs">
            <span className="text-zinc-600 font-black uppercase text-[10px] flex-shrink-0">
              CITATIONS ({allCitations.length}):
            </span>
            {allCitations.map((c, idx) => (
              <button
                key={c.citation_id || idx}
                onClick={() => setActiveCiteIndex(idx)}
                className={`px-2.5 py-1 border text-xs font-bold transition flex items-center space-x-1.5 flex-shrink-0 ${
                  activeCiteIndex === idx
                    ? 'bg-black text-white border-black shadow-[2px_2px_0px_#FFE600]'
                    : 'bg-white text-zinc-900 border-black hover:bg-yellow-50'
                }`}
              >
                <span>Citation {idx + 1}</span>
                <span className="text-[10px] opacity-75">(P.{c.physical_page_number || c.page})</span>
              </button>
            ))}
          </div>
        )}

        {/* Main Workspace Area (Split: Page Image left, Citation Audit right) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden bg-zinc-200">
          
          {/* Left / Center: Authentic PDF Page Render (8 cols) */}
          <div 
            ref={imageContainerRef}
            className="lg:col-span-8 h-full overflow-auto flex items-center justify-center p-4 relative"
          >
            {isLoading ? (
              <div className="flex flex-col items-center justify-center space-y-2 text-zinc-700">
                <RefreshCw className="w-8 h-8 animate-spin stroke-[2.5] text-black" />
                <span className="text-xs font-bold uppercase">Rendering authentic PDF page {currentPage}...</span>
              </div>
            ) : error ? (
              <div className="neo-card bg-red-100 border-2 border-red-800 text-red-950 p-6 max-w-md text-center space-y-2">
                <AlertCircle className="w-8 h-8 text-red-700 mx-auto" />
                <h4 className="font-black text-sm uppercase">Verification Page Error</h4>
                <p className="text-xs font-sans">{error}</p>
                <button
                  onClick={handleOpenRawPdf}
                  className="neo-button-primary text-xs py-1.5 px-3 mt-2"
                >
                  TRY OPENING PDF STREAM
                </button>
              </div>
            ) : (
              <div 
                className="relative bg-white shadow-[0_4px_24px_rgba(0,0,0,0.25)] border-2 border-black transition-transform origin-top"
                style={{ transform: `scale(${zoomLevel / 100})` }}
              >
                {pageImageBlobUrl && (
                  <img
                    src={pageImageBlobUrl}
                    alt={`PDF Source Page ${currentPage}`}
                    className="max-w-none block select-none pointer-events-auto"
                    style={{ width: `${pageEvidence?.width ? pageEvidence.width * 1.5 : 800}px` }}
                  />
                )}
                {/* Visual Bounding Box Overlay */}
                {renderBoundingBoxOverlay()}
              </div>
            )}
          </div>

          {/* Right: Source Verification Audit Sidebar (4 cols) */}
          <div className="lg:col-span-4 h-full bg-[#FBFBFA] border-t-3 lg:border-t-0 lg:border-l-3 border-black p-4 overflow-y-auto space-y-3.5">
            
            {/* Header Status Card */}
            <div className="neo-card bg-white p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="neo-badge-green text-xs font-black">
                  <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
                  <span>DETERMINISTIC GROUNDING</span>
                </span>
                <span className="text-xs font-black text-zinc-800 uppercase">
                  {contentType.toUpperCase()}
                </span>
              </div>
              <div className="text-xs text-zinc-700 font-sans space-y-1">
                <div>Document ID: <strong>{docId}</strong></div>
                <div>Document Version: <strong>{activeCitation?.document_version || documentVersion}</strong></div>
                <div>Physical Page Index: <strong>{activeCitation?.physical_page_index ?? (currentPage - 1)} (0-based)</strong></div>
                <div>PDF Page Number: <strong>{currentPage} (1-based)</strong></div>
                {printedLabel && <div>Printed Page Label: <strong>{printedLabel}</strong></div>}
              </div>
            </div>

            {/* Verbatim Supporting Quote Card */}
            {quote && (
              <div className="space-y-1">
                <div className="text-xs uppercase font-black text-black flex items-center justify-between">
                  <span className="flex items-center">
                    <FileText className="w-3.5 h-3.5 mr-1 stroke-[2.5]" />
                    <span>VERBATIM SUPPORTING EXCERPT:</span>
                  </span>
                  <span className="neo-badge-yellow text-[9px]">EXACT SUBSTRING</span>
                </div>
                <div className="p-3 bg-[#FFFDE7] border-2 border-black font-sans text-xs text-zinc-950 leading-relaxed font-medium italic shadow-[2px_2px_0px_#000]">
                  "{quote}"
                </div>
              </div>
            )}

            {/* Bounding Box Information */}
            {region ? (
              <div className="neo-card bg-white p-3 space-y-1.5 text-xs">
                <span className="font-black text-black uppercase flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>SOURCE REGION COORDINATES (PT):</span>
                </span>
                <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px] bg-zinc-50 p-2 border border-black">
                  <div>X0: <strong>{Math.round(region.x0)}</strong></div>
                  <div>Y0: <strong>{Math.round(region.y0)}</strong></div>
                  <div>X1: <strong>{Math.round(region.x1)}</strong></div>
                  <div>Y1: <strong>{Math.round(region.y1)}</strong></div>
                </div>
                <p className="text-[10px] text-zinc-600 font-sans">
                  Highlighted in red on the authoritative page rendering.
                </p>
              </div>
            ) : (
              <div className="p-2.5 bg-yellow-50 border border-black text-xs text-zinc-800">
                <p className="font-sans font-medium text-[11px]">
                  Page-level citation verified. Specific bounding box coordinates not mapped; navigating to physical page {currentPage}.
                </p>
              </div>
            )}

            {/* Structured Table Evidence if available */}
            {pageEvidence?.tables && pageEvidence.tables.length > 0 && (
              <div className="neo-card bg-white p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-black text-black uppercase flex items-center gap-1">
                    <TableIcon className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>EXTRACTED PAGE TABLES ({pageEvidence.tables.length})</span>
                  </span>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {pageEvidence.tables.map((t, tidx) => (
                    <div key={t.table_id || tidx} className="p-1.5 bg-zinc-50 border border-black text-[11px]">
                      <div className="font-bold text-black truncate">{t.title}</div>
                      <div className="text-zinc-600 font-mono text-[10px]">
                        {t.row_count} rows &bull; {t.col_count} columns
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Visual Region / Chart Evidence if available */}
            {pageEvidence?.visual_regions && pageEvidence.visual_regions.length > 0 && (
              <div className="neo-card bg-white p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-black text-black uppercase flex items-center gap-1">
                    <BarChart3 className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>VISUAL / CHART REGIONS ({pageEvidence.visual_regions.length})</span>
                  </span>
                </div>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {pageEvidence.visual_regions.map((v, vidx) => (
                    <div key={v.region_id || vidx} className="p-1.5 bg-zinc-50 border border-black text-[11px]">
                      <div className="font-bold text-black truncate">{v.caption}</div>
                      <div className="text-zinc-600 font-mono text-[10px]">Type: {v.type}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 flex items-center justify-between gap-2">
              <button
                onClick={handleOpenRawPdf}
                className="neo-button-primary text-xs py-2 px-3 flex-1 flex items-center justify-center space-x-1"
              >
                <span>OPEN FULL PDF</span>
                <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
              <button
                onClick={onClose}
                className="neo-button-secondary text-xs py-2 px-4 font-black"
              >
                CLOSE
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
