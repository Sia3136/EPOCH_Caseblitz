import { useEffect, useRef } from 'react';

const frames = [
  ['https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=900&q=85', '98% TC 01:14:02'],
  ['https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=900&q=85', 'MATCH HEAD 00:43:18'],
  ['https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=900&q=85', 'TC 02:08:11'],
  ['https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=900&q=85', '91% MATCH'],
  ['https://images.unsplash.com/photo-1518391846015-55a9cc003b25?w=900&q=85', 'INDEXED'],
];

export default function LandingPage({ onUpload }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!context) return undefined;
    let frame;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    const draw = (time) => {
      const width = canvas.width; const height = canvas.height; const pulse = (Math.sin(time / 3000) + 1) / 2;
      const gradient = context.createRadialGradient(width * (.35 + pulse * .08), height * .15, 0, width * .35, height * .2, Math.max(width, height) * .85);
      gradient.addColorStop(0, 'rgba(99,102,241,.13)'); gradient.addColorStop(.55, 'rgba(34,211,238,.025)'); gradient.addColorStop(1, 'rgba(8,8,14,0)');
      context.fillStyle = '#08080e'; context.fillRect(0, 0, width, height); context.fillStyle = gradient; context.fillRect(0, 0, width, height);
      context.fillStyle = 'rgba(255,255,255,.025)';
      for (let i = 0; i < 700; i += 1) { const x = (i * 83 + time * .01) % width; const y = (i * 47) % height; context.fillRect(x, y, 1, 1); }
      frame = requestAnimationFrame(draw);
    };
    resize(); window.addEventListener('resize', resize); frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize); };
  }, []);

  return <>
    <canvas ref={canvasRef} className="landing-canvas" aria-hidden="true" />
    <section className="landing-hero">
      <div className="landing-copy">
        <div className="landing-eyebrow"><span />SEMANTIC B-ROLL SEARCH</div>
        <h1>Find the <em>shot</em>.<br />Not the filename.</h1>
        <p>Describe the footage you need in plain language. FrameFind searches your library by meaning — objects, scenes, mood, action — not by filename or tag.</p>
        <button className="landing-cta" onClick={onUpload}>Upload your library <span>↗</span></button>
        <span className="landing-note">No sign-up · No tags required · 500 MB max</span>
      </div>
      <div className="film-strip" aria-label="Cinematic footage preview">
        <div className="film-perforations">{Array.from({ length: 8 }, (_, index) => <i key={index} />)}</div>
        <div className="film-frames">{frames.map(([image, label], index) => <div className={`film-frame frame-${index + 1}`} key={image}><img src={image} alt="Cinematic footage preview" /><span>{label}</span></div>)}</div>
        <div className="film-perforations">{Array.from({ length: 8 }, (_, index) => <i key={index} />)}</div>
        <div className="film-indexed">● ProRes 4444 XQ · Indexed</div>
      </div>
      <div className="scroll-cue"><span /></div>
    </section>
    <section className="landing-section problem-section"><div className="compare-grid"><div className="terminal-card"><b>Before FrameFind</b><p>&gt; You need: <strong>“busy street market, golden hour”</strong></p><p>&gt; Your files: clip_0047.mp4, shoot_day3.mp4, untitled_export.mp4</p><p className="dim">&gt; Result: no useful match</p></div><div className="terminal-card after"><b>After FrameFind <span>●</span></b><p>&gt; Query: <strong>“busy street market, golden hour”</strong></p><p>&gt; Match: market_footage_02.mp4 — <strong>84% match</strong></p><p>&nbsp;&nbsp;Timestamp: <strong>00:14 → 00:22</strong></p><p className="dim">&gt; “A crowded outdoor bazaar at dusk, warm light”</p></div></div><div className="landing-stats"><span><b>50</b> clips indexed</span><span><b>&lt;2s</b> query time</span><span><b>20</b> script scenes</span></div></section>
    <section className="landing-section steps-section"><div className="section-heading"><span>HOW IT WORKS</span><h2>Three steps. Zero scrubbing.</h2></div><div className="steps-grid"><Step number="01" title="Upload your library" text="Drop a .zip of your footage. We extract frames and build a searchable index automatically." /><Step number="02" title="Search by meaning" text="Describe what you need in plain language or paste an entire narration script." /><Step number="03" title="Get timestamps, not just clips" text="Every result shows where the match occurs, with confidence and a one-line explanation." /></div></section>
    <section className="landing-section script-showcase"><div className="script-pitch"><span>SCRIPT MODE</span><h2>Paste a script.<br />Get every shot.</h2><p>FrameFind splits your narration into scenes and returns the best matching clip for each one.</p><ul><li>Automatic scene splitting</li><li>Per-scene ranked results</li><li>Confidence-based filtering</li><li>Deduplication across scenes</li></ul></div><div className="script-window"><div className="script-window-bar"><span>● ● ●</span><small>documentary_cut_v4.fountain</small><b>3 SCENES PARSED</b></div>{['Dawn breaks over the dormant manufacturing plant, steam drifting through shattered glass.','An elderly worker reviews blueprints in the dim archives.','The quiet hum of servers fills an empty control room.'].map((sentence, index) => <div className="script-beat" key={sentence}><strong>{String(index + 1).padStart(2, '0')}</strong><p>{sentence}</p><span>{[96, 89, 92][index]}% · 00:{14 + index * 11} → 00:{22 + index * 11}</span></div>)}</div></section>
    <footer className="landing-footer"><strong>FrameFind</strong><span>For editors who are tired of scrubbing.</span></footer>
  </>;
}

function Step({ number, title, text }) { return <article className="step-card"><b>{number}</b><span className="step-icon">✦</span><h3>{title}</h3><p>{text}</p><small>● Ready for your footage</small></article>; }
