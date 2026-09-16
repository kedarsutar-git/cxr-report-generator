const BASE = import.meta.env.VITE_API_URL || '';

export async function generateReport(file) {
  const form = new FormData();
  form.append('file', file);

  const res = await fetch(`${BASE}/api/v1/predict`, { method: 'POST', body: form });

  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try { msg = (await res.json()).detail || msg; } catch {}
    throw new Error(msg);
  }
  return res.json();
}