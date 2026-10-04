import React from "react";
import Icon, { type IconName } from "./Icon";

const HOW_STEPS = [
  { num: "01", icon: "upload" as IconName, title: "Upload your library",       body: "Drop a .zip of your footage. We extract frames and build a searchable index automatically." },
  { num: "02", icon: "sparkles" as IconName, title: "Search by meaning",        body: "Describe what you need in plain language or paste an entire narration script." },
  { num: "03", icon: "clock" as IconName,   title: "Get timestamps, not clips", body: "Every result shows where the match occurs, with confidence and a one-line explanation." },
];

export default function HowItWorks({ onUpload }: { onUpload: () => void }) {
  return (
    <section className="how-section" aria-labelledby="how-heading">
      <div className="how-header">
        <div className="eyebrow"><span>03</span> How it works</div>
        <h2 id="how-heading" className="how-title">Three steps.<span> Zero scrubbing.</span></h2>
      </div>
      <div className="how-grid">
        {HOW_STEPS.map((step, i) => (
          <div key={step.num} className={`how-step ${i === 0 ? "how-step--accent" : ""}`}>
            <div className="how-step-top">
              <span className="how-num">{step.num}</span>
              <span className="how-sparkle">✦</span>
            </div>
            <div className="how-icon-wrap"><Icon name={step.icon} size={22} /></div>
            <h3 className="how-step-title">{step.title}</h3>
            <p className="how-step-body">{step.body}</p>
            <div className="how-status">
              <span className="how-status-dot" />
              Ready for your footage
            </div>
            {i === 0 && (
              <button className="how-cta" onClick={onUpload}>Upload footage <Icon name="arrow" size={14} /></button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
