import React from "react";
import Icon from "./Icon";
import { type NormalisedResult } from "../api";

interface WorkspaceShellProps {
  view: "results" | "script";
  onNavigate: (view: "home" | "results" | "script" | "upload") => void;
  modelConnected: boolean | null;
  navClips: string | number;
  indexStats: { clips: number; segments: number } | null;
  query: string;
  setQuery: (q: string) => void;
  onRunSearch: (q?: string) => void;
  busy: boolean;
  filteredResults: NormalisedResult[];
  selectedResult: NormalisedResult | null;
  setSelectedResult: (clip: NormalisedResult | null) => void;
  onPlayClip: (clip: NormalisedResult) => void;
  hideBlurry: boolean;
  setHideBlurry: React.Dispatch<React.SetStateAction<boolean>>;
  hideDark: boolean;
  setHideDark: React.Dispatch<React.SetStateAction<boolean>>;
  script: string;
  setScript: (s: string) => void;
  onRunScript: () => void;
  wordCount: number;
  sentenceCount: number;
  scriptScenes: Array<{ scene_index: number; sentence: string; results: NormalisedResult[] }>;
}

export default function WorkspaceShell({
  view,
  onNavigate,
  modelConnected,
  navClips,
  indexStats,
  query,
  setQuery,
  onRunSearch,
  busy,
  filteredResults,
  selectedResult,
  setSelectedResult,
  onPlayClip,
  hideBlurry,
  setHideBlurry,
  hideDark,
  setHideDark,
  script,
  setScript,
  onRunScript,
  wordCount,
  sentenceCount,
  scriptScenes,
}: WorkspaceShellProps) {
  return (
    <div className="console-shell">
      {/* Topbar */}
      <header className="console-topbar">
        <button className="console-brand" onClick={() => onNavigate("home")}>
          FrameMind<span className="dot" />
        </button>
        <div className="console-top-actions">
          <span className="engine-status">
            <i /> {modelConnected ? "INDEX ENGINE READY" : "BACKEND OFFLINE"}
          </span>
          <button className="console-nav-home" onClick={() => onNavigate("home")}>
            ← Landing Page
          </button>
          <button className="console-upload" onClick={() => onNavigate("upload")}>
            Upload Library
          </button>
        </div>
      </header>

      <div className="console-body">
        {/* Sidebar */}
        <aside className="console-sidebar">
          <div>
            <span className="side-label">LIBRARY</span>
            <div className="library-box">
              <div>▣ <strong>footage_library</strong></div>
              <small>
                <span>{navClips} clips</span>
                <em>{indexStats ? "INDEXED" : "READY"}</em>
              </small>
            </div>

            <nav>
              <button
                className={view === "results" ? "active" : ""}
                onClick={() => onNavigate("results")}
              >
                <Icon name="search" size={15} /> <span>Search</span>
              </button>
              <button
                className={view === "script" ? "active" : ""}
                onClick={() => onNavigate("script")}
              >
                <Icon name="sparkles" size={15} /> <span>Script Mode</span>
              </button>
            </nav>
          </div>

          <div className="console-footer-meta">
            <span>V4.2 CORE</span>
            <i />
          </div>
        </aside>

        {/* Main Console Content */}
        <main className="console-main">
          {/* Tab Bar */}
          <div className="console-tabs">
            <button
              className={view === "results" ? "active" : ""}
              onClick={() => onNavigate("results")}
            >
              Search
            </button>
            <button
              className={view === "script" ? "active" : ""}
              onClick={() => onNavigate("script")}
            >
              Script Mode
            </button>
          </div>

          {/* SEARCH VIEW */}
          {view === "results" && (
            <div className="console-content">
              <div className="console-toolbar">
                <div>
                  <div className="eyebrow"><span>SEARCH</span> B-Roll Catalog</div>
                  <h2>Matches for "{query || "All Footage"}"</h2>
                  <p>{filteredResults.length} moments ranked by semantic similarity</p>
                </div>

                <div className="quality-filter">
                  <span className="quality-filter-label"><Icon name="filter" size={13} /> Filter</span>
                  <button className={`qf-btn ${hideBlurry ? "qf-btn--active" : ""}`} onClick={() => setHideBlurry(v => !v)}>Blurry</button>
                  <button className={`qf-btn ${hideDark ? "qf-btn--active" : ""}`} onClick={() => setHideDark(v => !v)}>Dark</button>
                </div>
              </div>

              {/* Query Bar */}
              <form
                className="console-search-bar"
                onSubmit={e => { e.preventDefault(); onRunSearch(); }}
              >
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Describe the footage you need…"
                />
                <button type="submit" className="console-upload" disabled={busy}>
                  {busy ? "Searching…" : "Search"}
                </button>
              </form>

              {/* Results Layout: List + VideoPreview */}
              {filteredResults.length === 0 ? (
                <div className="empty-state">
                  {busy ? "Searching your visual library…" : "No matching footage found. Try a different description."}
                </div>
              ) : (
                <div className="results-layout">
                  <div className="results-list">
                    {filteredResults.map(clip => (
                      <article
                        key={clip.clipId}
                        className={`result-card-item ${selectedResult?.clipId === clip.clipId ? "selected" : ""}`}
                        onClick={() => setSelectedResult(clip)}
                      >
                        <div className="result-thumb">
                          {clip.image ? (
                            <img src={clip.image} alt={clip.caption} />
                          ) : (
                            <div style={{ width: "100%", height: "100%", background: "#111" }} />
                          )}
                          <span className="result-score-badge">{clip.score}%</span>
                          <span className="result-time-badge">{clip.time}</span>
                        </div>
                        <div className="result-body">
                          <div>
                            <div className="result-title">{clip.file}</div>
                            <p className="result-caption">{clip.caption}</p>
                          </div>
                          <div className="result-footer">
                            <button
                              className="result-play-btn"
                              onClick={(e) => { e.stopPropagation(); onPlayClip(clip); }}
                            >
                              <Icon name="play" size={14} /> Play Segment
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>

                  {/* VideoPreview Side Panel */}
                  {selectedResult && (
                    <aside className="preview-panel">
                      <div className="preview-media-box">
                        <video
                          src={selectedResult.videoUrl}
                          poster={selectedResult.image}
                          controls
                          preload="metadata"
                        />
                      </div>
                      <div className="preview-info">
                        <div className="eyebrow">{selectedResult.time}</div>
                        <h3>{selectedResult.file}</h3>
                        <p>{selectedResult.caption}</p>
                        <button
                          className="preview-seek-btn"
                          onClick={() => onPlayClip(selectedResult)}
                        >
                          Open in Fullscreen Player
                        </button>
                      </div>
                    </aside>
                  )}
                </div>
              )}
            </div>
          )}

          {/* SCRIPT MODE VIEW */}
          {view === "script" && (
            <div className="console-content">
              <div className="console-toolbar">
                <div>
                  <div className="eyebrow"><span>USP</span> Script Mode</div>
                  <h2>Build From Narrative</h2>
                  <p>AI splits your narration into scenes and finds matching footage for each sentence</p>
                </div>
              </div>

              <textarea
                value={script}
                onChange={e => setScript(e.target.value)}
                placeholder="Paste narration or a creative brief…"
                style={{
                  width: "100%",
                  minHeight: 120,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid var(--line)",
                  color: "var(--paper)",
                  padding: 16,
                  borderRadius: 4,
                  marginBottom: 16,
                }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 36 }}>
                <span style={{ color: "var(--muted)", font: "500 12px 'DM Mono'" }}>
                  {wordCount} words · {sentenceCount} scenes detected
                </span>
                <button className="console-upload" onClick={onRunScript} disabled={busy}>
                  {busy ? "Analyzing Script…" : "Find footage for each scene"}
                </button>
              </div>

              {scriptScenes.map((scene) => (
                <article key={scene.scene_index} className="scene-block">
                  <div className="scene-num">{String(scene.scene_index + 1).padStart(2, "0")}</div>
                  <div>
                    <p className="scene-text">"{scene.sentence}"</p>
                    <div className="scene-matches">
                      {scene.results.map((clip) => (
                        <article
                          key={clip.clipId}
                          className="result-card-item"
                          onClick={() => onPlayClip(clip)}
                        >
                          <div className="result-thumb" style={{ height: 120 }}>
                            {clip.image ? <img src={clip.image} alt={clip.caption} /> : null}
                            <span className="result-score-badge">{clip.score}%</span>
                            <span className="result-time-badge">{clip.time}</span>
                          </div>
                          <div className="result-body" style={{ padding: 10 }}>
                            <div className="result-title" style={{ fontSize: 12 }}>{clip.file}</div>
                            <button className="result-play-btn" style={{ marginTop: 6 }}>
                              <Icon name="play" size={12} /> Play
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
