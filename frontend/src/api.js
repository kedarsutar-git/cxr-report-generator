const BASE = import.meta.env.VITE_API_URL || '';

// ============================================================
// Standard (non-streaming) report generation
// ============================================================
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

// ============================================================
// Streaming (SSE) report generation
//   onToken(token)     — called for each token as it arrives
//   onDone(finalObj)   — called once at the end with the full result
//   onError(err)       — called on failure (fallback trigger)
// ============================================================
export async function generateReportStream(file, onToken, onDone, onError) {
  const form = new FormData();
  form.append('file', file);

  try {
    const res = await fetch(`${BASE}/api/v1/predict-stream`, {
      method: 'POST',
      body: form,
    });

    if (!res.ok || !res.body) {
      throw new Error(`Stream request failed (${res.status})`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let done = false;

    while (!done) {
      const { done: streamDone, value } = await reader.read();
      if (streamDone) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE messages are separated by double newlines
      const chunks = buffer.split('\n\n');
      buffer = chunks.pop(); // keep the trailing incomplete chunk

      for (const chunk of chunks) {
        // Each chunk may have multiple lines starting with "data: "
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (!payload) continue;

          try {
            const json = JSON.parse(payload);
            if (json.token) onToken(json.token);
            if (json.done) {
              onDone(json);
              done = true;
            }
          } catch (parseErr) {
            // Ignore malformed chunks (e.g. keep-alive comments)
          }
        }
      }
    }
  } catch (e) {
    if (onError) onError(e);
  }
}

// ============================================================
// History helpers (localStorage)
// ============================================================
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