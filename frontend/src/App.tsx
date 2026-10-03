import { useEffect, useRef, useState } from "react";
import {
  getHealth,
  searchClips,
  searchScript,
  uploadLibrary,
  type NormalisedResult,
} from "./api";

// ─────────────────────────────────────────────────────────────────────────────
// Icon
// ─────────────────────────────────────────────────────────────────────────────

type IconName =
  | "aperture" | "arrow" | "bolt" | "check" | "chevron"
  | "clock" | "filter" | "folder" | "grid" | "play" | "refresh"
  | "search" | "sparkles" | "upload" | "wave" | "x";

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    aperture: (<><circle cx="12" cy="12" r="9" /><path d="m7.5 4.3 3.1 5.4M16.5 4.3h-6.2M21 12l-3.1-5.4M16.5 19.7l3.1-5.4M7.5 19.7h6.2M3 12l3.1 5.4" /></>),
    arrow:    <path d="M5 12h14m-5-5 5 5-5 5" />,
    bolt:     <path d="m13 2-9 12h7l-1 8 9-12h-7z" />,
    check:    <path d="m5 12 4 4L19 6" />,
    chevron:  <path d="m8 10 4 4 4-4" />,
    clock:    (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
    filter:   <path d="M4 6h16M7 12h10M10 18h4" />,
    folder:   <path d="M3 7.5h7l2-2h9v13H3z" />,
    grid:     (<><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></>),
    play:     <path d="m9 7 8 5-8 5z" />,
    refresh:  <path d="M4 12a8 8 0 0 1 14.93-3M20 12a8 8 0 0 1-14.93 3M4 12V8m0 4H8M20 12v4m0-4h-4" />,
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

// ─────────────────────────────────────────────────────────────────────────────
// TrustBar
// ─────────────────────────────────────────────────────────────────────────────

function TrustBar() {
  const items = ["No sign-up", "No tags required", "500 MB max", "MP4 · MOV · MKV", "Runs locally"];
  return (
    <div className="trust-bar" aria-label="Key facts">
      {items.map((item, i) => (
        <span key={item} className="trust-item">
          {i > 0 && <span className="trust-sep" aria-hidden="true">·</span>}
          {item}
        </span>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BeforeAfter — full-width, white-panel style
// ─────────────────────────────────────────────────────────────────────────────

function BeforeAfter({ onUpload }: { onUpload: () => void }) {
  return (
    <section className="ba-section" aria-labelledby="ba-heading">
      <div className="ba-header">
        <div className="eyebrow"><span>02</span> The difference</div>
        <h2 id="ba-heading" className="ba-title">
          Before FrameFind.<span> After FrameFind.</span>
        </h2>
      </div>

      {/* Full-width white composer-style panel */}
      <div className="ba-panel">
        <div className="ba-panel-inner">

          {/* BEFORE column */}
          <div className="ba-col ba-col--before">
            <div className="ba-col-label">
              <span className="ba-pill ba-pill--before">Before FrameFind</span>
            </div>

            <div className="ba-block">
              <span className="ba-block-label">You need</span>
              <p className="ba-query-text">"busy street market, golden hour"</p>
            </div>

            <div className="ba-block">
              <span className="ba-block-label">Your files</span>
              <div className="ba-file-list">
                {["clip_0047.mp4", "shoot_day3.mp4", "untitled_export.mp4"].map(f => (
                  <div key={f} className="ba-file-row">
                    <span className="ba-file-icon">▣</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="ba-result ba-result--bad">
              <Icon name="x" size={14} />
              <span>No useful match</span>
            </div>
          </div>

          {/* Divider */}
          <div className="ba-divider" aria-hidden="true">
            <div className="ba-divider-line" />
            <span className="ba-divider-label">VS</span>
            <div className="ba-divider-line" />
          </div>

          {/* AFTER column */}
          <div className="ba-col ba-col--after">
            <div className="ba-col-label">
              <span className="ba-pill ba-pill--after">
                <span className="ba-dot" />After FrameFind
              </span>
            </div>

            <div className="ba-block">
              <span className="ba-block-label">Query</span>
              <p className="ba-query-text">"busy street market, golden hour"</p>
            </div>

            <div className="ba-match-card">
              <div className="ba-match-top">
                <span className="ba-match-file">market_footage_02.mp4</span>
                <span className="ba-match-score">84%</span>
              </div>
              <div className="ba-match-ts">
                <Icon name="clock" size={12} />
                Timestamp: 00:14 → 00:22
              </div>
              <p className="ba-match-caption">"A crowded outdoor bazaar at dusk, warm light"</p>
            </div>

            <div className="ba-result ba-result--good">
              <Icon name="check" size={14} />
              <span>Exact match found</span>
            </div>
          </div>
        </div>

        {/* Panel footer CTA */}
        <div className="ba-panel-footer">
          <span className="ba-footer-note">
            <Icon name="bolt" size={13} />
            CLIP embeddings match meaning, not filenames
          </span>
          <button className="ba-footer-cta" onClick={onUpload}>
            Index your footage <Icon name="arrow" size={14} />
          </button>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HowItWorks
// ─────────────────────────────────────────────────────────────────────────────

const HOW_STEPS = [
  { num: "01", icon: "upload" as IconName, title: "Upload your library",       body: "Drop a .zip of your footage. We extract frames and build a searchable index automatically." },
  { num: "02", icon: "sparkles" as IconName, title: "Search by meaning",        body: "Describe what you need in plain language or paste an entire narration script." },
  { num: "03", icon: "clock" as IconName,   title: "Get timestamps, not clips", body: "Every result shows where the match occurs, with confidence and a one-line explanation." },
];

function HowItWorks({ onUpload }: { onUpload: () => void }) {
  return (
    <section className="how-section" aria-labelledby="how-heading">
      <div className="how-header">
        <div className="eyebrow"><span>03</span> How it works</div>
        <h2 id="how-heading" className="how-title">Three steps.<span> Zero scrubbing.</span></h2>
      </div>
      <div className="how-grid">
        {HOW_STEPS.map((step, i) => (
          <div key={step.num} className={`how-step ${i === 0 ? "how-step--accent" : ""}`}>
            <div className="how-step-top">
              <span className="how-num">{step.num}</span>
              <span className="how-sparkle">✦</span>
            </div>
            <div className="how-icon-wrap"><Icon name={step.icon} size={22} /></div>
            <h3 className="how-step-title">{step.title}</h3>
            <p className="how-step-body">{step.body}</p>
            <div className="how-status">
              <span className="how-status-dot" />
              Ready for your footage
            </div>
            {i === 0 && (
              <button className="how-cta" onClick={onUpload}>Upload footage <Icon name="arrow" size={14} /></button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MatchCard
// ─────────────────────────────────────────────────────────────────────────────

function MatchCard({ match, index, playing, onPlay }: {
  match: NormalisedResult; index: number; playing: number | null; onPlay: () => void;
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
        <button className={`play-button ${isPlaying ? "playing" : ""}`} onClick={onPlay} aria-label={`Play ${match.title}`}>
          {isPlaying ? <span className="equalizer"><i /><i /><i /></span> : <Icon name="play" size={24} />}
        </button>
        <div className="timecode"><Icon name="clock" size={14} />{match.time}</div>
        {match.qualityFlag && <span className="quality-badge">{match.qualityFlag.toUpperCase()}</span>}
      </div>
      <div className="match-copy">
        <div>
          <span className="match-tag"><Icon name="sparkles" size={13} />Semantic match</span>
          <h3>{match.title || match.file}</h3>
          <p>{match.file}</p>
        </div>
        <button className="open-button" onClick={onPlay} aria-label={`Open ${match.title}`}><Icon name="arrow" /></button>
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VideoModal
// ─────────────────────────────────────────────────────────────────────────────

function VideoModal({ clip, onClose }: { clip: NormalisedResult; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = videoRef.current; if (!el) return;
    function seek() { if (!el) return; el.currentTime = clip.start; el.play().catch(() => {}); }
    el.addEventListener("loadedmetadata", seek);
    return () => el.removeEventListener("loadedmetadata", seek);
  }, [clip]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={onClose} role="dialog" aria-modal="true">
      <div className="video-modal" onMouseDown={e => e.stopPropagation()}>
        <button className="video-modal-close" onClick={onClose} aria-label="Close"><Icon name="x" size={16} /></button>
        <video ref={videoRef} src={clip.videoUrl} controls autoPlay className="video-modal-player" />
        <div className="video-modal-meta">
          <span className="result-kicker">{clip.time}</span>
          <strong className="video-modal-title">{clip.title || clip.file}</strong>
          {clip.caption && <p className="video-modal-caption">{clip.caption}</p>}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UploadModal — after done, scrolls to composer
// ─────────────────────────────────────────────────────────────────────────────

function UploadModal({
  onClose, onDone, onGoToSearch,
}: {
  onClose: () => void;
  onDone: (clips: number, segments: number) => void;
  onGoToSearch: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus]     = useState("");
  const [currentClip, setCurrentClip] = useState("");
  const [error, setError]       = useState("");
  const [skipped, setSkipped]   = useState<string[]>([]);
  const busy = progress > 0 && progress < 100;
  const done = progress === 100;

  const STAGES = ["Uploading", "Extracting frames", "Generating embeddings", "Building index"];
  const activeStage = progress >= 100 ? 4 : progress >= 80 ? 4 : progress >= 45 ? 3 : progress > 0 ? 2 : 1;

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
      setError("Please upload a .zip file containing MP4 or MOV video clips."); return;
    }
    setError(""); setProgress(5); setStatus("Uploading…"); setCurrentClip("");
    try {
      const result = await uploadLibrary(file, (pct, clip) => {
        setProgress(pct); setStatus(stageLabel(pct));
        if (clip) setCurrentClip(clip);
      });
      setProgress(100);
      setStatus("Library indexed — ready to search.");
      setSkipped(result.skipped);
      onDone(result.clips_indexed, result.segments_indexed);
    } catch (err) {
      setError((err as Error).message); setProgress(0); setStatus("");
    }
  }

  function handleStartSearching() {
    onGoToSearch();
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="library-modal" onMouseDown={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>Close</button>

        {!busy && !done && (
          <>
            <div className="drop-icon"><Icon name="upload" size={30} /></div>
            <span className="modal-kicker">Build your visual memory</span>
            <h2>Upload your folder.</h2>
            <p>Upload one ZIP containing MP4 or MOV clips (max size of folder is 500mb, max 50 clips, max 60s per clip). We extract frames and build a searchable index automatically.</p>
            <button className="choose-button" onClick={() => inputRef.current?.click()}>
              Upload folder <Icon name="arrow" />
            </button>
            <small>ZIP only · MP4 / MOV inside · 500MB max folder · max 50 clips · max 60s per clip</small>
            {error && <p className="upload-error">{error}</p>}
          </>
        )}

        {(busy || done) && (
          <div className="upload-progress-wrap">
            <div className="upload-progress-kicker">{done ? "✓ Indexed" : "Indexing in progress"}</div>
            {!done && (
              <div className="fun-status-message" style={{ marginBottom: "12px", fontSize: "14px", color: "var(--ink)", fontWeight: "800", display: "flex", alignItems: "center" }}>
                {progress < 20 ? "Warming up the engines..." : progress < 45 ? "Analyzing pixels, finding the magic..." : progress < 70 ? "Teaching AI your story..." : progress < 90 ? "Connecting the dots..." : "Almost there, putting on the final touches..."}
              </div>
            )}
            <div className="upload-bar-track">
              <div className="upload-bar-fill" style={{ width: `${progress}%`, transition: "width 0.3s ease" }} />
            </div>
            <div className="upload-stage-grid">
              {STAGES.map((s, i) => (
                <div key={s} className={`upload-stage ${i + 1 < activeStage ? "done" : i + 1 === activeStage ? "active" : ""}`}>
                  <div className="upload-stage-num">{i + 1 < activeStage ? "✓" : i + 1}</div>
                  {s}
                </div>
              ))}
            </div>
            <p className="upload-status-text">{status}</p>
            {currentClip && !done && <p className="upload-clip-name">Processing: {currentClip}</p>}
            {done && (
              <>
                <p className="upload-done-msg">Indexing complete. Ready to search for your context.</p>
                {skipped.length > 0 && (
                  <details className="upload-skipped">
                    <summary>{skipped.length} file{skipped.length > 1 ? "s" : ""} skipped (unreadable)</summary>
                    <ul>{skipped.map(f => <li key={f}>{f}</li>)}</ul>
                  </details>
                )}
                {/* ── KEY FIX: navigates to composer ── */}
                <button className="choose-button" style={{ marginTop: 20 }} onClick={handleStartSearching}>
                  Open indexed library <Icon name="arrow" />
                </button>
              </>
            )}
          </div>
        )}

        <input ref={inputRef} type="file" accept=".zip" style={{ display: "none" }}
          onChange={e => handleFile(e.target.files?.[0])} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// App
// ─────────────────────────────────────────────────────────────────────────────

function IndexedLibraryPage({
  stats,
  onSearch,
  onUpload,
}: {
  stats: { clips: number; segments: number };
  onSearch: () => void;
  onUpload: () => void;
}) {
  return <main className="indexed-page">
    <nav className="topbar indexed-topbar">
      <span className="brand"><span className="brand-mark"><Icon name="aperture" size={25} /></span><span>FRAME<span className="brand-accent">MIND</span></span><sup>AI</sup></span>
      <button className="nav-index-btn" onClick={onUpload}><Icon name="upload" size={15} />Upload your folder</button>
    </nav>
    <section className="indexed-content">
      <div className="eyebrow"><span>04</span> Library intelligence</div>
      <h1>Your footage is<br /><em>ready to search.</em></h1>
      <p className="indexed-lede">Your visual library has been indexed. Search by meaning, or let your story find the shots for you.</p>
      <div className="indexed-stats"><div><span>CLIPS INDEXED</span><strong>{stats.clips}</strong></div><div><span>SEARCHABLE SEGMENTS</span><strong>{stats.segments}</strong></div><div><span>INDEX STATUS</span><strong className="indexed-ready">READY</strong></div></div>
      <div className="indexed-actions"><button className="nav-index-btn" onClick={onSearch}>Search your footage <Icon name="arrow" size={15} /></button></div>
      <div className="indexed-note"><Icon name="check" size={14} /> CLIP embeddings · FAISS index · Runs locally</div>
    </section>
  </main>;
}

export default function App() {
  const composerRef = useRef<HTMLElement>(null);

  const [mode, setMode]     = useState<"script" | "search">("script");
  const [query, setQuery]   = useState("A person walking alone through the city at night");
  const [script, setScript] = useState(
    "Starting my own business was the biggest risk I ever took. Every morning, I shaped the work with my own two hands. Slowly, the city began to notice what we were building.",
  );

  const [results, setResults]             = useState<NormalisedResult[]>([
    { clipId: "s1", file: "walking_night.mp4", title: "City walking", caption: "A solitary figure walking down a neon-lit street.", time: "01:23 → 01:30", start: 83, end: 90, score: 96, qualityFlag: "", image: "https://images.unsplash.com/photo-1555589943-4f9b8c0c10c2?auto=format&fit=crop&w=400&q=80", videoUrl: "" },
    { clipId: "s2", file: "alleyway_02.mp4", title: "Dark alley", caption: "Person walking away in a dark alley.", time: "00:10 → 00:15", start: 10, end: 15, score: 89, qualityFlag: "dark", image: "https://images.unsplash.com/photo-1509822929063-6b6cfc9b42f2?auto=format&fit=crop&w=400&q=80", videoUrl: "" }
  ]);
  const [scriptScenes, setScriptScenes]   = useState<Array<{ scene_index: number; sentence: string; results: NormalisedResult[] }>>([
    {
      scene_index: 0,
      sentence: "Starting my own business was the biggest risk I ever took.",
      results: [
        { clipId: "d1", file: "leap_of_faith_01.mp4", title: "Looking over the city", caption: "A person standing at the edge of a rooftop at dusk.", time: "00:12 → 00:18", start: 12, end: 18, score: 94, qualityFlag: "", image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=400&q=80", videoUrl: "" },
        { clipId: "d2", file: "office_late_night.mp4", title: "Working late", caption: "Silhouette typing on a laptop in a dark office.", time: "00:45 → 00:52", start: 45, end: 52, score: 87, qualityFlag: "dark", image: "https://images.unsplash.com/photo-1497215842964-222b430dc094?auto=format&fit=crop&w=400&q=80", videoUrl: "" }
      ]
    },
    {
      scene_index: 1,
      sentence: "Every morning, I shaped the work with my own two hands.",
      results: [
        { clipId: "d3", file: "pottery_wheel.mp4", title: "Hands shaping clay", caption: "Close up of muddy hands shaping a vase.", time: "00:10 → 00:18", start: 10, end: 18, score: 91, qualityFlag: "", image: "https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=400&q=80", videoUrl: "" }
      ]
    },
    {
      scene_index: 2,
      sentence: "Slowly, the city began to notice what we were building.",
      results: [
        { clipId: "d4", file: "city_sunrise.mp4", title: "City skyline at dawn", caption: "Time-lapse of the city waking up.", time: "00:00 → 00:08", start: 0, end: 8, score: 88, qualityFlag: "", image: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=400&q=80", videoUrl: "" }
      ]
    }
  ]);
  const [activeScene, setActiveScene]     = useState(0);
  const [scriptTruncated, setScriptTruncated] = useState(false);

  const [analyzing, setAnalyzing]             = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const [error, setError]                     = useState("");
  const [hasResults, setHasResults]           = useState(true);

  const [hideBlurry, setHideBlurry] = useState(false);
  const [hideDark, setHideDark]     = useState(false);
  const [sceneBusy, setSceneBusy]   = useState(false);

  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [playClip, setPlayClip]         = useState<NormalisedResult | null>(null);
  const [libraryOpen, setLibraryOpen]   = useState(false);
  const [libraryReady, setLibraryReady] = useState(false);
  const [startedSearching, setStartedSearching] = useState(false);

  const [modelConnected, setModelConnected] = useState<boolean | null>(null);
  const [indexStats, setIndexStats]         = useState<{ clips: number; segments: number } | null>(null);

  // /health polling
  useEffect(() => {
    let mounted = true;
    async function check() {
      try { const h = await getHealth(); if (mounted) setModelConnected(h.model_connected); }
      catch { if (mounted) setModelConnected(false); }
    }
    check(); const t = setInterval(check, 15_000);
    return () => { mounted = false; clearInterval(t); };
  }, []);

  // Fake progress animation
  useEffect(() => {
    if (!analyzing) return;
    setAnalyzeProgress(8);
    const t = setInterval(() => {
      setAnalyzeProgress(v => { if (v >= 92) { clearInterval(t); return 92; } return Math.min(v + Math.floor(Math.random() * 12) + 5, 92); });
    }, 220);
    return () => clearInterval(t);
  }, [analyzing]);

  async function runAnalysis() {
    if (analyzing) return;
    if (!modelConnected) { setError("Backend ML model is not ready. Start the server with: python run.py"); return; }
    setError(""); setPlayingIndex(null); setAnalyzing(true); setHasResults(false); setScriptTruncated(false);
    try {
      if (mode === "search") {
        const data = await searchClips(query.trim() || "person walking alone at night");
        setResults(data.results);
        if (data.message && data.results.length === 0) setError(data.message);
      } else {
        const data = await searchScript(script);
        setScriptScenes(data.scenes); setScriptTruncated(data.truncated); setActiveScene(0);
        if (data.scenes.length === 0) setError("No sentences found in your script.");
      }
      setHasResults(true);
    } catch (err) { setError((err as Error).message); }
    finally { setAnalyzeProgress(100); setAnalyzing(false); }
  }

  async function reSearchScene(sceneIndex: number, sentence: string) {
    if (sceneBusy || !modelConnected) return;
    setSceneBusy(true);
    try {
      const data = await searchClips(sentence);
      setScriptScenes(prev => prev.map((s, i) => i === sceneIndex ? { ...s, results: data.results } : s));
    } catch (err) { setError((err as Error).message); }
    finally { setSceneBusy(false); }
  }

  function handlePlay(match: NormalisedResult, index: number) {
    if (match.videoUrl) { setPlayClip(match); setPlayingIndex(index); }
    else setPlayingIndex(playingIndex === index ? null : index);
  }

  function applyQualityFilter(list: NormalisedResult[]) {
    return list.filter(r => {
      if (hideBlurry && r.qualityFlag === "blurry") return false;
      if (hideDark   && r.qualityFlag === "dark")   return false;
      return true;
    });
  }

  const rawResults     = mode === "search" ? results : (scriptScenes[activeScene]?.results ?? []);
  const currentResults = applyQualityFilter(rawResults);

  const sceneList = scriptScenes.length > 0
    ? scriptScenes.map((s, i) => ({ number: String(i + 1).padStart(2, "0"), label: `Scene ${i + 1}`, text: s.sentence, count: s.results.length }))
    : [
        { number: "01", label: "The leap",  text: "Starting my own business was the biggest risk I ever took.", count: 0 },
        { number: "02", label: "The craft", text: "Every morning, I shaped the work with my own two hands.",   count: 0 },
        { number: "03", label: "The city",  text: "Slowly, the city began to notice what we were building.",   count: 0 },
      ];

  const totalMatches  = mode === "search" ? results.length : scriptScenes.reduce((s, sc) => s + sc.results.length, 0);
  const navClips      = indexStats?.clips    ?? (modelConnected ? "—" : "?");
  const navSegments   = indexStats?.segments ?? (modelConnected ? "—" : "?");
  const wordCount     = script.trim().split(/\s+/).filter(Boolean).length;
  const sentenceCount = script.trim().split(/(?<=[.!?])\s+|\n+/).filter(s => s.trim().length > 0).length;

  const dotStyle: React.CSSProperties = modelConnected === null
    ? { background: "var(--muted)" }
    : modelConnected
      ? { background: "var(--acid)", boxShadow: "0 0 10px var(--acid)", animation: "pulse 2s infinite" }
      : { background: "#e05252" };

  if (libraryReady && indexStats) {
    return <IndexedLibraryPage stats={indexStats} onSearch={() => { setLibraryReady(false); setMode("search"); setStartedSearching(true); setTimeout(() => composerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80); }} onUpload={() => { setLibraryReady(false); setLibraryOpen(true); }} />;
  }

  return (
    <main className="app-shell">
      <div className="noise" />

      {/* ── Navbar — single upload button ── */}
      <nav className="topbar">
        <button className="brand" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <span className="brand-mark"><Icon name="aperture" size={25} /></span>
          <span>FRAME<span className="brand-accent">MIND</span></span>
          <sup>AI</sup>
        </button>
        <div className="nav-center">
          <span className="status-dot" style={dotStyle}
            title={modelConnected === null ? "Checking…" : modelConnected ? "Engine ready" : "Backend offline"} />
          <span>{navClips} clips</span>
          <i />
          <span>{navSegments} segments indexed</span>
        </div>
        <div className="nav-actions">
          {/* Single CTA button — replaces Library + Add footage */}
          <button className="upload-button nav-index-btn" onClick={() => setLibraryOpen(true)}>
            <Icon name="upload" size={15} />
            Upload your folder
          </button>
        </div>
      </nav>

      {/* ── Global error banner ── */}
      {error && (
        <div role="alert" className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError("")} aria-label="Dismiss"><Icon name="x" size={16} /></button>
        </div>
      )}

      {!startedSearching && (
        <>
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
            <TrustBar />
          </section>

          {/* ── Before / After ── */}
          <BeforeAfter onUpload={() => setLibraryOpen(true)} />

          {/* ── How It Works ── */}
          <HowItWorks onUpload={() => setLibraryOpen(true)} />
        </>
      )}

      {/* ── Composer ── */}
      <section className="workspace" ref={composerRef as React.Ref<HTMLElement>}>
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
              {mode === "script"
                ? <span className={sentenceCount > 20 ? "composer-counter warn" : "composer-counter"}>{wordCount} words · {sentenceCount}/20 sentences</span>
                : <span className="composer-counter">Natural language</span>}
            </div>
            {mode === "script"
              ? <textarea value={script} onChange={e => setScript(e.target.value)} aria-label="Narration script" />
              : <input value={query} onChange={e => setQuery(e.target.value)} aria-label="Search query" />}
            <div className="composer-footer">
              <div className="ai-note"><Icon name="bolt" size={15} />AI splits your narrative into visual beats automatically</div>
              <button className="analyze-button" onClick={runAnalysis} disabled={analyzing}>
                {analyzing ? "Reading narrative" : mode === "script" ? "Find my story" : "Search footage"}
                <Icon name={analyzing ? "wave" : "arrow"} />
              </button>
            </div>
          </div>
          {analyzing && (
            <div className="analysis-overlay">
              <div className="scan-line" style={{ left: `${analyzeProgress}%` }} />
              <div><span>CLIP / FAISS</span><strong>Mapping meaning to moments</strong></div>
              <b>{analyzeProgress}%</b>
              <div className="progress-track"><i style={{ width: `${analyzeProgress}%` }} /></div>
            </div>
          )}
        </div>
      </section>

      {/* ── Script truncation warning ── */}
      {scriptTruncated && (
        <div className="truncation-banner" role="status">
          <Icon name="bolt" size={14} />
          Your script was long — only the first 20 sentences were searched.
          <button onClick={() => setScriptTruncated(false)} aria-label="Dismiss"><Icon name="x" size={13} /></button>
        </div>
      )}

      {/* ── Results ── */}
      <section className={`results ${analyzing ? "results-muted" : ""}`}>
        <aside className="scene-rail">
          <div className="rail-heading"><span>Scene map</span><b>{sceneList.length}</b></div>
          <div className="scene-line" />
          {sceneList.map((scene, index) => (
            <button key={scene.number} className={`scene-item ${activeScene === index ? "active" : ""}`}
              onClick={() => { setActiveScene(index); setPlayingIndex(null); }}>
              <span className="scene-number">{scene.number}</span>
              <span className="scene-info"><b>{scene.label}</b><small>{scene.count > 0 ? `${scene.count} matches` : "—"}</small></span>
              <Icon name="chevron" size={16} />
            </button>
          ))}
          {hasResults && totalMatches > 0 && (
            <div className="rail-summary">
              <Icon name="check" size={17} />
              <div><b>All scenes covered</b><span>{totalMatches} quality matches</span></div>
            </div>
          )}
        </aside>

        <div className="result-content">
          <header className="result-header">
            <div>
              <div className="result-kicker">{mode === "search" ? "Search results" : `Scene ${sceneList[activeScene]?.number ?? "01"} / ${sceneList.length}`}</div>
              <h2>"{mode === "search" ? (query || "person walking alone at night") : (sceneList[activeScene]?.text ?? "")}"</h2>
            </div>
            <div className="result-controls">
              <div className="quality-filter" role="group" aria-label="Quality filters">
                <span className="quality-filter-label"><Icon name="filter" size={13} /> Filter</span>
                <button className={`qf-btn ${hideBlurry ? "qf-btn--active" : ""}`} onClick={() => setHideBlurry(v => !v)}>Blurry</button>
                <button className={`qf-btn ${hideDark ? "qf-btn--active" : ""}`} onClick={() => setHideDark(v => !v)}>Dark</button>
              </div>
              {mode === "script" && hasResults && scriptScenes[activeScene] && (
                <button className="rescan-btn" onClick={() => reSearchScene(activeScene, scriptScenes[activeScene].sentence)} disabled={sceneBusy}>
                  <Icon name="refresh" size={14} />{sceneBusy ? "Searching…" : "Re-search scene"}
                </button>
              )}
              <div className="result-meta">
                <Icon name="sparkles" size={16} />
                {hasResults ? `${currentResults.length} ranked moments` : "Run analysis to see results"}
              </div>
            </div>
          </header>

          {!hasResults && !analyzing && (
            <div className="empty-state">
              {modelConnected === false
                ? "⚠ Backend offline — start the server with: python run.py"
                : "Enter a query or paste a script above and click the button to find footage."}
            </div>
          )}

          {currentResults.length > 0 && (
            <div className="card-grid">
              {currentResults.map((match, index) => (
                <MatchCard key={`${match.clipId}-${index}`} match={match} index={index}
                  playing={playingIndex} onPlay={() => handlePlay(match, index)} />
              ))}
            </div>
          )}

          {hasResults && currentResults.length === 0 && !analyzing && (
            <div className="empty-state">
              No strong match found.{" "}
              {(hideBlurry || hideDark) && "Try removing quality filters, or "}
              try rephrasing or uploading more footage.
            </div>
          )}
        </div>
      </section>

      <footer>
        <div className="footer-mark"><Icon name="aperture" size={20} /> FRAMEMIND</div>
        <p>Meaning in. Moments out.</p>
        <span>Powered by CLIP · FAISS · curiosity</span>
      </footer>

      {libraryOpen && (
        <UploadModal
          onClose={() => setLibraryOpen(false)}
          onDone={(clips, segments) => { setIndexStats({ clips, segments }); }}
          onGoToSearch={() => { setLibraryOpen(false); setLibraryReady(true); }}
        />
      )}
      {playClip && (
        <VideoModal clip={playClip} onClose={() => { setPlayClip(null); setPlayingIndex(null); }} />
      )}
    </main>
  );
}
