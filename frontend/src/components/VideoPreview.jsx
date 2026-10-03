import { useEffect, useRef } from 'react';

export default function VideoPreview({ clip }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;
    const seek = () => { video.currentTime = clip.start || 0; };
    video.addEventListener('loadedmetadata', seek);
    return () => video.removeEventListener('loadedmetadata', seek);
  }, [clip]);

  function playFromTimestamp() {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = clip.start || 0;
    video.play().catch(() => {});
  }

  return <aside className="preview"><div className="preview-media"><video ref={videoRef} src={clip.videoUrl} poster={clip.image} controls preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /><button className="preview-play" onClick={playFromTimestamp} aria-label="Play selected clip">▶</button></div><div className="preview-copy"><div className="eyebrow">{clip.time}</div><h3>{clip.file}</h3><p>{clip.caption}</p><button className="primary preview-action" onClick={playFromTimestamp}>Play from timestamp</button></div></aside>;
}
