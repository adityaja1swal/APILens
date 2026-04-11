import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'http://localhost:5001';

export default function HistoryPage() {
  const { token, user } = useAuth();
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      fetchHistory();
    }
  }, [token]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/scan`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      setScans(data.scans || []);
    } catch (err) {
      setError('Could not load scan history. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#F59E0B';
    if (score >= 40) return '#F97316';
    return '#EF4444';
  };

  const getRiskLabel = (score) => {
    if (score >= 80) return 'Low Risk';
    if (score >= 60) return 'Medium Risk';
    if (score >= 40) return 'High Risk';
    return 'Critical';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (!user) {
    return (
      <div className="history-page fade-in-up">
        <div className="history-header">
          <h2>📋 Scan History</h2>
        </div>
        <div className="history-empty">
          <div className="placeholder-icon">🔐</div>
          <h3>Login Required</h3>
          <p>Please sign in to view your scan history.</p>
          <div style={{ marginTop: '20px' }}>
            <button className="refresh-btn" style={{ background: 'var(--bg-tertiary)' }} onClick={() => navigate('/login')}>Sign In</button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="history-page fade-in-up">
        <div className="history-header">
          <h2>📋 Scan History</h2>
        </div>
        <div className="history-loading">
          <div className="spinner" style={{ fontSize: '2rem' }}>⟳</div>
          <p>Loading scan history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="history-page fade-in-up">
      <div className="history-header">
        <h2>📋 Scan History</h2>
        <button className="refresh-btn" onClick={fetchHistory}>⟳ Refresh</button>
      </div>

      {error && (
        <div className="history-error">
          <p>⚠️ {error}</p>
        </div>
      )}

      {scans.length === 0 && !error ? (
        <div className="history-empty">
          <div className="placeholder-icon">🔍</div>
          <h3>No scans yet</h3>
          <p>Run your first API security scan from the Scan tab.</p>
        </div>
      ) : (
        <div className="history-grid">
          {scans.map((scan) => (
            <div
              key={scan._id}
              className="history-card"
              onClick={() => navigate(`/report/${scan._id}`)}
            >
              <div className="history-card-top">
                <div className="history-card-title">
                  <h4>{scan.apiName || 'Unknown API'}</h4>
                  <span className={`status-badge ${scan.status}`}>{scan.status}</span>
                </div>
                {scan.securityScore !== null && scan.securityScore !== undefined && (
                  <div className="history-card-score" style={{ color: getScoreColor(scan.securityScore) }}>
                    <span className="score-number">{scan.securityScore}</span>
                    <span className="score-label">{getRiskLabel(scan.securityScore)}</span>
                  </div>
                )}
              </div>

              <div className="history-card-meta">
                {scan.swaggerUrl && (
                  <div className="meta-item">
                    <span className="meta-icon">🔗</span>
                    <span className="meta-text" title={scan.swaggerUrl}>
                      {scan.swaggerUrl.length > 50 ? scan.swaggerUrl.slice(0, 50) + '...' : scan.swaggerUrl}
                    </span>
                  </div>
                )}
                <div className="meta-item">
                  <span className="meta-icon">📅</span>
                  <span className="meta-text">{formatDate(scan.createdAt)}</span>
                </div>
              </div>

              {scan.status === 'complete' && (
                <div className="history-card-stats">
                  <div className="stat pass">
                    <span className="stat-count">{scan.passed || 0}</span>
                    <span className="stat-label">Pass</span>
                  </div>
                  <div className="stat fail">
                    <span className="stat-count">{scan.failed || 0}</span>
                    <span className="stat-label">Fail</span>
                  </div>
                  <div className="stat warn">
                    <span className="stat-count">{scan.warnings || 0}</span>
                    <span className="stat-label">Warn</span>
                  </div>
                  <div className="stat total">
                    <span className="stat-count">{scan.totalTests || 12}</span>
                    <span className="stat-label">Total</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
