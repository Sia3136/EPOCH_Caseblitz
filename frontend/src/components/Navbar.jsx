export default function Navbar({ view, onNavigate }) {
  return <header className="topbar">
    <button className="brand" onClick={() => onNavigate('home')}>FrameF<span>i</span>nd</button>
    <nav className="nav" aria-label="Primary navigation">
      {['home', 'script', 'upload'].map((item) => <button key={item} className={view === item ? 'active' : ''} onClick={() => onNavigate(item)}>{item === 'home' ? 'Search' : item[0].toUpperCase() + item.slice(1)}</button>)}
    </nav>
    <button className="upload-btn" onClick={() => onNavigate('upload')}>Upload library</button>
  </header>;
}
