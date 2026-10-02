import { useEffect, useRef, useState } from "react";
import {
  getHealth,
  searchClips,
  searchScript,
  uploadLibrary,
  type NormalisedResult,
} from "./api";

// ── Icon ──────────────────────────────────────────────────────────────────

type IconName =
  | "aperture" | "arrow" | "bolt" | "check" | "chevron"
  | "clock" | "folder" | "grid" | "play" | "search"
  | "sparkles" | "upload" | "wave" | "x";

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    aperture: (<><circle cx="12" cy="12" r="9" /><path d="m7.5 4.3 3.1 5.4M16.5 4.3h-6.2M21 12l-3.1-5.4M16.5 19.7l3.1-5.4M7.5 19.7h6.2M3 12l3.1 5.4" /></>),
    arrow:    <path d="M5 12h14m-5-5 5 5-5 5" />,
    bolt:     <path d="m13 2-9 12h7l-1 8 9-12h-7z" />,
    check:    <path d="m5 12 4 4L19 6" />,
    chevron:  <path d="m8 10 4 4 4-4" />,
    clock:    (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
    folder:   <path d="M3 7.5h7l2-2h9v13H3z" />,
    grid:     (<><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></>),
    play:     <path d="m9 7 8 5-8 5z" />,
    search:   (<><circle cx="11" cy="11" r="7" /><path d="m16.5 16.5 4 4" /></>),
    sparkles: (<><path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2z" /><path d="m18.5 14 .7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7zM5 13l.8 2.2L8 16l-2.2.8L5 19l-.8-2.2L2 16l2.2-.8z" /></>),
    upload:   (<><path d="M12 16V4m-4 4 4-4 4 4" /><path d="M5 15v5h14v-5" /></>),
    wave:     <path d="M3 12h2l2-7 3 14 3-11 2 7 2-3h4" />,
    x:        <path d="m6 6 12 12M6 18 18 6" />,
  };
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}

// ── MatchCard ─────────────────────────────────────────────────────────────

function MatchCard({
  match, index, playing, onPlay,
}: {
  match: NormalisedResult;
  index: number;
  playing: number | null;
  onPlay: () => void;
}) {
  const isPlaying = playing === index;
  return (
    <article className={`match-card ${index === 0 ? "featured" : ""}`}>
      <div className="visual">
        {match.image
          ? <img src={match.image} alt={match.caption} />
          : <div style={{ width: "100%", height: "100%", background: "#1a1c18" }} />}
        <div className="visual-shade" />
        <div className="rank">0{index + 1}</div>
        <div className="score-ring" style={{ "--score": `${match.score * 3.6}deg` } as React.CSSProperties}>
          <span>{match.score}%</span>
        </div>
        <button
          className={`play-button ${isPlaying ? "playing" : ""}`}
          onClick={onPlay}
          aria-label={`Play ${match.title}`}
        >
          {isPlaying
            ? <span className="equalizer"><i /><i /><i /></span>
            : <Icon name="play" size={24} />}
        </button>
        <div className="timecode"><Icon name="clock" size={14} />{match.time}</div>
        {match.qualityFlag && (
          <span style={{ position: "absolute", left: 14, top: 14, background: "#e05252", color: "#fff", fontSize: 8, padding: "2px 6px", fontFamily: "DM Mono" }}>
            {match.qualityFlag.toUpperCase()}
          </span>
        )}
      </div>
      <div className="match-copy">
        <div>
          <span className="match-tag"><Icon name="sparkles" size={13} />Semantic match</span>
          <h3>{match.title || match.file}</h3>
          <p>{match.file}</p>
        </div>
        <button className="open-button" onClick={onPlay} aria-label={`Open ${match.title}`}>
          <Icon name="arrow" />
        </button>
      </div>
    </article>
  );
}

// ── VideoModal ────────────────────────────────────────────────────────────

