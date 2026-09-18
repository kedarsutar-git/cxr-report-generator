import { useEffect } from 'react';

export default function Toasts({ items, onDismiss }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 w-80">
      {items.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}

function Toast({ toast, onDismiss }) {
  useEffect(() => {
    const id = setTimeout(onDismiss, 4500);
    return () => clearTimeout(id);
  }, [onDismiss]);

  const styles = {
    success: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
    error:   'border-rose-400/30 bg-rose-500/10 text-rose-200',
    info:    'border-brand-400/30 bg-brand-500/10 text-brand-100',
  }[toast.type || 'info'];

  return (
    <div className={`glass-strong rounded-xl border px-4 py-3 text-sm animate-bounce-in flex items-start gap-3 ${styles}`}>
      <span className="text-lg leading-none mt-0.5">
        {toast.type === 'success' ? '✓' : toast.type === 'error' ? '⚠' : 'ℹ'}
      </span>
      <div className="flex-1">{toast.message}</div>
      <button onClick={onDismiss} className="opacity-60 hover:opacity-100 text-xs">✕</button>
    </div>
  );
}