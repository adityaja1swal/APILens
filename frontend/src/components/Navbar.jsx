export default function Navbar() {
  return (
    <nav className="navbar" style={{ justifyContent: 'center' }}>
      <div className="navbar-brand">
        <span className="logo-icon">🔬</span>
        <span className="logo-text">APILens</span>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '12px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)' }}>V2 Security Edition</span>
      </div>
    </nav>
  );
}