function VideoModal({ clip, onClose }: { clip: NormalisedResult; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    function seekOnLoad() {
      if (!el) return;
      el.currentTime = clip.start;
      el.play().catch(() => {});
    }
    el.addEventListener("loadedmetadata", seekOnLoad);
    return () => el.removeEventListener("loadedmetadata", seekOnLoad);
  }, [clip]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={onClose} role="dialog" aria-modal="true" aria-label="Video preview">
      <div className="library-modal" onMouseDown={(e) => e.stopPropagation()}
        style={{ textAlign: "left", padding: 0, overflow: "hidden", maxWidth: 860, background: "#0a0b0a", border: "1px solid rgba(240,241,234,0.14)" }}>
        <button className="modal-close" onClick={onClose} style={{ color: "#fff", zIndex: 2 }}><Icon name="x" size={16} /></button>
        <video ref={videoRef} src={clip.videoUrl} controls autoPlay
          style={{ display: "block", width: "100%", maxHeight: "72vh", background: "#000" }} />
        <div style={{ padding: "16px 20px" }}>
          <div style={{ color: "var(--acid)", fontFamily: "DM Mono", fontSize: 9, letterSpacing: ".15em", marginBottom: 6 }}>{clip.time}</div>
          <strong style={{ fontSize: 14, fontFamily: "Syne" }}>{clip.title || clip.file}</strong>
          {clip.caption && <p style={{ color: "var(--muted)", fontSize: 12, margin: "6px 0 0" }}>{clip.caption}</p>}
        </div>
      </div>
    </div>
  );
}

// ── UploadModal ───────────────────────────────────────────────────────────

function UploadModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: (clips: number, segments: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [skipped, setSkipped] = useState<string[]>([]);
  const busy = progress > 0 && progress < 100;
  const done = progress === 100;

  function stageLabel(pct: number) {
    if (pct <= 0)  return "";
    if (pct < 10)  return "Uploading…";
    if (pct < 45)  return "Extracting frames…";
    if (pct < 80)  return "Generating embeddings…";
    if (pct < 100) return "Building searchable index…";
    return "Library indexed — ready to search.";
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.name.endsWith(".zip")) {
      setError("Please upload a .zip file containing MP4 or MOV video clips.");
      return;
    }
    setError("");
    setProgress(5);
    setStatus("Uploading…");
    try {
      const result = await uploadLibrary(file, (pct) => {
        setProgress(pct);
        setStatus(stageLabel(pct));
      });
      setProgress(100);
      setStatus("Library indexed — ready to search.");
      setSkipped(result.skipped);
      onDone(result.clips_indexed, result.segments_indexed);
    } catch (err) {
      setError((err as Error).message);
      setProgress(0);
      setStatus("");
    }
  }

  const stages = ["Uploading", "Extracting frames", "Generating embeddings", "Building index"];
  const activeStage = progress >= 100 ? 4 : progress >= 80 ? 4 : progress >= 45 ? 3 : progress > 0 ? 2 : 1;

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="library-modal" onMouseDown={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>Close</button>

        {!busy && !done && (
          <>
            <div className="drop-icon"><Icon name="upload" size={30} /></div>
            <span className="modal-kicker">Build your visual memory</span>
            <h2>Drop your B-roll library.</h2>
            <p>Upload one ZIP containing MP4 or MOV clips (up to 50 files, 500 MB max). We'll decode every scene, action, and visual detail.</p>
            <button className="choose-button" onClick={() => inputRef.current?.click()}>
              Choose ZIP file <Icon name="arrow" />
            </button>
            <small>ZIP only · MP4 / MOV inside · 500 MB max · no account needed</small>
            {error && <p style={{ color: "#e05252", fontSize: 12, marginTop: 14 }}>{error}</p>}
          </>
        )}

        {(busy || done) && (
          <div style={{ textAlign: "left", padding: "8px 0" }}>
            <div style={{ fontFamily: "DM Mono", fontSize: 9, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 18 }}>
              {done ? "✓ Indexed" : "Indexing in progress"}
            </div>

            {/* progress bar */}
            <div style={{ height: 2, background: "#36382f", marginBottom: 20 }}>
              <div style={{ height: "100%", width: `${progress}%`, background: "var(--acid)", transition: "width .3s" }} />
            </div>

            {/* stage grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 20 }}>
              {stages.map((s, i) => (
                <div key={s} style={{ fontSize: 9, fontFamily: "DM Mono", color: i + 1 < activeStage ? "var(--acid)" : i + 1 === activeStage ? "var(--paper)" : "var(--muted)" }}>
                  <div style={{ marginBottom: 4 }}>{i + 1 < activeStage ? "✓" : i + 1}</div>
                  {s}
                </div>
              ))}
            </div>

            <p style={{ fontFamily: "DM Mono", fontSize: 10, color: "var(--muted)", margin: "0 0 4px" }}>{status}</p>

            {done && (
              <>
                <p style={{ color: "var(--acid)", fontFamily: "Syne", fontWeight: 600, fontSize: 15, margin: "16px 0 0" }}>
                  Library ready to search.
                </p>
                {skipped.length > 0 && (
                  <details style={{ marginTop: 10, fontSize: 11, color: "var(--muted)" }}>
                    <summary style={{ cursor: "pointer" }}>{skipped.length} file{skipped.length > 1 ? "s" : ""} skipped (unreadable)</summary>
                    <ul style={{ marginTop: 6, paddingLeft: 18 }}>{skipped.map((f) => <li key={f}>{f}</li>)}</ul>
                  </details>
                )}
                <button className="choose-button" style={{ marginTop: 20 }} onClick={onClose}>
                  Start searching <Icon name="arrow" />
                </button>
              </>
            )}
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept=".zip"
          style={{ display: "none" }}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────

export default function App() {
  const [mode, setMode] = useState<"script" | "search">("script");
  const [query, setQuery] = useState("A person walking alone through the city at night");
  const [script, setScript] = useState(
    "Starting my own business was the biggest risk I ever took. Every morning, I shaped the work with my own two hands. Slowly, the city began to notice what we were building.",
  );

  // results
  const [results, setResults] = useState<NormalisedResult[]>([]);
  const [scriptScenes, setScriptScenes] = useState<
    Array<{ scene_index: number; sentence: string; results: NormalisedResult[] }>
  >([]);
  const [activeScene, setActiveScene] = useState(0);

  // ui state
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const [error, setError] = useState("");
  const [hasResults, setHasResults] = useState(false);

  // playing / modal
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [playClip, setPlayClip] = useState<NormalisedResult | null>(null);

  // library modal
  const [libraryOpen, setLibraryOpen] = useState(false);

  // health / index stats
  const [modelConnected, setModelConnected] = useState<boolean | null>(null);
  const [indexStats, setIndexStats] = useState<{ clips: number; segments: number } | null>(null);

  // Poll /health on mount and every 15 s
  useEffect(() => {
    let mounted = true;
    async function check() {
      try {
        const h = await getHealth();
        if (mounted) setModelConnected(h.model_connected);
      } catch {
        if (mounted) setModelConnected(false);
      }
    }
    check();
    const t = setInterval(check, 15_000);
    return () => { mounted = false; clearInterval(t); };
  }, []);

  // Fake progress animation while analyzing (real work is async)
  useEffect(() => {
    if (!analyzing) return;
    setAnalyzeProgress(8);
    const t = setInterval(() => {
      setAnalyzeProgress((v) => {
        if (v >= 92) { clearInterval(t); return 92; } // hold at 92 until done
        return Math.min(v + Math.floor(Math.random() * 12) + 5, 92);
      });
    }, 220);
    return () => clearInterval(t);
  }, [analyzing]);

  async function runAnalysis() {
    if (analyzing) return;
    if (!modelConnected) {
      setError("Backend ML model is not ready. Make sure the backend is running and try again.");
      return;
    }
    setError("");
    setPlaying(null);
    setAnalyzing(true);
    setHasResults(false);

    try {
      if (mode === "search") {
        const q = query.trim() || "person walking alone at night";
        const data = await searchClips(q);
        setResults(data.results);
        if (data.message && data.results.length === 0) setError(data.message);
      } else {
        const data = await searchScript(script);
        setScriptScenes(data);
        setActiveScene(0);
        if (data.length === 0) setError("No sentences found in your script.");
      }
      setHasResults(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAnalyzeProgress(100);
      setAnalyzing(false);
    }
  }

  function setPlaying(i: number | null) {
    setPlayingIndex(i);
  }

  function handlePlay(match: NormalisedResult, index: number) {
    if (match.videoUrl) {
      setPlayClip(match);
      setPlaying(index);
    } else {
      setPlaying(playingIndex === index ? null : index);
    }
  }

  // current scene's results
  const currentResults = mode === "search"
    ? results
    : (scriptScenes[activeScene]?.results ?? []);

  const sceneList = scriptScenes.length > 0
    ? scriptScenes.map((s, i) => ({
        number: String(i + 1).padStart(2, "0"),
        label: `Scene ${i + 1}`,
        text: s.sentence,
        count: s.results.length,
      }))
    : [
        { number: "01", label: "The leap",  text: "Starting my own business was the biggest risk I ever took.", count: 0 },
        { number: "02", label: "The craft", text: "Every morning, I shaped the work with my own two hands.",   count: 0 },
        { number: "03", label: "The city",  text: "Slowly, the city began to notice what we were building.",   count: 0 },
      ];

  const totalMatches = mode === "search"
    ? results.length
    : scriptScenes.reduce((sum, s) => sum + s.results.length, 0);

  const navClips    = indexStats?.clips    ?? (modelConnected ? "—" : "?");
  const navSegments = indexStats?.segments ?? (modelConnected ? "—" : "?");

  // Engine status dot colour
  const dotStyle: React.CSSProperties = modelConnected === null
    ? { background: "var(--muted)" }
    : modelConnected
      ? { background: "var(--acid)", boxShadow: "0 0 10px var(--acid)", animation: "pulse 2s infinite" }
      : { background: "#e05252" };

  return (
    <main className="app-shell">
      <div className="noise" />

      {/* ── Navbar ── */}
      <nav className="topbar">
        <button className="brand" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <span className="brand-mark"><Icon name="aperture" size={25} /></span>
          <span>FRAME<span className="brand-accent">MIND</span></span>
          <sup>AI</sup>
        </button>
        <div className="nav-center">
          <span className="status-dot" style={dotStyle} title={modelConnected === null ? "Checking…" : modelConnected ? "Engine ready" : "Backend offline"} />
          <span>{navClips} clips</span>
          <i />
          <span>{navSegments} segments indexed</span>
        </div>
        <div className="nav-actions">
          <button className="library-button" onClick={() => setLibraryOpen(true)}>
            <Icon name="folder" size={16} />Library
          </button>
          <button className="upload-button" onClick={() => setLibraryOpen(true)}>
            <Icon name="upload" size={16} />Add footage
          </button>
        </div>
      </nav>

      {/* ── Error banner ── */}
      {error && (
        <div role="alert" style={{ background: "#e0525220", borderBottom: "1px solid #e05252", padding: "10px 4vw", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
          <span>{error}</span>
          <button onClick={() => setError("")} style={{ border: 0, background: "transparent", color: "var(--muted)", cursor: "pointer" }}><Icon name="x" size={16} /></button>
        </div>
      )}

      {/* ── Hero ── */}
      <section className="hero">
        <div className="eyebrow"><span>01</span> Narrative intelligence for editors</div>
        <div className="hero-grid">
          <div>
            <h1>Your story,<span>already in frame.</span></h1>
          </div>
          <div className="hero-aside">
            <Icon name="wave" size={28} />
            <p>Stop searching by filename. Describe the feeling, paste the narrative, find the exact moment.</p>
          </div>
        </div>
        <div className="hero-marquee" aria-hidden="true">
          SEMANTIC SEARCH <i /> SCENE MATCHING <i /> TIMESTAMP PRECISION
        </div>
      </section>

      {/* ── Composer ── */}
      <section className="workspace">
        <div className="composer">
          <div className="mode-switch">
            <button className={mode === "script" ? "active" : ""} onClick={() => setMode("script")}>
              <Icon name="sparkles" size={16} />Script mode<span>USP</span>
            </button>
            <button className={mode === "search" ? "active" : ""} onClick={() => setMode("search")}>
              <Icon name="search" size={16} />Single search
            </button>
          </div>

          <div className="composer-body">
            <div className="composer-label">
              <span>{mode === "script" ? "Paste your narration" : "Describe the shot"}</span>
              <span>{mode === "script" ? `${script.length} / 2,000` : "Natural language"}</span>
            </div>
            {mode === "script" ? (
              <textarea value={script} onChange={(e) => setScript(e.target.value)} aria-label="Narration script" />
            ) : (
              <input value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search query" />
            )}
            <div className="composer-footer">
              <div className="ai-note">
                <Icon name="bolt" size={15} />
                AI splits your narrative into visual beats automatically
              </div>
              <button className="analyze-button" onClick={runAnalysis} disabled={analyzing}>
                {analyzing ? "Reading narrative" : mode === "script" ? "Find my story" : "Search footage"}
                <Icon name={analyzing ? "wave" : "arrow"} />
              </button>
            </div>
          </div>

          {analyzing && (
            <div className="analysis-overlay">
              <div className="scan-line" style={{ left: `${analyzeProgress}%` }} />
              <div>
                <span>CLIP / FAISS</span>
                <strong>Mapping meaning to moments</strong>
              </div>
              <b>{analyzeProgress}%</b>
              <div className="progress-track"><i style={{ width: `${analyzeProgress}%` }} /></div>
            </div>
          )}
        </div>
      </section>

      {/* ── Results ── */}
      <section className={`results ${analyzing ? "results-muted" : ""}`}>
        <aside className="scene-rail">
          <div className="rail-heading">
            <span>Scene map</span>
            <b>{sceneList.length}</b>
          </div>
          <div className="scene-line" />
          {sceneList.map((scene, index) => (
            <button
              key={scene.number}
              className={`scene-item ${activeScene === index ? "active" : ""}`}
              onClick={() => { setActiveScene(index); setPlaying(null); }}
            >
              <span className="scene-number">{scene.number}</span>
              <span className="scene-info">
                <b>{scene.label}</b>
                <small>{scene.count > 0 ? `${scene.count} matches` : "—"}</small>
              </span>
              <Icon name="chevron" size={16} />
            </button>
          ))}
          {hasResults && totalMatches > 0 && (
            <div className="rail-summary">
              <Icon name="check" size={17} />
              <div>
                <b>All scenes covered</b>
                <span>{totalMatches} quality matches</span>
              </div>
            </div>
          )}
        </aside>

        <div className="result-content">
          <header className="result-header">
            <div>
              <div className="result-kicker">
                {mode === "search" ? "Search results" : `Scene ${sceneList[activeScene]?.number ?? "01"} / ${sceneList.length}`}
              </div>
              <h2>"{mode === "search" ? (query || "person walking alone at night") : (sceneList[activeScene]?.text ?? "")}"</h2>
            </div>
            <div className="result-meta">
              <Icon name="sparkles" size={16} />
              {hasResults ? `${currentResults.length} ranked moments` : "Run analysis to see results"}
            </div>
          </header>

          {!hasResults && !analyzing && (
            <div style={{ color: "var(--muted)", fontFamily: "DM Mono", fontSize: 11, padding: "40px 0", textAlign: "center", borderTop: "1px solid var(--line)" }}>
              {modelConnected === false
                ? "⚠ Backend offline — start the server with: python run.py"
                : "Enter a query or paste a script above and click the button to find footage."}
            </div>
          )}

          {currentResults.length > 0 && (
            <div className="card-grid">
              {currentResults.map((match, index) => (
                <MatchCard
                  key={`${match.clipId}-${index}`}
                  match={match}
                  index={index}
                  playing={playingIndex}
                  onPlay={() => handlePlay(match, index)}
                />
              ))}
            </div>
          )}

          {hasResults && currentResults.length === 0 && !analyzing && (
            <div style={{ color: "var(--muted)", fontFamily: "DM Mono", fontSize: 11, padding: "40px 0", textAlign: "center", borderTop: "1px solid var(--line)" }}>
              No strong match found for this scene. Try rephrasing or uploading more footage.
            </div>
          )}
        </div>
      </section>

      <footer>
        <div className="footer-mark"><Icon name="aperture" size={20} /> FRAMEMIND</div>
        <p>Meaning in. Moments out.</p>
        <span>Powered by CLIP · FAISS · curiosity</span>
      </footer>

      {/* ── Upload modal ── */}
      {libraryOpen && (
        <UploadModal
          onClose={() => setLibraryOpen(false)}
          onDone={(clips, segments) => {
            setIndexStats({ clips, segments });
            setLibraryOpen(false);
          }}
        />
      )}

      {/* ── Video playback modal ── */}
      {playClip && (
        <VideoModal
          clip={playClip}
          onClose={() => { setPlayClip(null); setPlaying(null); }}
        />
      )}
    </main>
  );
}
