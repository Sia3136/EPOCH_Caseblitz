/**
 * Backend API client.
 *
 * In dev, Vite proxies every path listed below to http://127.0.0.1:8000.
 * In production, set VITE_API_BASE_URL to your deployed backend origin.
 */

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

function url(path: string): string {
  return `${API_BASE}${path}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url(path), init);
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (payload as { detail?: string; message?: string }).detail ??
        (payload as { message?: string }).message ??
        `Request failed: ${res.status}`,
    );
  }
  return payload as T;
}

// ── Types matching backend/schemas.py ─────────────────────────────────────

export interface SearchResult {
  clip_id: string;
  start: number;
  end: number;
  percent: number;
  caption: string;
  thumbnail_url: string;
  video_url: string;
  quality_flag: string | null;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  message: string | null;
}

export interface SceneResult {
  scene_index: number;
  sentence: string;
  results: SearchResult[];
}

export interface ScriptResponse {
  scenes: SceneResult[];
  truncated: boolean;
}

export interface UploadResponse {
  job_id: string;
  clips_indexed: number;
  segments_indexed: number;
  skipped: string[];
}

export interface StatusResponse {
  job_id: string | null;
  status: string;
  total: number;
  processed: number;
}

export interface HealthResponse {
  ok: boolean;
  model_connected: boolean;
}

// ── Normalised result shape used by the UI ────────────────────────────────

export interface NormalisedResult {
  clipId: string;
  title: string;
  file: string;
  time: string;
  start: number;
  score: number;
  caption: string;
  image: string;
  videoUrl: string;
  qualityFlag: string | null;
}

function formatTime(seconds: number): string {
  const v = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`;
}

export function normalise(r: SearchResult): NormalisedResult {
  return {
    clipId: r.clip_id,
    title: r.caption || r.clip_id,
    file: r.clip_id,
    time: `${formatTime(r.start)} — ${formatTime(r.end)}`,
    start: r.start,
    score: r.percent,
    caption: r.caption || "Semantic match found in your footage.",
    // thumbnail_url / video_url are relative paths — apiUrl() prepends base
    image: r.thumbnail_url ? url(r.thumbnail_url) : "",
    videoUrl: r.video_url ? url(r.video_url) : "",
    qualityFlag: r.quality_flag,
  };
}

// ── API functions ──────────────────────────────────────────────────────────

export async function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/health");
}

export async function getStatus(): Promise<StatusResponse> {
  return request<StatusResponse>("/status");
}

export async function searchClips(query: string): Promise<{
  query: string;
  message: string | null;
  results: NormalisedResult[];
}> {
  const data = await request<SearchResponse>("/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  return {
    query: data.query,
    message: data.message,
    results: data.results.map(normalise),
  };
}

export async function searchScript(text: string): Promise<{
  scenes: Array<{ scene_index: number; sentence: string; results: NormalisedResult[] }>;
  truncated: boolean;
}> {
  const data = await request<ScriptResponse>("/script", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  return {
    truncated: data.truncated,
    scenes: data.scenes.map((s) => ({
      scene_index: s.scene_index,
      sentence: s.sentence,
      results: s.results.map(normalise),
    })),
  };
}

export async function uploadLibrary(
  file: File,
  onProgress: (pct: number, currentClip?: string) => void,
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  let pollHandle: ReturnType<typeof setInterval> | null = null;

  function startPolling() {
    pollHandle = setInterval(async () => {
      try {
        const s = await getStatus();
        if (s.total > 0) {
          const pct = Math.round(10 + (s.processed / s.total) * 80);
          // job_id doubles as the "current clip" identifier from the backend
          onProgress(Math.min(pct, 90), s.job_id ?? undefined);
        }
        if (s.status === "done") stopPolling();
      } catch {
        // ignore transient poll errors
      }
    }, 800);
  }

  function stopPolling() {
    if (pollHandle !== null) { clearInterval(pollHandle); pollHandle = null; }
  }

  onProgress(5);
  startPolling();

  try {
    const data = await request<UploadResponse>("/upload", { method: "POST", body: formData });
    stopPolling();
    onProgress(100);
    return data;
  } catch (err) {
    stopPolling();
    throw err;
  }
}
