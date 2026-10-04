import React from "react";
import Icon from "./Icon";
import TrustBar from "./TrustBar";
import BeforeAfter from "./BeforeAfter";
import HowItWorks from "./HowItWorks";

interface LandingPageProps {
  modelConnected: boolean | null;
  navClips: string | number;
  navSegments: string | number;
  mode: "search" | "script";
  setMode: (mode: "search" | "script") => void;
  query: string;
  setQuery: (q: string) => void;
  script: string;
  setScript: (s: string) => void;
  busy: boolean;
  analyzeProgress: number;
  wordCount: number;
  sentenceCount: number;
  onRunSearch: (q?: string) => void;
  onRunScript: () => void;
  onNavigate: (view: "home" | "results" | "script" | "upload") => void;
}

export default function LandingPage({
  modelConnected,
  navClips,
  navSegments,
  mode,
  setMode,
  query,
  setQuery,
  script,
  setScript,
  busy,
  analyzeProgress,
  wordCount,
  sentenceCount,
  onRunSearch,
  onRunScript,
  onNavigate,
}: LandingPageProps) {
  return (
    <main className="app-shell">
      <div className="noise" />

      {/* Topbar */}
      <nav className="topbar">
        <button className="brand" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <span className="brand-mark"><Icon name="aperture" size={25} /></span>
          <span>FRAME<span className="brand-accent">MIND</span></span>
          <sup>AI</sup>
        </button>
        <div className="nav-center">
          <span
            className="status-dot"
            style={{
              background: modelConnected ? "var(--acid)" : "#e05252",
              boxShadow: modelConnected ? "0 0 10px var(--acid)" : "none",
            }}
          />
          <span>{navClips} clips</span>
          <i />
          <span>{navSegments} moments indexed</span>
        </div>
        <div className="nav-actions">
          <button className="nav-index-btn" style={{ background: "transparent", color: "var(--paper)" }} onClick={() => onNavigate("results")}>
            <Icon name="search" size={14} /> Console
          </button>
          <button className="nav-index-btn" onClick={() => onNavigate("upload")}>
            <Icon name="upload" size={15} /> Upload Library
          </button>
        </div>
      </nav>

      {/* Hero Section */}
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
        <TrustBar />
        <div className="hero-marquee" aria-hidden="true">
          SEMANTIC SEARCH <i /> SCENE MATCHING <i /> TIMESTAMP PRECISION
        </div>
      </section>

      {/* Before & After Comparison */}
      <BeforeAfter onUpload={() => onNavigate("upload")} />

      {/* How It Works */}
      <HowItWorks onUpload={() => onNavigate("upload")} />

      {/* Interactive Composer Section */}
      <section className="workspace">
        <div className="composer">
          <div className="mode-switch">
            <button className={mode === "search" ? "active" : ""} onClick={() => setMode("search")}>
              <Icon name="search" size={16} />Single search
            </button>
            <button className={mode === "script" ? "active" : ""} onClick={() => setMode("script")}>
              <Icon name="sparkles" size={16} />Script mode<span>USP</span>
            </button>
          </div>
          <div className="composer-body">
            <div className="composer-label">
              <span>{mode === "script" ? "Paste your narration" : "Describe the shot"}</span>
              {mode === "script" ? (
                <span className={sentenceCount > 20 ? "composer-counter warn" : "composer-counter"}>
                  {wordCount} words · {sentenceCount}/20 sentences
                </span>
              ) : (
                <span className="composer-counter">Natural language semantic retrieval</span>
              )}
            </div>

            {mode === "script" ? (
              <textarea
                value={script}
                onChange={e => setScript(e.target.value)}
                aria-label="Narration script"
                placeholder="Paste script narration here…"
              />
            ) : (
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && onRunSearch()}
                aria-label="Search query"
                placeholder="e.g. A person walking alone through the city at night"
              />
            )}

            <div className="composer-footer">
              <div className="ai-note">
                <Icon name="bolt" size={15} />
                AI matches visual concepts, movement, and mood automatically
              </div>
              <button
                className="analyze-button"
                onClick={() => (mode === "script" ? onRunScript() : onRunSearch())}
                disabled={busy}
              >
                {busy ? "Scanning Footage…" : mode === "script" ? "Find my story" : "Search footage"}
                <Icon name={busy ? "wave" : "arrow"} />
              </button>
            </div>
          </div>

          {busy && (
            <div className="analysis-overlay">
              <div className="scan-line" style={{ left: `${analyzeProgress}%` }} />
              <div>
                <span>CLIP / FAISS ENGINE</span>
                <strong>Mapping meaning to visual moments…</strong>
              </div>
              <b>{analyzeProgress}%</b>
              <div className="progress-track"><i style={{ width: `${analyzeProgress}%` }} /></div>
            </div>
          )}
        </div>
      </section>

      {/* Landing Footer */}
      <footer>
        <div className="footer-mark"><Icon name="aperture" size={20} /> FRAMEMIND AI</div>
        <p>Meaning in. Moments out.</p>
        <span>Powered by CLIP · FAISS · SQLite</span>
      </footer>
    </main>
  );
}
