import { useEffect, useRef, useState } from "react";
import {
  getHealth,
  searchClips,
  searchScript,
  uploadLibrary,
  type NormalisedResult,
} from "./api";

// ── Icons ───────────────────────────────────────────────────────────────────
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

// ── MatchCard ───────────────────────────────────────────────────────────────
function MatchCard({ match, index, playing, onPlay }: {
  match: NormalisedResult; index: number; playing: boolean; onPlay: () => void;
}) {
  return (
    <article className={`match-card ${index === 0 ? "featured" : ""}`}>
      <div className="visual">
        {match.image ? (
          <img src={match.image} alt={match.caption} />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "#1a1c18" }} />
        )}
        <div className="visual-shade" />
        <div className="rank">0{index + 1}</div>
        <div className="score-ring" style={{ "--score": `${match.score * 3.6}deg` } as React.CSSProperties}>
          <span>{match.score}%</span>
        </div>
        <button className={`play-button ${playing ? "playing" : ""}`} onClick={onPlay} aria-label={`Play ${match.title}`}>
          {playing ? <span className="equalizer"><i /><i /><i /></span> : <Icon name="play" size={24} />}
        </button>
        <div className="timecode"><Icon name="clock" size={14} />{match.time}</div>
        {match.qualityFlag && <span className="quality-badge">{match.qualityFlag.toUpperCase()}</span>}
      </div>
      <div className="match-copy">
        <div>
          <span className="match-tag"><Icon name="sparkles" size={13} />Semantic match</span>
          <h3>{match.title || match.file}</h3>
          <p>{match.file}</p>
          {match.caption && <p style={{ marginTop: 6, fontStyle: "italic", fontSize: 13, color: "var(--muted)" }}>{match.caption}</p>}
        </div>
        <button className="open-button" onClick={onPlay} aria-label={`Open ${match.title}`}><Icon name="arrow" /></button>
      </div>
    </article>
  );
}

// ── VideoModal ──────────────────────────────────────────────────────────────
function VideoModal({ clip, onClose }: { clip: NormalisedResult; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    function seek() {
      if (!el) return;
      el.currentTime = clip.start;
      el.play().catch(() => {});
    }
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
      <div className="video-modal" onMouseDown={(e) => e.stopPropagation()}>
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

// ── Canvas Background for Landing ───────────────────────────────────────────
function AmbientCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animationId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const draw = (time: number) => {
      const w = canvas.width;
      const h = canvas.height;
      const pulse = (Math.sin(time / 3000) + 1) / 2;
      const gradient = ctx.createRadialGradient(
        w * (0.35 + pulse * 0.08),
        h * 0.15,
        0,
        w * 0.35,
        h * 0.2,
        Math.max(w, h) * 0.85
      );
      gradient.addColorStop(0, "rgba(99,102,241,.13)");
      gradient.addColorStop(0.55, "rgba(34,211,238,.025)");
      gradient.addColorStop(1, "rgba(8,8,14,0)");

      ctx.fillStyle = "#08080e";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = "rgba(255,255,255,.025)";
      for (let i = 0; i < 600; i++) {
        const x = (i * 83 + time * 0.01) % w;
        const y = (i * 47) % h;
        ctx.fillRect(x, y, 1, 1);
      }
      animationId = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    animationId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="landing-canvas" aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }} />;
}

