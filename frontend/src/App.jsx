import { useState } from 'react';
import { searchClips, searchScript } from './api';
import { clips, sampleScript } from './data';
import Navbar from './components/Navbar';
import ResultCard from './components/ResultCard';
import VideoPreview from './components/VideoPreview';
import SceneBlock from './components/SceneBlock';
import UploadPanel from './components/UploadPanel';
import LandingPage from './components/LandingPage';
import WorkspaceShell from './components/WorkspaceShell';

const images = ['https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=900&q=85', 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=900&q=85', 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=900&q=85', 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=700&q=85'];

export default function App() {
  const [view, setView] = useState('home');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [script, setScript] = useState(sampleScript);
  const [scenes, setScenes] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [library, setLibrary] = useState(null);

  function navigate(next) { setView(next); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  function play(clip) { setSelected(clip); }
  function handleLibraryComplete(stats) {
    setLibrary(stats);
    setResults([]);
    setSelected(null);
    navigate('results');
  }
  async function runSearch(event) { event?.preventDefault(); const nextQuery = query.trim() || 'person walking alone at night'; setBusy(true); setError(''); try { const response = await searchClips(nextQuery); setResults(response.results); setSelected(response.results[0] || null); navigate('results'); if (response.message) setError(response.message); } catch (requestError) { setError(requestError.message); } finally { setBusy(false); } }
  async function runScript() { setBusy(true); setError(''); try { setScenes(await searchScript(script)); } catch (requestError) { setError(requestError.message); } finally { setBusy(false); } }
  return <div className="shell">{view === 'home' && <Navbar view={view} onNavigate={navigate} />}
    {error && <div className="error-banner" role="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss error">×</button></div>}
    {view === 'home' && <LandingPage onUpload={() => navigate('upload')} />}
    {view === 'results' && <WorkspaceShell active="search" library={library} onNavigate={navigate}><Results query={query || ''} results={results} selected={selected} setSelected={setSelected} onPlay={play} busy={busy} onNew={() => navigate('home')} /></WorkspaceShell>}
    {view === 'script' && <WorkspaceShell active="script" library={library} onNavigate={navigate}><ScriptMode script={script} setScript={setScript} scenes={scenes} onRun={runScript} onPlay={play} busy={busy} /></WorkspaceShell>}
    {view === 'upload' && <UploadPanel onComplete={handleLibraryComplete} />}
  </div>;
}

function Home({ query, setQuery, onSearch, onQuery, onUpload }) { return <section className="view active"><div className="hero"><div className="hero-copy"><div className="eyebrow">Semantic B-roll search</div><h1>Find the shot behind the story.</h1><p>Describe a scene, mood, or moment. FrameFind finds the strongest visual match in your footage.</p><form className="search-box" onSubmit={onSearch}><span className="muted">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try: a person walking alone at night" aria-label="Search footage" /><button className="primary" type="submit">Search</button></form><div className="chips">{['busy marketplace at night', 'hands preparing food', 'rain against a window'].map((item) => <button className="chip" key={item} onClick={() => onQuery(item)}>{item}</button>)}</div><div className="library-line"><span className="dot" />214 searchable segments <span className="muted">·</span> <span className="muted">47 clips indexed</span></div></div><div className="contact-sheet">{images.map((image, index) => <div className="frame" key={image}><img src={image} alt="Curated footage still" /><span className="mono">{['TC 01:14:02', '92% match · 00:43', 'scene 04', 'indexed'][index]}</span></div>)}</div></div></section>; }

function Results({ query, results, selected, setSelected, onPlay, busy, onNew }) { return <section className="view active"><div className="toolbar"><div><div className="eyebrow">Search results</div><h2>Matches for “{query}”</h2><p>{busy ? 'Searching your visual library…' : `${results.length} moments ranked by semantic similarity.`}</p></div><button className="icon-btn" onClick={onNew}>New search ↗</button></div>{results.length === 0 ? <div className="empty">No strong match found. Try describing the subject, action, location, or atmosphere differently.</div> : <div className="results-layout"><div className="results">{results.map((clip) => <ResultCard key={clip.file} clip={clip} selected={selected?.file === clip.file} onSelect={() => setSelected(clip)} onPlay={onPlay} />)}</div>{selected && <VideoPreview clip={selected} onPlay={onPlay} />}</div>}</section>; }

function ScriptMode({ script, setScript, scenes, onRun, onPlay, busy }) { return <section className="view active"><div className="script-head"><div className="eyebrow">Script mode</div><h2>Build from the script.</h2><p>Paste narration or a creative brief. FrameFind finds footage scene by scene.</p></div><textarea value={script} onChange={(event) => setScript(event.target.value)} placeholder="Paste narration or a creative brief…" /><div className="script-actions"><span className="muted">{scenes.length || 3} scenes · {script.split(/\s+/).filter(Boolean).length} words</span><button className="primary" onClick={onRun}>{busy ? 'Finding scenes…' : 'Find footage for each scene'}</button></div>{scenes.map((scene) => <SceneBlock key={scene.scene_index} scene={scene} onPlay={onPlay} />)}</section>; }
