import { useState } from 'react';

const Bar = ({ label, value }) => (
  <div>
    <div className="flex justify-between text-xs mb-1">
      <span className="text-slate-300">{label.replace(/_/g, ' ')}</span>
      <span className="tabular-nums text-slate-400">{(value * 100).toFixed(1)}%</span>
    </div>
    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${
          value > 0.6 ? 'bg-rose-400' : value > 0.3 ? 'bg-amber-400' : 'bg-brand-400'
        }`}
        style={{ width: `${Math.max(value * 100, 2)}%` }}
      />
    </div>
  </div>
);

export default function ReportCard({ result }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(result.full_report);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const download = () => {
    const blob = new Blob(
      [`FINDINGS\n${result.findings}\n\nIMPRESSION\n${result.impression}\n`],
      { type: 'text/plain' }
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'radiology-report.txt';
    a.click();
  };

  return (
    <div className="glass rounded-3xl p-6 animate-fade-up">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold">Generated Report</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {result.latency_ms} ms · model {result.model_version}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={copy}
            className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10
                       border border-white/10 transition">
            {copied ? '✓ Copied' : 'Copy'}
          </button>
          <button onClick={download}
            className="text-xs px-3 py-1.5 rounded-lg bg-brand-500/90 hover:bg-brand-600
                       text-white transition">
            Download
          </button>
        </div>
      </div>

      <section className="mb-5">
        <h3 className="text-[11px] font-bold tracking-widest uppercase text-brand-300 mb-2">
          Findings
        </h3>
        <p className="text-sm leading-relaxed text-slate-200">{result.findings}</p>
      </section>

      <section className="mb-6">
        <h3 className="text-[11px] font-bold tracking-widest uppercase text-brand-300 mb-2">
          Impression
        </h3>
        <p className="text-sm leading-relaxed text-slate-200">{result.impression}</p>
      </section>

      <section>
        <h3 className="text-[11px] font-bold tracking-widest uppercase text-slate-400 mb-3">
          Pathologies
        </h3>
        <div className="space-y-2.5">
          {result.findings_tags.map((t) => (
            <Bar key={t.label} label={t.label} value={t.probability} />
          ))}
        </div>
      </section>

      <p className="mt-6 text-[11px] leading-relaxed text-amber-300/80
                    bg-amber-400/5 border border-amber-400/20 rounded-xl p-3">
        ⚠️ Research prototype. Not a medical device. All outputs must be reviewed
        by a qualified radiologist before clinical use.
      </p>
    </div>
  );
}