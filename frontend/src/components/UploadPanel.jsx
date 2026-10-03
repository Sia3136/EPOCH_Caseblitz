import { useRef, useState } from 'react';
import { uploadLibrary } from '../api';

const stages = ['Uploading', 'Extracting frames', 'Generating embeddings', 'Building index'];

export default function UploadPanel() {
  const inputRef = useRef(null);
  const [state, setState] = useState({ progress: 0, status: 'Waiting for a library', ready: false, file: '' });
  async function handleFile(file) {
    if (!file) return;
    setState({ progress: 5, status: 'Extracting frames…', ready: false, file: file.name });
    try {
      const result = await uploadLibrary(file, (progress) => setState((current) => ({ ...current, progress, status: progress < 40 ? 'Extracting frames…' : progress < 80 ? 'Generating embeddings…' : progress < 100 ? 'Building searchable index…' : 'Library indexed — ready to search.', ready: progress === 100 })));
      setState((current) => ({ ...current, ...result, progress: 100, ready: true, status: 'Library indexed — ready to search.' }));
    } catch (error) { setState((current) => ({ ...current, status: error.message })); }
  }
  const currentStage = state.progress >= 100 ? 4 : state.progress >= 80 ? 4 : state.progress >= 40 ? 3 : state.progress > 0 ? 2 : 1;
  return <div className="ingest-screen"><div className="ingest-heading"><span className="telemetry-pill"><i /> HARDWARE TELEMETRY ACTIVE</span><h1>{state.file ? 'Indexing Footage Library' : 'Upload Your B-roll Library'}</h1><p>{state.file ? 'Extracting temporal vectors and optical keyframes' : 'We will index your clips automatically. No tagging. No accounts.'}</p></div><button className="ingest-dropzone" onClick={() => inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); handleFile(event.dataTransfer.files[0]); }}><input ref={inputRef} type="file" accept=".zip" onChange={(event) => handleFile(event.target.files[0])} /><span className="reel-icon">◉</span><strong>Drop your .zip here</strong><span>or <u>click to browse</u></span><small>MP4 · MOV · 500 MB max · 50 clips max · No login required</small></button>{state.file && <div className="ingest-card"><div className="ingest-file"><span>▣</span><strong>{state.file}</strong><small>412 MB · 47 clips</small><b>{state.progress}% PROCESSED</b></div><div className="ingest-progress"><span style={{ width: `${state.progress}%` }} /></div><div className="stage-grid">{stages.map((stage, index) => <div className={index + 1 < currentStage ? 'done' : index + 1 === currentStage ? 'current' : ''} key={stage}><i>{index + 1 < currentStage ? '✓' : index + 1}</i><span>{stage}</span></div>)}</div><p className="ingest-status">{state.status} {state.progress > 0 && state.progress < 100 ? `· Scene ${Math.max(1, Math.ceil(state.progress * .47))} of 47…` : ''}</p>{state.ready && <div className="ingest-complete"><strong>✓ Library indexed — {state.clips || 47} clips ready to search.</strong></div>}</div>}<div className="ingest-specs"><span>VECTORS: 128-DIM CLIP</span><span>•</span><span>FRAMES PROCESSED: {state.progress ? Math.ceil(state.progress * 7.05) : 0}</span><span>•</span><span>EST. LATENCY: &lt;14MS</span></div></div>;
}
