export default function TopBar({ theme, setTheme, onMenuClick }) {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 relative z-10">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick}
          className="lg:hidden w-9 h-9 rounded-xl bg-white/5 border border-white/10 grid place-items-center hover:bg-white/10 transition">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-aurora-indigo
                        grid place-items-center font-black text-white shadow-glow-cyan">
          Rx
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight flex items-center gap-2">
            CXR Report Generator
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-brand-500/15
                             text-brand-300 border border-brand-500/25 uppercase tracking-wider">
              AI
            </span>
          </h1>
          <p className="text-[11px] text-slate-400">
            Vision encoder + transformer · automated radiology drafting
          </p>
        </div>
      </div>

      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 grid place-items-center
                   hover:bg-white/10 transition text-slate-300"
        title="Toggle theme"
      >
        {theme === 'dark' ? (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="4" />
            <path strokeLinecap="round" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
        ) : (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
          </svg>
        )}
      </button>
    </header>
  );
}