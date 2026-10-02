import { useRef, useState } from 'react';
import { uploadLibrary } from '../api';

export default function UploadPanel() {
  const inputRef = useRef(null);
  const [state, setState] = useState({ progress: 0, status: 'Waiting for a library', ready: false, file: '' });
  async function handleFile(file) {
    if (!file) return;
    setState({ progress: 0, status: 'Extracting footage…', ready: false, file: file.name });
    const result = await uploadLibrary(file, (progress) => setState((current) => ({ ...current, progress, status: progress < 40 ? 'Extracting footage…' : progress < 80 ? 'Finding visual segments…' : progress < 100 ? 'Building searchable index…' : 'Your visual library is ready.', ready: progress === 100 })));
    setState((current) => ({ ...current, ...result, ready: true }));
  }
  return <div className="upload-layout"><div className="eyebrow">Library ingest</div><h2>Bring your footage in.</h2><p className="muted upload-intro">Upload a ZIP and make every moment searchable.</p><button className="dropzone" onClick={() => inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); handleFile(event.dataTransfer.files[0]); }}><input ref={inputRef} type="file" accept=".zip" onChange={(event) => handleFile(event.target.files[0])} /><span className="upload-mark">＋</span><strong>Drop a ZIP here</strong><span>or <u>browse your files</u></span></button><div className="limits"><span>500 MB max</span><span>50 clips max</span><span>No login required</span></div>{state.file && <div className="progress-card"><div className="progress-header"><strong>{state.ready ? 'Library ready' : state.file}</strong><span className="mono">{state.progress}%</span></div><div className="progress-bar"><div className="progress-fill" style={{ width: `${state.progress}%` }} /></div><div className="progress-row"><span>{state.status}</span><span>{state.ready ? '47 clips · 214 segments' : 'Processing'}</span></div></div>}</div>;
}
