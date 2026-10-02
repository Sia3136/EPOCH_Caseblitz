export default function Navbar({ view, onNavigate }) {
  return <header className="topbar landing-topbar">
    <button className="brand" onClick={() => onNavigate('home')}>FrameF<span>i</span>nd</button>
    <button className="upload-btn landing-upload" onClick={() => onNavigate('upload')}>Upload Library</button>
  </header>;
}
