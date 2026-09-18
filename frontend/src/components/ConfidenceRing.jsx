export default function ConfidenceRing({ value, label, size = 92 }) {
  const pct = Math.round(value * 100);
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - value);

  const color =
    value > 0.65 ? '#f43f5e' :
    value > 0.35 ? '#f59e0b' :
    '#06b6d4';

  return (
    <div className="flex flex-col items-center gap-2 group">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle className="ring-track" cx={size/2} cy={size/2} r={r} fill="none" strokeWidth={stroke} />
          <circle
            className="ring-fill"
            cx={size/2} cy={size/2} r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            style={{ filter: `drop-shadow(0 0 8px ${color}80)` }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center">
            <div className="text-lg font-bold tabular-nums" style={{ color }}>{pct}<span className="text-xs">%</span></div>
          </div>
        </div>
      </div>
      <div className="text-[11px] text-center text-slate-400 group-hover:text-slate-200 transition-colors max-w-[90px] leading-tight">
        {label.replace(/_/g, ' ')}
      </div>
    </div>
  );
}