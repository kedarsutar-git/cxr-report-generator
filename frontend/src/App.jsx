import { useEffect, useState, useCallback } from 'react';
import TopBar from './components/TopBar';
import Sidebar from './components/Sidebar';
import UploadZone from './components/UploadZone';
import ReportView from './components/ReportView';
import Loader from './components/Loader';
import Toasts from './components/Toasts';
import { generateReport, pushHistory } from './api';

export default function App() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
    document.documentElement.classList.toggle('dark',  theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const addToast = useCallback((message, type = 'info') => {
    setToasts((t) => [...t, { id: Date.now() + Math.random(), message, type }]);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const run = useCallback(async () => {
    if (!file) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const r = await generateReport(file);
      setResult(r);
      pushHistory({ result: r });
      setRefreshKey((k) => k + 1);
      addToast('Report generated successfully', 'success');
    } catch (e) {
      setError(e.message);
      addToast('Generation failed', 'error');
    } finally {
      setLoading(false);
    }
  }, [file, addToast]);

  useEffect(() => {
    const h = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [run]);

  const copyReport = async () => {
    await navigator.clipboard.writeText(result.full_report);
    addToast('Copied to clipboard', 'success');
  };

  const downloadReport = () => {
    const blob = new Blob(
      [`FINDINGS\n${result.findings}\n\nIMPRESSION\n${result.impression}\n`],
      { type: 'text/plain' }
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `radiology-report-${Date.now()}.txt`;
    a.click();
    addToast('Report downloaded', 'success');
  };

  return (
    <div className="relative min-h-screen flex flex-col">
      <div className="aurora" />

      <TopBar theme={theme} setTheme={setTheme} onMenuClick={() => setSidebarOpen(true)} />

      <div className="flex-1 flex relative z-10">
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onSelect={(h) => { if (h) setResult(h.result); setSidebarOpen(false); }}
          refreshKey={refreshKey}
        />

        <main className="flex-1 px-6 py-6 grid gap-6 lg:grid-cols-2 items-start max-w-7xl mx-auto w-full">
          <div className="space-y-4">
            <UploadZone onFile={setFile} disabled={loading} onGenerate={run} />

            {error && (
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10
                              text-rose-200 text-sm p-4 animate-fade-up flex gap-2">
                <span>⚠️</span>
                <span className="break-all">{error}</span>
              </div>
            )}

            <p className="text-[10px] text-slate-500 text-center font-mono">
              Press <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">Ctrl</kbd> +
              <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">Enter</kbd> to generate
            </p>
          </div>

          <div>
            {loading && <Loader />}
            {!loading && result && (
              <ReportView result={result} onCopy={copyReport} onDownload={downloadReport} />
            )}
            {!loading && !result && (
              <div className="glass-strong rounded-3xl p-12 text-center animate-fade-up">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl
                                bg-gradient-to-br from-brand-500/20 to-aurora-indigo/10
                                border border-brand-500/20 grid place-items-center">
                  <svg className="w-8 h-8 text-brand-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-sm text-slate-400">
                  Upload a chest X-ray and hit{' '}
                  <span className="text-brand-300 font-medium">Generate Report</span>
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  Findings, impression, and pathology scores will appear here.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      <Toasts items={toasts} onDismiss={dismissToast} />
    </div>
  );
}