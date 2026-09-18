export default function Loader() {
  const steps = [
    { label: 'Preprocessing image',        time: 0 },
    { label: 'Extracting visual features', time: 900 },
    { label: 'Decoding radiology report',  time: 2200 },
  ];
  return (
    <div className="glass-strong rounded-3xl p-6 animate-fade-up">
      <div className="flex items-center gap-3 mb-5">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-500" />
        </span>
        <p className="font-medium">Analyzing…</p>
        <span className="text-[10px] text-slate-500 font-mono ml-auto">on-device inference</span>
      </div>

      <div className="space-y-4 mb-6">
        {steps.map((s, i) => (
          <div key={s.label} className="flex items-center gap-3"
               style={{ animation: `fade-up 0.4s ${i * 0.12}s both` }}>
            <span className="w-4 h-4 rounded-full border border-brand-400/40 bg-brand-500/10
                             grid place-items-center text-[8px] text-brand-300 font-mono">
              {i + 1}
            </span>
            <div className="h-1.5 flex-1 rounded-full bg-white/10 overflow-hidden relative">
              <div className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-brand-400 to-transparent animate-shimmer" />
            </div>
            <span className="text-xs text-slate-400 w-52">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <div className="h-3 skel w-3/4" />
        <div className="h-3 skel w-full" />
        <div className="h-3 skel w-5/6" />
      </div>
    </div>
  );
}