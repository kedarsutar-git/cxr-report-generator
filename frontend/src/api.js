const BASE = import.meta.env.VITE_API_URL || '';

export async function generateReport(file) {
  const form = new FormData();
  form.append('file', file);

  const res = await fetch(`${BASE}/api/v1/predict`, { method: 'POST', body: form });
  const raw = await res.text();

  if (!res.ok) {
    let detail = raw;
    try { detail = JSON.parse(raw).detail || raw; } catch {}
    throw new Error(detail);
  }
  try { return JSON.parse(raw); }
  catch { throw new Error(`Invalid JSON: ${raw.slice(0,200)}`); }
}

export function getHistory() {
  try { return JSON.parse(localStorage.getItem('cxr_history') || '[]'); }
  catch { return []; }
}

export function pushHistory(entry) {
  const list = getHistory();
  list.unshift({ ...entry, ts: Date.now() });
  localStorage.setItem('cxr_history', JSON.stringify(list.slice(0, 20)));
}

export function clearHistory() {
  localStorage.removeItem('cxr_history');
}