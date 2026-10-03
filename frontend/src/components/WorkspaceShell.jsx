export default function WorkspaceShell({ active, onNavigate, children }) {
  return <div className="console-shell">
    <header className="console-topbar"><button className="console-brand" onClick={() => onNavigate('home')}>FrameFind<span /></button><div className="console-top-actions"><span className="engine-status"><i /> INDEX ENGINE READY</span><button className="console-upload" onClick={() => onNavigate('upload')}>Upload Library</button></div></header>
    <aside className="console-sidebar"><div><span className="side-label">LIBRARY</span><div className="library-box"><div>▣ <strong>footage_library</strong></div><small>47 clips <em>INDEXED</em></small></div><nav><button className={active === 'search' ? 'active' : ''} onClick={() => onNavigate('results')}>⌕ <span>Search</span></button><button className={active === 'script' ? 'active' : ''} onClick={() => onNavigate('script')}>▧ <span>Script Mode</span></button></nav></div><div className="console-footer-meta"><span>V4.2 CORE</span><i /></div></aside>
    <main className="console-main"><div className="console-tabs"><button className={active === 'search' ? 'active' : ''} onClick={() => onNavigate('results')}>Search</button><button className={active === 'script' ? 'active' : ''} onClick={() => onNavigate('script')}>Script Mode</button></div>{children}</main>
  </div>;
}
