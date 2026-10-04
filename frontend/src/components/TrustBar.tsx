import React from "react";

export default function TrustBar() {
  const items = ["No sign-up", "No tags required", "500 MB max", "MP4 · MOV · MKV", "Runs locally"];
  return (
    <div className="trust-bar" aria-label="Key facts">
      {items.map((item, i) => (
        <span key={item} className="trust-item">
          {i > 0 && <span className="trust-sep" aria-hidden="true">·</span>}
          {item}
        </span>
      ))}
    </div>
  );
}
