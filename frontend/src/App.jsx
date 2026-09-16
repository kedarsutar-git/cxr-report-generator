import { useState } from 'react';
import UploadCard from './components/UploadCard';
import ReportCard from './components/ReportCard';
import Loader from './components/Loader';
import { generateReport } from './api';

export default function App() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = async () => {
    if (!file) return;
    setLoading(true); setError(null); setResult(null);
    try {
      setResult(await generateReport(file));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full">
      <header className="max-w-6xl mx-auto px-6 pt-10 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-700
                          grid place-items-center font-black text-white shadow-lg shadow-brand-500/30">
            Rx
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">CXR Report Generator</h1>
            <p className="text-xs text-slate-400">
              Vision encoder + pretrained transformer · automated radiology drafting
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pb-20 grid gap-6 lg:grid-cols-2 items-start">
        <div className="space-y-4">
          <UploadCard onFile={setFile} disabled={loading} />

          <button
            onClick={run}
            disabled={!file || loading}
            className="w-full py-3.5 rounded-2xl font-semibold transition-all duration-300
                       bg-gradient-to-r from-brand-500 to-brand-700 text-white
                       hover:brightness-110 hover:shadow-lg hover:shadow-brand-500/30
                       disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"
          >
            {loading ? 'Generating…' : 'Generate Report'}
          </button>

          {error && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10
                            text-rose-200 text-sm p-4">
              {error}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {loading && <Loader />}
          {!loading && result && <ReportCard result={result} />}
          {!loading && !result && (
            <div className="glass rounded-3xl p-10 text-center text-slate-500 text-sm">
              Upload a chest X-ray and hit <span className="text-slate-300">Generate Report</span>.
              <br />Findings, impression, and pathology scores will appear here.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}