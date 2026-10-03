export default function ResultCard({ clip, selected, onSelect, onPlay, compact = false }) {
  return <article className={`result ${selected ? 'selected' : ''} ${compact ? 'compact' : ''}`} onClick={onSelect}>
    <div className="thumb"><img src={clip.image} alt={clip.caption} /><span className="score">{clip.score}%</span></div>
    <div className="result-body"><div className="result-title">{clip.file}</div><p className="result-caption">{clip.caption}</p><div className="result-meta"><span>{clip.time}</span><button className="play" onClick={(event) => { event.stopPropagation(); onPlay(clip); }}>▶ Play</button></div></div>
  </article>;
}
