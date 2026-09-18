import { useState } from 'react';
import ConfidenceRing from './ConfidenceRing';

export default function ReportView({ result, onCopy, onDownload }) {
  const [tab, setTab] = useState('findings');

  const tabs = [
    { id: 'findings',   label: 'Findings'   },
    { id: 'impression', label: 'Impression' },
    { id: 'json',       label: 'Raw JSON'   },
  ];

  return (
    <div className="glass-strong rounded-3xl p-6 animate-fade-up">
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-glow" />
            Generated Report
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            {result.latency_ms} ms · model {result.model_version}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={onCopy}
            className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10
                       border border-white/10 transition">
            Copy
          </button>
          <button onClick={onDownload}
            className="text-xs px-3 py-1.5 rounded-lg bg-brand-500/90 hover:bg-brand-600
                       text-white transition shadow-glow-cyan">
            Download
          </button>
        </div>
      </div>

      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/5 mb-5">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 text-xs py-2 rounded-lg font-medium transition-all duration-200
              ${tab === t.id
                ? 'bg-gradient-to-b from-brand-500/25 to-brand-600/10 text-brand-100 shadow-inner-glow'
                : 'text-slate-400 hover:text-slate-200'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="min-h-[120px]">
        {tab === 'findings' && (
          <p className="text-sm leading-relaxed text-slate-200 animate-fade-in font-sans">
            {result.findings || '—'}
          </p>
        )}

        {tab === 'impression' && (
          <p className="text-sm leading-relaxed text-slate-200 animate-fade-in font-sans">
            {result.impression || '—'}
          </p>
        )}

        {tab === 'json' && (
          <pre className="text-[11px] leading-relaxed text-slate-300 bg-black/40 rounded-xl p-4
                          overflow-auto max-h-72 font-mono border border-white/5 animate-fade-in">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[11px] font-bold tracking-widest uppercase text-slate-400">
            Pathology Confidence
          </h3>
          <div className="flex items-center gap-3 text-[10px] text-slate-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-brand-400" />Low</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" />Med</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400" />High</span>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 py-3">
          {result.findings_tags.slice(0, 5).map((t) => (
            <ConfidenceRing key={t.label} label={t.label} value={t.probability} />
          ))}
        </div>
      </div>

      <div className="mt-6 text-[11px] leading-relaxed text-amber-300/80
                      bg-amber-400/5 border border-amber-400/20 rounded-xl p-3 flex gap-2">
        <span>⚠️</span>
        <span>Research prototype. Not a medical device. All outputs must be reviewed by a qualified radiologist before clinical use.</span>
      </div>
    </div>
  );
}