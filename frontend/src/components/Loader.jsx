export default function Loader() {
  const steps = ['Preprocessing image', 'Extracting visual features', 'Decoding radiology report'];
  return (
    <div className="glass rounded-3xl p-6 animate-fade-up">
      <div className="flex items-center gap-3 mb-5">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-500" />
        </span>
        <p className="font-medium">Analyzing…</p>
      </div>
      <div className="space-y-3">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-3" style={{ animationDelay: `${i * 120}ms` }}>
            <div className="h-1.5 flex-1 rounded-full bg-white/10 overflow-hidden relative">
              <div className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-brand-400 to-transparent animate-shimmer" />
            </div>
            <span className="text-xs text-slate-400 w-52">{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}