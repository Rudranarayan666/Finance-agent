import React, { useState, useRef } from 'react';
import { UploadCloud, FileCheck2, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { api } from '../services/api';

export default function UploadZone({ onDocumentUploaded, isProcessing, currentJob }) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const validateAndUpload = async (file) => {
    setError(null);

    // 1. File Type Validation
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setError('Invalid file type: Please upload a valid earnings PDF document.');
      return;
    }

    // 2. File Size Validation (50MB)
    const maxBytes = 50 * 1024 * 1024;
    if (file.size > maxBytes) {
      setError(`File size exceeds 50MB limit (Selected: ${(file.size / (1024 * 1024)).toFixed(1)}MB).`);
      return;
    }

    try {
      setIsUploading(true);
      const doc = await api.uploadDocument(file);
      setIsUploading(false);
      if (onDocumentUploaded) {
        onDocumentUploaded(doc);
      }
    } catch (err) {
      setIsUploading(false);
      setError(err.message || 'Failed to upload document. Ensure you have analyst permissions.');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndUpload(e.target.files[0]);
    }
  };

  return (
    <div className="w-full">
      {/* Upload Box */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !isUploading && !isProcessing && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-6 sm:p-10 text-center transition-all cursor-pointer relative overflow-hidden ${
          isDragging
            ? 'border-emerald-500 bg-emerald-500/10 scale-[1.01]'
            : 'border-slate-700/80 hover:border-emerald-500/60 bg-[#111827] hover:bg-[#162032] shadow-sm'
        } ${isProcessing || isUploading ? 'pointer-events-none opacity-80' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />

        {isUploading || isProcessing ? (
          <div className="py-4 space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Loader2 className="w-7 h-7 text-emerald-400 animate-spin" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                {isUploading ? 'Uploading & Verifying PDF...' : 'Multi-Agent Extraction in Progress...'}
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                {currentJob?.step || 'Parsing page ranges, routing financial sections & verifying citations...'}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full max-w-xs mx-auto bg-slate-800 rounded-full h-2 overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full animate-shimmer" style={{ width: '70%' }} />
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#0e1422] border border-slate-700/80 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition">
              <UploadCloud className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">
                Drop your earnings report here, or <span className="text-emerald-400 underline underline-offset-4 decoration-emerald-500/40">browse files</span>
              </h3>
              <p className="text-xs text-slate-300">
                Supports SEC Form 10-Q, 10-K, and Corporate Annual Reports (up to 50MB)
              </p>
            </div>

            <div className="inline-flex items-center space-x-2 text-xs font-mono text-slate-300 bg-[#0e1422] px-3.5 py-1.5 rounded-full border border-slate-700/80">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>100% Deterministic Extraction • Zero Hallucination Risk</span>
            </div>
          </div>
        )}
      </div>

      {/* Inline Error Display */}
      {error && (
        <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start space-x-2 text-xs text-red-300 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
