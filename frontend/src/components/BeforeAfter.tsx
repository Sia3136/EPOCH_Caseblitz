import React from "react";
import Icon from "./Icon";

export default function BeforeAfter({ onUpload }: { onUpload: () => void }) {
  return (
    <section className="ba-section" aria-labelledby="ba-heading">
      <div className="ba-header">
        <div className="eyebrow"><span>02</span> The difference</div>
        <h2 id="ba-heading" className="ba-title">
          Before FrameFind.<span> After FrameFind.</span>
        </h2>
      </div>

      <div className="ba-panel">
        <div className="ba-panel-inner">
          {/* BEFORE column */}
          <div className="ba-col ba-col--before">
            <div className="ba-col-label">
              <span className="ba-pill ba-pill--before">Before FrameFind</span>
            </div>
            <div className="ba-block">
              <span className="ba-block-label">You need</span>
              <p className="ba-query-text">"busy street market, golden hour"</p>
            </div>
            <div className="ba-block">
              <span className="ba-block-label">Your files</span>
              <div className="ba-file-list">
                {["clip_0047.mp4", "shoot_day3.mp4", "untitled_export.mp4"].map(f => (
                  <div key={f} className="ba-file-row">
                    <span className="ba-file-icon">▣</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="ba-result ba-result--bad">
              <Icon name="x" size={14} />
              <span>No useful match</span>
            </div>
          </div>

          {/* Divider */}
          <div className="ba-divider" aria-hidden="true">
            <div className="ba-divider-line" />
            <span className="ba-divider-label">VS</span>
            <div className="ba-divider-line" />
          </div>

          {/* AFTER column */}
          <div className="ba-col ba-col--after">
            <div className="ba-col-label">
              <span className="ba-pill ba-pill--after">
                <span className="ba-dot" />After FrameFind
              </span>
            </div>
            <div className="ba-block">
              <span className="ba-block-label">Query</span>
              <p className="ba-query-text">"busy street market, golden hour"</p>
            </div>
            <div className="ba-match-card">
              <div className="ba-match-top">
                <span className="ba-match-file">market_footage_02.mp4</span>
                <span className="ba-match-score">84%</span>
              </div>
              <div className="ba-match-ts">
                <Icon name="clock" size={12} />
                Timestamp: 00:14 → 00:22
              </div>
              <p className="ba-match-caption">"A crowded outdoor bazaar at dusk, warm light"</p>
            </div>
            <div className="ba-result ba-result--good">
              <Icon name="check" size={14} />
              <span>Exact match found</span>
            </div>
          </div>
        </div>

        <div className="ba-panel-footer">
          <span className="ba-footer-note">
            <Icon name="bolt" size={13} />
            CLIP embeddings match meaning, not filenames
          </span>
          <button className="ba-footer-cta" onClick={onUpload}>
            Index your footage <Icon name="arrow" size={14} />
          </button>
        </div>
      </div>
    </section>
  );
}