// ── Landing Page View ───────────────────────────────────────────────────────
function LandingPage({ onUpload, onSearch }: { onUpload: () => void; onSearch: () => void }) {
  const frames = [
    ["https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=900&q=85", "98% TC 01:14:02"],
    ["https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=900&q=85", "MATCH HEAD 00:43:18"],
    ["https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=900&q=85", "TC 02:08:11"],
    ["https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=900&q=85", "91% MATCH"],
    ["https://images.unsplash.com/photo-1518391846015-55a9cc003b25?w=900&q=85", "INDEXED"],
  ];

  return (
    <div style={{ position: "relative", zIndex: 1 }}>
      <AmbientCanvas />
      
      {/* Hero Section */}
      <section className="landing-hero" style={{ padding: "80px 4vw 60px", maxWidth: 1200, margin: "0 auto" }}>
        <div className="landing-copy">
          <div className="landing-eyebrow" style={{ color: "var(--acid)", fontWeight: 600, display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--acid)" }} />
            SEMANTIC B-ROLL SEARCH ENGINE
          </div>
          <h1 style={{ fontSize: "clamp(48px, 7vw, 96px)", lineHeight: 0.95, letterSpacing: "-0.06em", margin: "0 0 24px" }}>
            Find the <em>shot</em>.<br />Not the filename.
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 18, lineHeight: 1.6, maxWidth: 620, marginBottom: 36 }}>
            Describe the footage you need in plain language. FrameMind searches your library by visual meaning — objects, scenes, mood, action — powered by CLIP and FAISS.
          </p>
          <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <button className="nav-index-btn" onClick={onUpload} style={{ height: 48, padding: "0 28px", fontSize: 14 }}>
              <Icon name="upload" size={18} /> Upload your folder ↗
            </button>
            <button 
              onClick={onSearch} 
              style={{ height: 48, padding: "0 24px", background: "rgba(240,241,234,0.06)", border: "1px solid var(--line)", color: "var(--paper)", borderRadius: 4, fontWeight: 600, cursor: "pointer" }}
            >
              Try Search Mode
            </button>
          </div>
          <div style={{ marginTop: 24, fontSize: 12, color: "var(--muted)" }}>
            No sign-up required · Runs locally · MP4, MOV, MKV support
          </div>
        </div>
      </section>

      {/* Before / After Showcase */}
      <section className="ba-section" style={{ padding: "60px 4vw", maxWidth: 1200, margin: "0 auto" }}>
        <div className="ba-header">
          <div className="eyebrow"><span>01</span> NARRATIVE INTELLIGENCE FOR EDITORS</div>
          <h2 className="ba-title">Your story, <span>visualized.</span></h2>
        </div>
        <div className="ba-panel">
          <div className="ba-panel-inner">
            <div className="ba-col ba-col--before">
              <span className="ba-pill ba-pill--before">Traditional Search</span>
              <p style={{ color: "var(--muted)", fontSize: 14 }}>Searching by filename returns 0 matches for complex scenes:</p>
              <div className="ba-file-list">
                <div className="ba-file-row"><span className="ba-file-icon">▣</span> clip_0047.mp4 (unindexed)</div>
                <div className="ba-file-row"><span className="ba-file-icon">▣</span> shoot_day3_take2.mp4</div>
                <div className="ba-file-row"><span className="ba-file-icon">▣</span> untitled_export_v1.mov</div>
              </div>
              <span className="ba-result ba-result--bad">No useful match found</span>
            </div>

            <div style={{ width: 1, background: "var(--line)" }} />

            <div className="ba-col ba-col--after">
              <span className="ba-pill ba-pill--after"><i className="ba-dot" /> FrameMind AI Search</span>
              <p style={{ color: "var(--paper)", fontSize: 14 }}>Query: <em>“busy street market, golden hour”</em></p>
              <div className="ba-match-card">
                <strong style={{ color: "var(--acid)" }}>Exact match found (88% similarity)</strong>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>market_footage_02.mp4 · TC 00:14 → 00:22</span>
                <p style={{ margin: 0, fontSize: 13, fontStyle: "italic", color: "var(--paper)" }}>
                  “A crowded outdoor bazaar at dusk with warm sunlight filtering through stalls.”
                </p>
              </div>
              <span className="ba-result ba-result--good">Ranked & Ready to insert</span>
            </div>
          </div>
        </div>
      </section>

      {/* Steps Section */}
      <section style={{ padding: "60px 4vw 80px", maxWidth: 1200, margin: "0 auto" }}>
        <div className="eyebrow"><span>02</span> HOW IT WORKS</div>
        <h2 style={{ fontSize: 32, margin: "0 0 40px" }}>Three steps. Zero scrubbing.</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
          <div style={{ background: "var(--panel)", padding: 28, border: "1px solid var(--line)" }}>
            <b style={{ color: "var(--acid)", fontSize: 24, display: "block", marginBottom: 12 }}>01</b>
            <h3 style={{ margin: "0 0 8px", fontSize: 18 }}>Upload your library</h3>
            <p style={{ color: "var(--muted)", margin: 0, fontSize: 14, lineHeight: 1.6 }}>
              Drop a ZIP folder containing your raw video clips. Frames are extracted and embedded automatically.
            </p>
          </div>
          <div style={{ background: "var(--panel)", padding: 28, border: "1px solid var(--line)" }}>
            <b style={{ color: "var(--acid)", fontSize: 24, display: "block", marginBottom: 12 }}>02</b>
            <h3 style={{ margin: "0 0 8px", fontSize: 18 }}>Search by meaning</h3>
            <p style={{ color: "var(--muted)", margin: 0, fontSize: 14, lineHeight: 1.6 }}>
              Describe what you need in plain English or paste an entire script for automatic scene splitting.
            </p>
          </div>
          <div style={{ background: "var(--panel)", padding: 28, border: "1px solid var(--line)" }}>
            <b style={{ color: "var(--acid)", fontSize: 24, display: "block", marginBottom: 12 }}>03</b>
            <h3 style={{ margin: "0 0 8px", fontSize: 18 }}>Get exact timestamps</h3>
            <p style={{ color: "var(--muted)", margin: 0, fontSize: 14, lineHeight: 1.6 }}>
              Every result includes exact start/end timecodes, similarity percentage, and playable video previews.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

// ── Upload Panel / Ingest View ──────────────────────────────────────────────
function UploadPage({
  file,
  progress,
  status,
  error,
  indexed,
  stats,
  onFileSelect,
  onStartUpload,
  onBack,
  onProceedToSearch,
}: {
  file: File | null;
  progress: number;
  status: string;
  error: string;
  indexed: boolean;
  stats: { clips: number; segments: number } | null;
  onFileSelect: (file: File | undefined) => void;
  onStartUpload: () => void;
  onBack: () => void;
  onProceedToSearch: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stages = ["Uploading ZIP", "Extracting frames", "Generating CLIP embeddings", "Building FAISS index"];
  const activeStage = progress >= 100 ? 4 : progress >= 80 ? 4 : progress >= 45 ? 3 : progress > 0 ? 2 : 1;

  return (
    <main className="upload-page">
      <section className="upload-page-content">
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip"
          style={{ display: "none" }}
          onChange={(e) => onFileSelect(e.target.files?.[0])}
        />
        <div className="eyebrow"><span>02</span> Library Ingest</div>
        <h1>Upload your<br /><em>folder.</em></h1>
        <p>Bring in a ZIP of your footage. We extract visual moments and index them with FAISS vector search.</p>

        <button
          className="upload-drop-card"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            onFileSelect(e.dataTransfer.files[0]);
          }}
        >
          <Icon name="upload" size={32} />
          <strong>{file ? file.name : "Choose or drop a ZIP folder"}</strong>
          <span>{file ? `${(file.size / (1024 * 1024)).toFixed(1)} MB · Ready to index` : "MP4 · MOV · MKV · Runs locally"}</span>
        </button>

        {file && !indexed && progress === 0 && (
          <button className="nav-index-btn upload-start" onClick={onStartUpload} style={{ marginTop: 24, height: 44, padding: "0 24px" }}>
            Start indexing <Icon name="arrow" size={15} />
          </button>
        )}

        {(progress > 0 || indexed) && (
          <div className="upload-page-progress">
            <div className="upload-progress-kicker">{indexed ? "✓ Indexing complete" : "Indexing in progress..."}</div>
            <div className="upload-bar-track" style={{ height: 6, background: "rgba(240,241,234,0.1)", borderRadius: 3, margin: "12px 0 20px" }}>
              <div className="upload-bar-fill" style={{ width: `${progress}%`, height: "100%", background: "var(--acid)", transition: "width 0.3s" }} />
            </div>

            <div className="upload-page-stages">
              {stages.map((stage, idx) => (
                <div key={stage} className={idx + 1 < activeStage ? "done" : idx + 1 === activeStage ? "active" : ""}>
                  <b>{idx + 1 < activeStage ? "✓" : idx + 1}</b>
                  <span>{stage}</span>
                </div>
              ))}
            </div>

            <p className="upload-status-text" style={{ margin: "15px 0 0", color: "var(--muted)", fontSize: 13 }}>{status}</p>

            {indexed && stats && (
              <div className="upload-ready" style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--line)" }}>
                <div>
                  <strong style={{ color: "var(--acid)", fontSize: 18 }}>Library ready</strong>
                  <span style={{ display: "block", color: "var(--muted)", fontSize: 13, marginTop: 4 }}>
                    Indexed {stats.clips} clips into {stats.segments} searchable segments.
                  </span>
                </div>
                <button className="nav-index-btn" onClick={onProceedToSearch} style={{ marginTop: 12 }}>
                  Go to Search Workspace <Icon name="arrow" size={15} />
                </button>
              </div>
            )}
          </div>
        )}

        {error && <div className="upload-error-box" role="alert" style={{ marginTop: 20, padding: 15, border: "1px solid #e05252", color: "#ffaaa4", background: "rgba(224,82,82,0.1)" }}>{error}</div>}
      </section>
    </main>
  );
}

