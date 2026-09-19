import { useEffect, useState, useCallback, useRef } from 'react';
import TopBar from './components/TopBar';
import Sidebar from './components/Sidebar';
import UploadZone from './components/UploadZone';
import ReportView from './components/ReportView';
import Loader from './components/Loader';
import Toasts from './components/Toasts';
import { generateReport, generateReportStream, pushHistory } from './api';
import { exportReportPdf } from './utils/exportPdf';

export default function App() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [error, setError] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const abortRef = useRef(null);

  // ---------- Theme ----------
  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
    document.documentElement.classList.toggle('dark',  theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  // ---------- Toasts ----------
  const addToast = useCallback((message, type = 'info') => {
    setToasts((t) => [...t, { id: Date.now() + Math.random(), message, type }]);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  // ---------- Generate (streaming with fallback) ----------
  const run = useCallback(async () => {
    if (!file || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setStreamingText('');

    try {
      // Try streaming first
      await generateReportStream(
        file,
        // onToken
        (token) => setStreamingText((t) => t + token),
        // onDone
        (final) => {
          const r = {
            findings: final.findings,
            impression: final.impression,
            full_report: `Findings: ${final.findings} Impression: ${final.impression}`,
            findings_tags: final.tags || [],
            latency_ms: 0,
            model_version: 'v1.0-ep11-merged-streaming',
            heatmap: final.heatmap || null,
          };
          setResult(r);
          pushHistory({ result: r });
          setRefreshKey((k) => k + 1);
          addToast('Report generated successfully', 'success');
        },
        // onError -> fallback to non-streaming
        async (err) => {
          console.warn('[stream failed, falling back]', err?.message);
          try {
            const r = await generateReport(file);
            setResult(r);
            pushHistory({ result: r });
            setRefreshKey((k) => k + 1);
            addToast('Report generated (non-streaming)', 'success');
          } catch (e2) {
            setError(e2.message);
            addToast('Generation failed', 'error');
          }
        }
      );
    } catch (e) {
      setError(e.message);
      addToast('Generation failed', 'error');
    } finally {
      setLoading(false);
      setStreamingText('');
    }
  }, [file, loading, addToast]);

  // ---------- Keyboard shortcut ----------
  useEffect(() => {
    const h = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        run();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [run]);

  // ---------- Copy report ----------
  const copyReport = async () => {
    if (!result) return;
    const text = `FINDINGS\n${result.findings}\n\nIMPRESSION\n${result.impression}`;
    await navigator.clipboard.writeText(text);
    addToast('Copied to clipboard', 'success');
  };

  // ---------- Download as PDF ----------
  const downloadReport = () => {
    if (!result) return;
    try {
      // Try to grab the uploaded preview image
      const img = document.querySelector('img[alt="X-ray preview"]');
      const imageDataUrl = img?.src?.startsWith('blob:') || img?.src?.startsWith('data:')
        ? img.src
        : null;

      exportReportPdf(result, imageDataUrl);
      addToast('PDF downloaded', 'success');
    } catch (e) {
      console.error(e);
      addToast('PDF export failed', 'error');
    }
  };

  // ---------- Render ----------
  return (
    <div className="relative min-h-screen flex flex-col">
      <div className="aurora" />

      <TopBar
        theme={theme}
        setTheme={setTheme}
        onMenuClick={() => setSidebarOpen(true)}
      />

      <div className="flex-1 flex relative z-10">
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onSelect={(h) => {
            if (h) setResult(h.result);
            setSidebarOpen(false);
          }}
          refreshKey={refreshKey}
        />

        <main className="flex-1 px-6 py-6 grid gap-6 lg:grid-cols-2 items-start max-w-7xl mx-auto w-full">
          {/* ---------- LEFT: Upload + Generate ---------- */}
          <div className="space-y-4">
            <UploadZone
              onFile={setFile}
              disabled={loading}
              onGenerate={run}
            />

            {error && (
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10
                              text-rose-200 text-sm p-4 animate-fade-up flex gap-2">
                <span>⚠️</span>
                <span className="break-all">{error}</span>
              </div>
            )}

            <p className="text-[10px] text-slate-500 text-center font-mono">
              Press{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">Ctrl</kbd>{' '}
              +{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">Enter</kbd>{' '}
              to generate
            </p>
          </div>

          {/* ---------- RIGHT: Report / Loader / Empty ---------- */}
          <div>
            {/* Streaming: show live typing while tokens arrive */}
            {loading && streamingText && (
              <div className="glass-strong rounded-3xl p-6 animate-fade-up">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
                  <span className="text-xs text-slate-400 font-mono">
                    Streaming tokens…
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-slate-200 font-mono whitespace-pre-wrap">
                  {streamingText}
                  <span className="inline-block w-2 h-4 bg-brand-400 animate-pulse ml-1 align-middle" />
                </p>
              </div>
            )}

            {/* Loader: shown only while waiting, before tokens arrive */}
            {loading && !streamingText && <Loader />}

            {/* Final report */}
            {!loading && result && (
              <ReportView
                result={result}
                onCopy={copyReport}
                onDownload={downloadReport}
              />
            )}

            {/* Empty state */}
            {!loading && !result && (
              <div className="glass-strong rounded-3xl p-12 text-center animate-fade-up">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl
                                bg-gradient-to-br from-brand-500/20 to-aurora-indigo/10
                                border border-brand-500/20 grid place-items-center">
                  <svg
                    className="w-8 h-8 text-brand-300"
                    fill="none" stroke="currentColor" strokeWidth="1.5"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round" strokeLinejoin="round"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
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