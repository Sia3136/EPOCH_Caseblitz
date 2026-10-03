import { useEffect, useRef, useState } from "react";
import { getHealth, searchScript, uploadLibrary, type NormalisedResult, searchClips } from "./api";

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
// MatchCard
// ─────────────────────────────────────────────────────────────────────────────

function MatchCard({ match, index, playing, onPlay }: {
  match: NormalisedResult; index: number; playing: boolean; onPlay: () => void;
}) {
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
          {match.caption && <p style={{marginTop: 6, fontStyle: "italic"}}>{match.caption}</p>}
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
// App - Following Streamlit Flow
// ─────────────────────────────────────────────────────────────────────────────

function UploadPage({
  file,
  progress,
  status,
  error,
  indexed,
  stats,
  onBrowse,
  onFile,
  onIndex,
  onBack,
}: {
  file: File | null;
  progress: number;
  status: string;
  error: string;
  indexed: boolean;
  stats: { clips: number; segments: number } | null;
  onBrowse: () => void;
  onFile: (file: File | undefined) => void;
  onIndex: () => void;
  onBack: () => void;
}) {
  const stages = ["Uploading", "Extracting frames", "Generating embeddings", "Building index"];
  const activeStage = progress >= 100 ? 4 : progress >= 80 ? 4 : progress >= 40 ? 3 : progress > 0 ? 2 : 1;
  const inputRef = useRef<HTMLInputElement>(null);
  return <main className="upload-page">
    <nav className="topbar"><button className="brand" onClick={onBack}><span className="brand-mark"><Icon name="aperture" size={25} /></span><span>FRAME<span className="brand-accent">MIND</span></span><sup>AI</sup></button><button className="nav-index-btn" onClick={onBack}>Back to search</button></nav>
    <section className="upload-page-content"><input ref={inputRef} type="file" accept=".zip" hidden onChange={(event) => onFile(event.target.files?.[0])} /><div className="eyebrow"><span>02</span> Library ingest</div><h1>Upload your<br /><em>folder.</em></h1><p>Bring in a ZIP of your footage. We extract the visual moments and make them searchable.</p><button className="upload-drop-card" onClick={() => { onBrowse(); inputRef.current?.click(); }}><Icon name="upload" size={30} /><strong>{file ? file.name : "Choose a ZIP folder"}</strong><span>{file ? "Ready to index" : "MP4 · MOV · MKV · 500 MB max · Runs locally"}</span></button>{file && !indexed && progress === 0 && <button className="nav-index-btn upload-start" onClick={onIndex}>Start indexing <Icon name="arrow" size={15} /></button>}{(progress > 0 || indexed) && <div className="upload-page-progress"><div className="upload-progress-kicker">{indexed ? "✓ Indexing complete" : "Indexing in progress"}</div><div className="upload-bar-track"><div className="upload-bar-fill" style={{ width: `${progress}%` }} /></div><div className="upload-page-stages">{stages.map((stage, index) => <div className={index + 1 < activeStage ? "done" : index + 1 === activeStage ? "active" : ""} key={stage}><b>{index + 1 < activeStage ? "✓" : index + 1}</b><span>{stage}</span></div>)}</div><p className="upload-status-text">{status}</p>{indexed && stats && <div className="upload-ready"><strong>Library ready</strong><span>{stats.clips} clips · {stats.segments} searchable segments</span></div>}</div>}{error && <div className="upload-error-box" role="alert">{error}</div>}</section>
  </main>;
}

export default function App() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Health
  const [modelConnected, setModelConnected] = useState<boolean | null>(null);
  
  // Upload State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [hasIndexed, setHasIndexed] = useState(false);
  const [indexStats, setIndexStats] = useState<{clips: number, segments: number} | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [showUploadPage, setShowUploadPage] = useState(false);
  
  // Search State
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [scriptScenes, setScriptScenes] = useState<Array<{ scene_index: number; sentence: string; results: NormalisedResult[] }>>([]);
  const [singleResults, setSingleResults] = useState<NormalisedResult[] | null>(null);
  const [searchError, setSearchError] = useState("");
  
  const [playClip, setPlayClip] = useState<NormalisedResult | null>(null);

  useEffect(() => {
    let mounted = true;
    async function check() {
      try { const h = await getHealth(); if (mounted) setModelConnected(h.model_connected); }
      catch { if (mounted) setModelConnected(false); }
    }
    check(); const t = setInterval(check, 15_000);
    return () => { mounted = false; clearInterval(t); };
  }, []);

  async function handleIndexLibrary() {
    if (!uploadFile) return;
    setUploadError("");
    setIsUploading(true);
    setUploadProgress(5);
    setUploadStatus("Uploading to backend...");
    try {
      const result = await uploadLibrary(uploadFile, (pct) => {
        setUploadProgress(pct);
        if (pct < 10) setUploadStatus("Uploading...");
        else if (pct < 40) setUploadStatus("Extracting frames...");
        else if (pct < 80) setUploadStatus("Generating embeddings...");
        else setUploadStatus("Building searchable index...");
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

  async function handleSearch() {
    if (!query.trim()) return;
    setSearchError("");
    setScriptScenes([]);
    setSingleResults(null);
    setIsSearching(true);
    
    try {
      const data = await searchScript(query);
      if (data.scenes.length > 1) {
        setScriptScenes(data.scenes);
      } else {
        // Fallback to single search if it's just one scene/query
        const singleData = await searchClips(query);
        setSingleResults(singleData.results);
        if (singleData.results.length === 0) {
            setSearchError("No relevant footage found. Try another description.");
        }
      }
    } catch (err) {
      setSearchError((err as Error).message);
    } finally {
      setIsSearching(false);
    }
  }

  if (showUploadPage) {
    return <UploadPage file={uploadFile} progress={uploadProgress} status={uploadStatus} error={uploadError} indexed={hasIndexed} stats={indexStats} onBrowse={() => undefined} onFile={(file) => { setUploadFile(file ?? null); setHasIndexed(false); setUploadProgress(0); setUploadError(""); }} onIndex={handleIndexLibrary} onBack={() => setShowUploadPage(false)} />;
  }

  return (
    <main className="app-shell" style={{ paddingBottom: 100 }}>
      <div className="noise" />
      
      <nav className="topbar">
        <div className="brand">
          <span className="brand-mark"><Icon name="aperture" size={25} /></span>
          <span>FRAME<span className="brand-accent">MIND</span></span>
          <sup>AI</sup>
        </div>
        <div className="nav-center">
          <span className="status-dot" style={{ background: modelConnected ? "var(--acid)" : "#e05252" }} />
          <span>{modelConnected ? "Engine ready" : "Backend offline"}</span>
        </div>
        <button className="nav-index-btn" onClick={() => setShowUploadPage(true)}><Icon name="upload" size={15} />Upload your folder</button>
      </nav>

      <div style={{ maxWidth: 1000, margin: "60px auto 0", padding: "0 20px" }}>
        
        {/* Streamlit-style Flow: 1. Header */}
        <h1 style={{ fontSize: "clamp(32px, 5vw, 48px)", margin: "0 0 10px" }}>AI-Powered B-roll Search</h1>
        <p style={{ color: "var(--muted)", fontSize: 18, marginBottom: 40 }}>Find the right footage using natural language.</p>
        
        {/* Streamlit-style Flow: 2. Upload Section */}
        <div style={{ background: "var(--paper)", padding: 30, borderRadius: 8, color: "var(--ink)", marginBottom: 40 }}>
          <h2 style={{ fontSize: 20, marginBottom: 15 }}>Upload your video library (ZIP)</h2>
          
          <input type="file" accept=".zip" style={{ display: "none" }} ref={fileInputRef} 
                 onChange={e => setUploadFile(e.target.files?.[0] || null)} />
                 
          <div style={{ display: "flex", gap: 15, alignItems: "center", marginBottom: 15 }}>
            <button className="nav-index-btn" onClick={() => fileInputRef.current?.click()}>
              <Icon name="folder" size={15} /> {uploadFile ? uploadFile.name : "Browse files"}
            </button>
            {uploadFile && !hasIndexed && !isUploading && (
              <button className="analyze-button" onClick={handleIndexLibrary}>
                Index video library
              </button>
            )}
          </div>
          
          {uploadError && <p style={{ color: "#e05252", fontSize: 14 }}>{uploadError}</p>}
          
          {isUploading && (
            <div style={{ marginTop: 20 }}>
              <div className="upload-progress-kicker">Extracting and indexing videos...</div>
              <div className="upload-bar-track">
                <div className="upload-bar-fill" style={{ width: `${uploadProgress}%` }} />
              </div>
              <p className="upload-status-text">{uploadStatus}</p>
            </div>
          )}
          
          {hasIndexed && indexStats && (
            <div style={{ marginTop: 20, padding: 15, background: "#f0f2ea", borderRadius: 4, borderLeft: "4px solid var(--acid)" }}>
              <div style={{ color: "#2a7a00", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                <Icon name="check" size={16} /> Indexing complete
              </div>
              <p style={{ margin: "5px 0 0", fontSize: 14 }}>Indexed {indexStats.clips} videos into {indexStats.segments} segments.</p>
            </div>
          )}
        </div>
        
        <hr style={{ border: 0, borderTop: "1px solid var(--line)", margin: "40px 0" }} />
        
        {/* Streamlit-style Flow: 3. Search Section */}
        {!hasIndexed && (
          <div style={{ padding: "15px 20px", background: "rgba(199, 255, 58, 0.1)", border: "1px solid var(--acid)", color: "var(--paper)", borderRadius: 6, marginBottom: 30 }}>
            <Icon name="bolt" size={16} style={{ verticalAlign: "middle", marginRight: 8, color: "var(--acid)" }} />
            Upload and index a video library to begin searching.
          </div>
        )}
        
        <h2 style={{ fontSize: 20, marginBottom: 10 }}>Search your video library</h2>
        <textarea 
          style={{ 
            width: "100%", height: 120, background: "transparent", border: "1px solid var(--line)", 
            color: "var(--paper)", padding: 15, fontSize: 16, fontFamily: "inherit", borderRadius: 6,
            resize: "vertical", outline: "none"
          }}
          placeholder="Describe footage or paste narration, for example: A person walking through a busy city."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, marginBottom: 30 }}>
          <span style={{ color: "var(--muted)", fontSize: 13 }}>Maximum input: 500 words</span>
          <button className="analyze-button" onClick={handleSearch} disabled={isSearching || !query.trim()}>
            {isSearching ? "Searching..." : "Search"} <Icon name="search" size={14} />
          </button>
        </div>
        
        {searchError && (
          <div style={{ padding: "15px 20px", background: "rgba(224, 82, 82, 0.1)", border: "1px solid #e05252", color: "#e05252", borderRadius: 6 }}>
            {searchError}
          </div>
        )}
        
        {/* Results Linear Display */}
        <div style={{ display: "flex", flexDirection: "column", gap: 50, marginTop: 40 }}>
          {/* Multiple Scenes */}
          {scriptScenes.length > 0 && scriptScenes.map(scene => (
            <div key={scene.scene_index}>
              <h3 style={{ fontSize: 18, color: "var(--acid)", marginBottom: 15 }}>
                <span style={{ color: "var(--paper)" }}>Scene {scene.scene_index}:</span> {scene.sentence}
              </h3>
              
              {scene.results.length === 0 ? (
                <p style={{ color: "var(--muted)" }}>No relevant footage found for this sentence.</p>
              ) : (
                <div className="card-grid">
                  {scene.results.map((res, i) => (
                    <MatchCard key={i} match={res} index={i} playing={playClip === res} onPlay={() => setPlayClip(res)} />
                  ))}
                </div>
              )}
            </div>
          ))}
          
          {/* Single Query */}
          {singleResults && (
            <div>
              <div className="card-grid">
                {singleResults.map((res, i) => (
                  <MatchCard key={i} match={res} index={i} playing={playClip === res} onPlay={() => setPlayClip(res)} />
                ))}
              </div>
            </div>
          )}
        </div>
        
      </div>
      
      {playClip && (
        <VideoModal clip={playClip} onClose={() => setPlayClip(null)} />
      )}
    </main>
  );
}
