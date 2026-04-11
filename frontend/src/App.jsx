import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import AgentDashboard from './components/agents/AgentDashboard';
import HistoryPage from './pages/HistoryPage';
import ReportPage from './pages/ReportPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import { AuthProvider, useAuth } from './context/AuthContext';

function Navbar() {
  return (
    <nav className="navbar">
      <NavLink to="/" className="navbar-brand">
        <span className="logo-icon">🛡️</span>
        <span className="logo-text">APILens</span>
      </NavLink>
      <div className="navbar-tabs">
        <NavLink to="/" end className={({ isActive }) => `navbar-tab ${isActive ? 'active' : ''}`}>
          🔬 Scan
        </NavLink>
        <NavLink to="/history" className={({ isActive }) => `navbar-tab ${isActive ? 'active' : ''}`}>
          📋 History
        </NavLink>
      </div>
      <div className="navbar-right">
        <AuthNav />
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginLeft: '12px' }}>v2.0</span>
      </div>
    </nav>
  );
}

function AuthNav() {
  const { user, logout } = useAuth();

  if (user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>{user.name || 'User'}</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{user.email}</span>
        </div>
        <button 
          onClick={logout} 
          style={{ 
            background: 'var(--bg-tertiary)', 
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            padding: '4px 12px',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            fontSize: '0.75rem'
          }}
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      <NavLink to="/login" className="navbar-tab" style={{ padding: '4px 12px' }}>Login</NavLink>
      <NavLink to="/signup" className="navbar-tab" style={{ padding: '4px 12px', background: 'var(--bg-tertiary)' }}>Sign Up</NavLink>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app">
          <Navbar />
          <main className="app-content">
            <Routes>
              <Route path="/" element={<AgentDashboard />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/report/:scanId" element={<ReportPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
