const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

function apiUrl(path) {
  return `${API_BASE_URL}${path}`;
}

function formatTime(seconds) {
  const value = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(value / 60);
  return `${String(minutes).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}

function normalizeResult(result) {
  return {
    score: result.percent,
    time: `${formatTime(result.start)}–${formatTime(result.end)}`,
    file: result.clip_id,
    caption: result.caption || 'Semantic match found in your footage.',
    image: result.thumbnail_url ? apiUrl(result.thumbnail_url) : '',
    videoUrl: result.video_url ? apiUrl(result.video_url) : '',
    qualityFlag: result.quality_flag,
  };
}

async function request(path, options) {
  const response = await fetch(apiUrl(path), options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.detail || payload.message || 'The backend request failed.');
  return payload;
}

export async function searchClips(query) {
  const payload = await request('/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  return { query: payload.query, message: payload.message, results: payload.results.map(normalizeResult) };
}

export async function searchScript(text) {
  const payload = await request('/script', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  return payload.scenes.map((scene) => ({ ...scene, results: scene.results.map(normalizeResult) }));
}

export async function uploadLibrary(file, onProgress) {
  const formData = new FormData();
  formData.append('file', file);
  onProgress(5);
  const payload = await request('/upload', { method: 'POST', body: formData });
  onProgress(100);
  return {
    status: 'ready',
    clips: payload.clips_indexed,
    segments: payload.segments_indexed,
    fileName: file.name,
    skipped: payload.skipped,
  };
}
