import { useRef, useState, useCallback } from 'react';

export default function UploadZone({ onFile, disabled, onGenerate }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState(null);

  const accept = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setPreview(URL.createObjectURL(file));
    onFile(file);
  }, [onFile]);

  return (
    <div className="glass-strong rounded-3xl p-6 shadow-2xl shadow-black/40 animate-fade-up">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse-glow" />
            Chest X-Ray Input
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">PA / AP view · PNG or JPEG · ≤ 10 MB</p>
        </div>
        <span className="text-[10px] font-semibold tracking-wider uppercase text-brand-300
                         bg-brand-500/10 border border-brand-500/20 px-2.5 py-1 rounded-full">
          DICOM-free
        </span>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); accept(e.dataTransfer.files?.[0]); }}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`relative rounded-2xl border-2 border-dashed transition-all duration-300 overflow-hidden
          ${dragging ? 'border-brand-400 bg-brand-500/10 scale-[1.01]' : 'border-white/15 hover:border-brand-500/60 hover:bg-white/[0.03]'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <input
          ref={inputRef} type="file" accept="image/png,image/jpeg"
          className="hidden" onChange={(e) => accept(e.target.files?.[0])}
        />

        {preview ? (
          <div className="relative">
            <img src={preview} alt="X-ray preview" className="w-full h-72 object-contain bg-black/60" />
            <div className="absolute inset-x-0 h-24 bg-gradient-to-b from-brand-500/0 via-brand-400/30 to-brand-500/0 animate-scan pointer-events-none" />
            <div className="absolute top-3 right-3 flex gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); setPreview(null); onFile(null); }}
                className="text-xs bg-black/70 hover:bg-black/90 border border-white/15 rounded-lg px-3 py-1.5 transition"
              >
                Replace
              </button>
            </div>
          </div>
        ) : (
          <div className="py-16 flex flex-col items-center text-center px-6">
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500/20 to-aurora-indigo/10
                            border border-brand-500/25 grid place-items-center mb-4">
              <svg className="w-8 h-8 text-brand-300" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round"
                      d="M12 16V4m0 0L8 8m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
              </svg>
              <span className="absolute -inset-1 rounded-2xl border border-brand-400/30 animate-spin-slow" />
            </div>
            <p className="font-medium">Drop your X-ray here</p>
            <p className="text-sm text-slate-400 mt-1">
              or <span className="text-brand-300 underline decoration-dotted">browse files</span>
            </p>
            <p className="text-[10px] text-slate-500 mt-3">Supports PA / AP chest radiographs</p>
          </div>
        )}
      </div>

      <button
        onClick={onGenerate}
        disabled={disabled || !preview}
        className="mt-5 w-full py-3.5 rounded-2xl font-semibold transition-all duration-300
                   bg-gradient-to-r from-brand-500 via-brand-600 to-aurora-indigo
                   text-white relative overflow-hidden group
                   hover:brightness-110 hover:shadow-lg hover:shadow-brand-500/40
                   disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          {disabled ? (
            <>
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Generate Report
            </>
          )}
        </span>
        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent
                         translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
      </button>
    </div>
  );
}