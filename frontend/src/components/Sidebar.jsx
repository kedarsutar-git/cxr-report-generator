import { getHistory, clearHistory } from '../api';

export default function Sidebar({ open, onClose, onSelect, refreshKey }) {
  const history = getHistory();

  return (
    <>
      <div onClick={onClose}
           className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity lg:hidden
             ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} />

      <aside className={`fixed lg:static top-0 left-0 h-full w-72 z-40 p-4 transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="glass-strong rounded-3xl h-full p-5 flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold tracking-wide text-slate-300 uppercase">
              History
            </h3>
            <button onClick={() => { clearHistory(); onSelect(null); }}
              className="text-[10px] text-slate-500 hover:text-rose-300 transition">
              Clear
            </button>
          </div>

          {history.length === 0 && (
            <div className="text-xs text-slate-500 text-center py-10">
              No reports yet.<br />Your analyses will appear here.
            </div>
          )}

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {history.map((h) => (
              <button key={h.ts} onClick={() => onSelect(h)}
                className="w-full text-left p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05]
                           border border-white/5 hover:border-brand-500/30 transition group">
                <div className="text-[10px] text-slate-500 font-mono mb-1">
                  {new Date(h.ts).toLocaleTimeString()}
                </div>
                <div className="text-xs text-slate-300 line-clamp-2 group-hover:text-white transition">
                  {h.result?.findings?.slice(0, 90) || 'Report'}…
                </div>
              </button>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}