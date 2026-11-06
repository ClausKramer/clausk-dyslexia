// Lagring i localStorage. Profiler ligger under én nøgle, så de kan eksporteres/importeres samlet.
const KEY = 'lydoen.v1';

export function loadAll() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { profiles: [], activeId: null };
    const data = JSON.parse(raw);
    return { profiles: data.profiles || [], activeId: data.activeId || null };
  } catch {
    return { profiles: [], activeId: null };
  }
}

export function saveAll(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { console.warn('Kunne ikke gemme', e); }
}

export function exportJson(data) {
  return JSON.stringify(data, null, 2);
}

export function importJson(text) {
  const data = JSON.parse(text);
  if (!data || !Array.isArray(data.profiles)) throw new Error('Filen ser ikke ud til at være en Lydøen-backup.');
  return data;
}
