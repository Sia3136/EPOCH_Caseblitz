import React, { useEffect, useState } from "react";
import {
  getHealth,
  searchClips,
  searchScript,
  uploadLibrary,
  type NormalisedResult,
} from "./api";
import LandingPage from "./components/LandingPage";
import WorkspaceShell from "./components/WorkspaceShell";
import UploadPanel from "./components/UploadPanel";
import VideoModal from "./components/VideoModal";

export default function App() {
  const [view, setView] = useState<"home" | "results" | "script" | "upload">("home");
  
  // Search & Script State
  const [mode, setMode] = useState<"script" | "search">("search");
  const [query, setQuery] = useState("A person walking alone through the city at night");
  const [script, setScript] = useState(
    "Starting my own business was the biggest risk I ever took. Every morning, I shaped the work with my own two hands. Slowly, the city began to notice what we were building.",
  );

  const [results, setResults] = useState<NormalisedResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<NormalisedResult | null>(null);
  const [scriptScenes, setScriptScenes] = useState<Array<{ scene_index: number; sentence: string; results: NormalisedResult[] }>>([]);
  const [, setActiveScene] = useState(0);

  const [busy, setBusy] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const [error, setError] = useState("");
  
  const [hideBlurry, setHideBlurry] = useState(false);
  const [hideDark, setHideDark] = useState(false);

  // Playback
  const [playClip, setPlayClip] = useState<NormalisedResult | null>(null);

  // Ingest & Stats State
  const [modelConnected, setModelConnected] = useState<boolean | null>(null);
  const [indexStats, setIndexStats] = useState<{ clips: number; segments: number } | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("Waiting for a library");
  const [uploadFile, setUploadFile] = useState<string>("");
  const [uploadReady, setUploadReady] = useState(false);

  // Health poll
  useEffect(() => {
    let mounted = true;
    async function check() {
      try { const h = await getHealth(); if (mounted) setModelConnected(h.model_connected); }
      catch { if (mounted) setModelConnected(false); }
    }
    check(); const t = setInterval(check, 15_000);
    return () => { mounted = false; clearInterval(t); };
  }, []);

  function navigate(next: "home" | "results" | "script" | "upload") {
    setView(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Search Action
  async function runSearch(q?: string) {
    const term = (q || query).trim() || "person walking alone at night";
    setBusy(true);
    setError("");
    setAnalyzeProgress(12);
    const progressTimer = setInterval(() => {
      setAnalyzeProgress(v => (v >= 90 ? 90 : v + 15));
    }, 180);

    try {
      const data = await searchClips(term);
      setResults(data.results);
      setSelectedResult(data.results[0] || null);
      if (data.message && data.results.length === 0) setError(data.message);
      navigate("results");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      clearInterval(progressTimer);
      setAnalyzeProgress(100);
      setBusy(false);
    }
  }

  // Script Action
  async function runScript() {
    setBusy(true);
    setError("");
    setAnalyzeProgress(15);
    const progressTimer = setInterval(() => {
      setAnalyzeProgress(v => (v >= 90 ? 90 : v + 12));
    }, 200);

    try {
      const data = await searchScript(script);
      setScriptScenes(data.scenes);
      setActiveScene(0);
      navigate("script");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      clearInterval(progressTimer);
      setAnalyzeProgress(100);
      setBusy(false);
    }
  }

  // Upload handler
  async function handleUploadFile(file: File | undefined) {
    if (!file) return;
    if (!file.name.endsWith(".zip")) {
      setError("Please upload a .zip file containing MP4 or MOV video clips.");
      return;
    }
    setError("");
    setUploadFile(file.name);
    setUploadProgress(5);
    setUploadStatus("Uploading to server…");
    setUploadReady(false);

    try {
      const result = await uploadLibrary(file, (pct) => {
        setUploadProgress(pct);
        if (pct < 15) setUploadStatus("Uploading archive…");
        else if (pct < 45) setUploadStatus("Extracting video keyframes…");
        else if (pct < 80) setUploadStatus("Generating visual embeddings (CLIP)…");
        else setUploadStatus("Indexing vectors (FAISS)…");
      });
      setUploadProgress(100);
      setUploadReady(true);
      setUploadStatus("Library indexed — ready to search.");
      setIndexStats({ clips: result.clips_indexed, segments: result.segments_indexed });
    } catch (err) {
      setError((err as Error).message);
      setUploadStatus("Upload failed.");
    }
  }

  // Filtered results
  const filteredResults = results.filter(r => {
    if (hideBlurry && r.qualityFlag === "blurry") return false;
    if (hideDark && r.qualityFlag === "dark") return false;
    return true;
  });

  const wordCount = script.trim().split(/\s+/).filter(Boolean).length;
  const sentenceCount = script.trim().split(/(?<=[.!?])\s+|\n+/).filter(s => s.trim().length > 0).length;
  const navClips = indexStats?.clips ?? (modelConnected ? "47" : "—");
  const navSegments = indexStats?.segments ?? (modelConnected ? "214" : "—");

  return (
    <div className="shell">
      {/* Global Error Banner */}
      {error && (
        <div role="alert" className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError("")} aria-label="Dismiss">✕</button>
        </div>
      )}

      {/* VIEW 1: Long Editorial Landing Page */}
      {view === "home" && (
        <LandingPage
          modelConnected={modelConnected}
          navClips={navClips}
          navSegments={navSegments}
          mode={mode}
          setMode={setMode}
          query={query}
          setQuery={setQuery}
          script={script}
          setScript={setScript}
          busy={busy}
          analyzeProgress={analyzeProgress}
          wordCount={wordCount}
          sentenceCount={sentenceCount}
          onRunSearch={runSearch}
          onRunScript={runScript}
          onNavigate={navigate}
        />
      )}

      {/* VIEW 2 & 3: Workspace Console (Search & Script Mode) */}
      {(view === "results" || view === "script") && (
        <WorkspaceShell
          view={view}
          onNavigate={navigate}
          modelConnected={modelConnected}
          navClips={navClips}
          indexStats={indexStats}
          query={query}
          setQuery={setQuery}
          onRunSearch={runSearch}
          busy={busy}
          filteredResults={filteredResults}
          selectedResult={selectedResult}
          setSelectedResult={setSelectedResult}
          onPlayClip={setPlayClip}
          hideBlurry={hideBlurry}
          setHideBlurry={setHideBlurry}
          hideDark={hideDark}
          setHideDark={setHideDark}
          script={script}
          setScript={setScript}
          onRunScript={runScript}
          wordCount={wordCount}
          sentenceCount={sentenceCount}
          scriptScenes={scriptScenes}
        />
      )}

      {/* VIEW 4: Upload Panel */}
      {view === "upload" && (
        <main className="console-shell">
          <header className="console-topbar">
            <button className="console-brand" onClick={() => navigate("home")}>
              FrameMind<span className="dot" />
            </button>
            <div className="console-top-actions">
              <button className="console-nav-home" onClick={() => navigate("home")}>
                ← Back to Landing Page
              </button>
            </div>
          </header>

          <UploadPanel
            uploadFile={uploadFile}
            uploadProgress={uploadProgress}
            uploadStatus={uploadStatus}
            uploadReady={uploadReady}
            onFileSelect={handleUploadFile}
            onNavigateSearch={() => navigate("results")}
            onNavigateHome={() => navigate("home")}
          />
        </main>
      )}

      {/* Global Video Modal */}
      {playClip && (
        <VideoModal clip={playClip} onClose={() => setPlayClip(null)} />
      )}
    </div>
  );
}
