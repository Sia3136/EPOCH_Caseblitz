import React, { useEffect, useRef } from "react";
import Icon from "./Icon";
import { type NormalisedResult } from "../api";

export default function VideoModal({ clip, onClose }: { clip: NormalisedResult; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    function seek() {
      if (!el) return;
      el.currentTime = clip.start || 0;
      el.play().catch(() => {});
    }
    el.addEventListener("loadedmetadata", seek);
    return () => el.removeEventListener("loadedmetadata", seek);
  }, [clip]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={onClose} role="dialog" aria-modal="true">
      <div className="video-modal" onMouseDown={e => e.stopPropagation()}>
        <button className="video-modal-close" onClick={onClose} aria-label="Close"><Icon name="x" size={16} /></button>
        <video ref={videoRef} src={clip.videoUrl} controls autoPlay className="video-modal-player" />
        <div className="video-modal-meta">
          <span className="result-kicker">{clip.time}</span>
          <strong className="video-modal-title">{clip.title || clip.file}</strong>
          {clip.caption && <p className="video-modal-caption">{clip.caption}</p>}
        </div>
      </div>
    </div>
  );
}
