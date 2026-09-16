import { useRef, useState, useCallback } from 'react';

export default function UploadCard({ onFile, disabled }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState(null);

  const accept = useCallback((file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    setPreview(URL.createObjectURL(file));
    onFile(file);
  }, [onFile]);

  return (
    <div className="glass rounded-3xl p-6 shadow-2xl shadow-black/40">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold">Chest X-Ray Input</h2>
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
        className={`relative rounded-2xl border-2 border-dashed transition-all duration-300
          ${dragging ? 'border-brand-400 bg-brand-500/10 scale-[1.01]' : 'border-white/15 hover:border-brand-500/60 hover:bg-white/[0.03]'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <input
          ref={inputRef} type="file" accept="image/png,image/jpeg" className="hidden"
          onChange={(e) => accept(e.target.files?.[0])}
        />

        {preview ? (
          <div className="relative overflow-hidden rounded-2xl">
            <img src={preview} alt="X-ray preview" className="w-full h-72 object-contain bg-black/40" />
            <div className="absolute inset-x-0 h-24 bg-gradient-to-b from-brand-500/0 via-brand-400/25 to-brand-500/0
                            animate-scan pointer-events-none" />
            <button
              onClick={(e) => { e.stopPropagation(); setPreview(null); onFile(null); }}
              className="absolute top-3 right-3 text-xs bg-black/70 hover:bg-black/90
                         border border-white/15 rounded-lg px-3 py-1.5 transition"
            >
              Replace
            </button>
          </div>
        ) : (
          <div className="py-16 flex flex-col items-center text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-brand-500/15 border border-brand-500/25
                            grid place-items-center mb-4">
              <svg className="w-7 h-7 text-brand-300" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round"
                      d="M12 16V4m0 0L8 8m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
              </svg>
            </div>
            <p className="font-medium">Drop your X-ray here</p>
            <p className="text-sm text-slate-400 mt-1">or <span className="text-brand-300">browse files</span></p>
          </div>
        )}
      </div>
    </div>
  );
}