export default function VideoPreview({ clip, onPlay }) {
  return <aside className="preview"><div className="preview-media"><img src={clip.image} alt={clip.caption} /><button className="preview-play" onClick={() => onPlay(clip)} aria-label="Play selected clip">▶</button></div><div className="preview-copy"><div className="eyebrow">{clip.time}</div><h3>{clip.file}</h3><p>{clip.caption}</p><button className="primary preview-action" onClick={() => onPlay(clip)}>Play from timestamp</button></div></aside>;
}