// ── Main App Component ──────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState<"home" | "upload" | "results" | "script">("home");
  const [modelConnected, setModelConnected] = useState<boolean | null>(null);

  // Upload State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [hasIndexed, setHasIndexed] = useState(false);
  const [indexStats, setIndexStats] = useState<{ clips: number; segments: number } | null>(null);
  const [uploadError, setUploadError] = useState("");

  // Search State
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<NormalisedResult[]>([]);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [searchError, setSearchError] = useState("");

  // Script Mode State
  const [scriptText, setScriptText] = useState("");
  const [scriptScenes, setScriptScenes] = useState<Array<{ scene_index: number; sentence: string; results: NormalisedResult[] }>>([]);

  // Video Modal State
  const [playClip, setPlayClip] = useState<NormalisedResult | null>(null);

  // Check backend health periodically
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
    const interval = setInterval(check, 15_000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  function navigate(next: "home" | "upload" | "results" | "script") {
    setView(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleStartUpload() {
    if (!uploadFile) return;
    setUploadError("");
    setIsUploading(true);
    setUploadProgress(5);
    setUploadStatus("Uploading to backend...");

    try {
      const result = await uploadLibrary(uploadFile, (pct, clip) => {
        setUploadProgress(pct);
        if (pct < 20) setUploadStatus("Uploading ZIP archive...");
        else if (pct < 50) setUploadStatus(`Extracting video frames${clip ? ` (${clip})` : ""}...`);
        else if (pct < 85) setUploadStatus("Generating CLIP image embeddings...");
        else setUploadStatus("Building FAISS similarity index...");
      });

      setUploadProgress(100);
      setUploadStatus("Indexing complete.");
      setHasIndexed(true);
      setIndexStats({ clips: result.clips_indexed, segments: result.segments_indexed });
    } catch (err) {
      setUploadError((err as Error).message);
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSearch(overrideQuery?: string) {
    const q = (overrideQuery ?? query).trim();
    if (!q) return;
    setSearchError("");
    setSearchMessage(null);
    setIsSearching(true);
    setView("results");

    try {
      const data = await searchClips(q);
      setSearchResults(data.results);
      setSearchMessage(data.message);
    } catch (err) {
      setSearchError((err as Error).message);
    } finally {
      setIsSearching(false);
    }
  }

  async function handleScriptSearch() {
    if (!scriptText.trim()) return;
    setSearchError("");
    setIsSearching(true);

    try {
      const data = await searchScript(scriptText);
      setScriptScenes(data.scenes);
    } catch (err) {
      setSearchError((err as Error).message);
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <main className="app-shell">
      <div className="noise" />

      {/* Navigation Topbar */}
      <nav className="topbar">
        <button className="brand" onClick={() => navigate("home")}>
          <span className="brand-mark"><Icon name="aperture" size={20} /></span>
          <span>FRAME<span className="brand-accent">MIND</span></span>
          <sup>AI</sup>
        </button>

        <div className="nav-center">
          <span className="status-dot" style={{ background: modelConnected ? "var(--acid)" : "#e05252" }} />
          <span>{modelConnected ? "Engine ready" : "Backend offline"}</span>
        </div>

        <div className="nav-actions">
          <button className={`icon-btn ${view === "results" ? "active" : ""}`} onClick={() => navigate("results")} style={{ padding: "8px 14px", border: "1px solid var(--line)", background: view === "results" ? "rgba(250,250,250,0.1)" : "transparent" }}>
            Search
          </button>
          <button className={`icon-btn ${view === "script" ? "active" : ""}`} onClick={() => navigate("script")} style={{ padding: "8px 14px", border: "1px solid var(--line)", background: view === "script" ? "rgba(250,250,250,0.1)" : "transparent" }}>
            Script Mode
          </button>
          <button className="nav-index-btn" onClick={() => navigate("upload")}>
            <Icon name="upload" size={15} /> Upload folder
          </button>
        </div>
      </nav>

      {/* Views */}
      {view === "home" && (
        <LandingPage onUpload={() => navigate("upload")} onSearch={() => navigate("results")} />
      )}

      {view === "upload" && (
        <UploadPage
          file={uploadFile}
          progress={uploadProgress}
          status={uploadStatus}
          error={uploadError}
          indexed={hasIndexed}
          stats={indexStats}
          onFileSelect={(file) => {
            setUploadFile(file ?? null);
            setHasIndexed(false);
            setUploadProgress(0);
            setUploadError("");
          }}
          onStartUpload={handleStartUpload}
          onBack={() => navigate("home")}
          onProceedToSearch={() => navigate("results")}
        />
      )}

      {view === "results" && (
        <div style={{ maxWidth: 1100, margin: "40px auto", padding: "0 4vw" }}>
          <div style={{ marginBottom: 30 }}>
            <div className="eyebrow"><span>03</span> SEARCH WORKSPACE</div>
            <h1 style={{ fontSize: "clamp(32px, 5vw, 56px)", margin: "0 0 10px" }}>Search your B-roll</h1>
            <p style={{ color: "var(--muted)", fontSize: 16 }}>Enter any natural description to find matching video clips.</p>

            {/* Search Input Box */}
            <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Try: a person walking alone at night, water splashing..."
                style={{
                  flex: 1, height: 48, background: "var(--panel)", border: "1px solid var(--line)",
                  color: "var(--paper)", padding: "0 18px", borderRadius: 4, fontSize: 16, outline: "none"
                }}
              />
              <button className="nav-index-btn" type="submit" disabled={isSearching || !query.trim()} style={{ height: 48, padding: "0 24px" }}>
                {isSearching ? "Searching..." : "Search"} <Icon name="search" size={16} />
              </button>
            </form>

            {/* Quick Prompt Chips */}
            <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
              {["busy market at night", "person walking outdoors", "water near a beach", "hands preparing food"].map((chip) => (
                <button
                  key={chip}
                  onClick={() => { setQuery(chip); handleSearch(chip); }}
                  style={{
                    background: "rgba(240,241,234,0.05)", border: "1px solid var(--line)", color: "var(--muted)",
                    padding: "6px 14px", borderRadius: 20, fontSize: 13, cursor: "pointer"
                  }}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {searchError && (
            <div style={{ padding: 15, background: "rgba(224,82,82,0.1)", border: "1px solid #e05252", color: "#e05252", borderRadius: 4, marginBottom: 20 }}>
              {searchError}
            </div>
          )}

          {searchMessage && (
            <div style={{ padding: 12, background: "rgba(199,255,58,0.08)", border: "1px solid var(--acid)", color: "var(--acid)", borderRadius: 4, marginBottom: 20, fontSize: 13 }}>
              {searchMessage}
            </div>
          )}

          {/* Results Grid */}
          {searchResults.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 24, marginTop: 30 }}>
              {searchResults.map((match, index) => (
                <MatchCard
                  key={match.clipId + index}
                  match={match}
                  index={index}
                  playing={playClip?.clipId === match.clipId}
                  onPlay={() => setPlayClip(match)}
                />
              ))}
            </div>
          ) : (
            !isSearching && (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--muted)", border: "1px dashed var(--line)", borderRadius: 8, marginTop: 30 }}>
                <Icon name="search" size={36} />
                <p style={{ marginTop: 12, fontSize: 16 }}>No search performed yet or no matches found.</p>
                <small style={{ color: "#666" }}>Make sure you have indexed a video folder first, then enter a search description above.</small>
              </div>
            )
          )}
        </div>
      )}

      {view === "script" && (
        <div style={{ maxWidth: 1000, margin: "40px auto", padding: "0 4vw" }}>
          <div className="eyebrow"><span>04</span> SCRIPT MODE</div>
          <h1 style={{ fontSize: "clamp(32px, 5vw, 56px)", margin: "0 0 10px" }}>Script to B-roll</h1>
          <p style={{ color: "var(--muted)", fontSize: 16, marginBottom: 30 }}>Paste your script or narration. FrameMind splits it into scenes and retrieves matching footage for each.</p>

          <textarea
            value={scriptText}
            onChange={(e) => setScriptText(e.target.value)}
            placeholder="Paste narration script here... e.g. Dawn breaks over the quiet city streets. A solitary figure walks past empty cafes."
            style={{
              width: "100%", height: 160, background: "var(--panel)", border: "1px solid var(--line)",
              color: "var(--paper)", padding: 18, fontSize: 16, borderRadius: 6, outline: "none", resize: "vertical"
            }}
          />

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16, marginBottom: 40 }}>
            <button className="nav-index-btn" onClick={handleScriptSearch} disabled={isSearching || !scriptText.trim()} style={{ height: 48, padding: "0 28px" }}>
              {isSearching ? "Processing script..." : "Find footage for all scenes"} <Icon name="sparkles" size={16} />
            </button>
          </div>

          {/* Script Scenes Results */}
          {scriptScenes.map((scene) => (
            <div key={scene.scene_index} style={{ marginBottom: 40, background: "var(--panel)", padding: 24, border: "1px solid var(--line)", borderRadius: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <span style={{ background: "var(--acid)", color: "var(--ink)", fontWeight: 700, padding: "2px 8px", borderRadius: 3, fontSize: 12 }}>
                  SCENE 0{scene.scene_index}
                </span>
                <h3 style={{ margin: 0, fontSize: 16, color: "var(--paper)" }}>“{scene.sentence}”</h3>
              </div>

              {scene.results.length > 0 ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
                  {scene.results.map((match, i) => (
                    <MatchCard key={i} match={match} index={i} playing={playClip?.clipId === match.clipId} onPlay={() => setPlayClip(match)} />
                  ))}
                </div>
              ) : (
                <p style={{ color: "var(--muted)", margin: 0, fontSize: 14 }}>No high-confidence match found for this scene sentence.</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Video Modal Player */}
      {playClip && <VideoModal clip={playClip} onClose={() => setPlayClip(null)} />}
    </main>
  );
}
