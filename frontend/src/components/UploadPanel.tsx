import React, { useRef } from "react";

interface UploadPanelProps {
  uploadFile: string;
  uploadProgress: number;
  uploadStatus: string;
  uploadReady: boolean;
  onFileSelect: (file: File | undefined) => void;
  onNavigateSearch: () => void;
  onNavigateHome: () => void;
}

export default function UploadPanel({
  uploadFile,
  uploadProgress,
  uploadStatus,
  uploadReady,
  onFileSelect,
  onNavigateSearch,
  onNavigateHome,
}: UploadPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="ingest-screen" style={{ marginTop: 60 }}>
      <div className="ingest-heading">
        <span className="telemetry-pill">
          <i /> HARDWARE TELEMETRY ACTIVE
        </span>
        <h1>{uploadFile ? "Indexing Footage Library" : "Upload Your B-Roll Library"}</h1>
        <p>
          {uploadFile
            ? "Extracting temporal vectors and optical keyframes"
            : "Drop a .zip of your footage. We extract frames and build a searchable index automatically."}
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".zip"
        style={{ display: "none" }}
        onChange={e => onFileSelect(e.target.files?.[0])}
      />

      <button
        className="ingest-dropzone"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          e.preventDefault();
          onFileSelect(e.dataTransfer.files?.[0]);
        }}
      >
        <span className="reel-icon">◉</span>
        <strong>{uploadFile || "Drop your .zip here"}</strong>
        <span>or <u>click to browse</u></span>
        <small>MP4 · MOV · 500 MB max · 50 clips max · No tags needed</small>
      </button>

      {uploadFile && (
        <div style={{ marginTop: 30, background: "rgba(17,19,16,0.9)", border: "1px solid var(--line)", padding: 24, borderRadius: 4 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <strong style={{ font: "600 14px 'Syne'" }}>{uploadFile}</strong>
            <span style={{ color: "var(--acid)", font: "700 12px 'DM Mono'" }}>{uploadProgress}% PROCESSED</span>
          </div>
          <div className="upload-bar-track">
            <div className="upload-bar-fill" style={{ width: `${uploadProgress}%` }} />
          </div>
          <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 12 }}>{uploadStatus}</p>

          {uploadReady && (
            <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
              <button className="console-upload" onClick={onNavigateSearch}>
                Open Console Search →
              </button>
              <button className="console-nav-home" onClick={onNavigateHome}>
                Go to Landing Page
              </button>
            </div>
          )}
        </div>
      )}

      <div className="ingest-specs">
        <span>VECTORS: 128-DIM CLIP</span>
        <span>•</span>
        <span>EST. LATENCY: &lt;14MS</span>
        <span>•</span>
        <span>FAISS FLAT-IP INDEX</span>
      </div>
    </div>
  );
}
