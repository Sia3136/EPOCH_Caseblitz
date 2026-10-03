import { useRef, useState } from 'react';
import { uploadLibrary } from '../api';

const stages = ['Uploading', 'Extracting frames', 'Generating embeddings', 'Building index'];

function stageLabel(progress) {
  if (progress <= 0)   return 'Waiting for a library';
  if (progress < 10)   return 'Uploading…';
  if (progress < 45)   return 'Extracting frames…';
  if (progress < 80)   return 'Generating embeddings…';
  if (progress < 100)  return 'Building searchable index…';
  return 'Library indexed — ready to search.';
}

function currentStageIndex(progress) {
  if (progress >= 100) return 4;
  if (progress >= 80)  return 4;
  if (progress >= 45)  return 3;
  if (progress > 0)    return 2;
  return 1;
}

export default function UploadPanel({ onComplete }) {
  const inputRef = useRef(null);
  const [state, setState] = useState({
    progress: 0,
    status: 'Waiting for a library',
    ready: false,
    file: '',
    clips: null,
    segments: null,
    skipped: [],
  });

  async function handleFile(file) {
    if (!file) return;
    setState({ progress: 5, status: 'Uploading…', ready: false, file: file.name, clips: null, segments: null, skipped: [] });

    try {
      const result = await uploadLibrary(file, (progress) =>
        setState((prev) => ({
          ...prev,
          progress,
          status: stageLabel(progress),
          ready: progress === 100,
        }))
      );
      // Final state from real backend response
      setState((prev) => ({
        ...prev,
        progress: 100,
        ready: true,
        status: 'Library indexed — ready to search.',
        clips: result.clips,
        segments: result.segments,
        skipped: result.skipped || [],
      }));
      onComplete?.({ clips: result.clips, segments: result.segments, skipped: result.skipped || [] });
    } catch (error) {
      setState((prev) => ({ ...prev, status: `Error: ${error.message}` }));
    }
  }

  const activeStage = currentStageIndex(state.progress);

  return (
    <div className="ingest-screen">
      <div className="ingest-heading">
        <span className="telemetry-pill"><i /> HARDWARE TELEMETRY ACTIVE</span>
        <h1>{state.file ? 'Indexing Footage Library' : 'Upload Your B-roll Library'}</h1>
        <p>{state.file ? 'Extracting temporal vectors and optical keyframes' : 'We will index your clips automatically. No tagging. No accounts.'}</p>
      </div>

      <button
        className="ingest-dropzone"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
        aria-label="Upload footage library zip file"
      >
        <input
          ref={inputRef}
          type="file"
          accept=".zip"
          onChange={(e) => handleFile(e.target.files[0])}
          aria-hidden="true"
        />
        <span className="reel-icon">◉</span>
        <strong>Upload your folder</strong>
        <span>or <u>click to browse</u></span>
        <small>ZIP folder · 500 MB max · 50 clips max · Runs locally</small>
      </button>

      {state.file && (
        <div className="ingest-card">
          <div className="ingest-file">
            <span>▣</span>
            <strong>{state.file}</strong>
            {state.clips !== null && <small>{state.clips} clips</small>}
            <b>{state.progress}% PROCESSED</b>
          </div>

          <div className="ingest-progress">
            <span style={{ width: `${state.progress}%` }} />
          </div>

          <div className="stage-grid">
            {stages.map((stage, index) => (
              <div
                key={stage}
                className={index + 1 < activeStage ? 'done' : index + 1 === activeStage ? 'current' : ''}
              >
                <i>{index + 1 < activeStage ? '✓' : index + 1}</i>
                <span>{stage}</span>
              </div>
            ))}
          </div>

          <p className="ingest-status">{state.status}</p>

          {state.ready && (
            <div className="ingest-complete">
              <strong>✓ Library indexed — {state.clips ?? '?'} clips · {state.segments ?? '?'} segments ready to search.</strong>
              {state.skipped.length > 0 && (
                <details className="ingest-skipped">
                  <summary>{state.skipped.length} file{state.skipped.length > 1 ? 's' : ''} skipped (corrupt or unreadable)</summary>
                  <ul>{state.skipped.map((f) => <li key={f}>{f}</li>)}</ul>
                </details>
              )}
            </div>
          )}
        </div>
      )}

      <div className="ingest-specs">
        <span>VECTORS: 512-DIM CLIP</span>
        <span>•</span>
        <span>INDEX ENGINE: FAISS</span>
        <span>•</span>
        <span>EST. LATENCY: &lt;14MS</span>
      </div>
    </div>
  );
}
