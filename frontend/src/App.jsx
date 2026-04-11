import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import AgentDashboard from './components/agents/AgentDashboard';
import HistoryPage from './pages/HistoryPage';
import ReportPage from './pages/ReportPage';

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
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>v2.0</span>
      </div>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <div className="app">
        <Navbar />
        <main className="app-content">
          <Routes>
            <Route path="/" element={<AgentDashboard />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/report/:scanId" element={<ReportPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
