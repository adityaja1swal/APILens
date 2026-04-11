import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

const API_BASE = 'http://localhost:5000';

function SecurityScoreRing({ score }) {
  const scoreColor = score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : score >= 40 ? '#F97316' : '#EF4444';
  const circumference = 2 * Math.PI * 52;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="security-score-ring">
      <svg width="140" height="140" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="52" fill="none" stroke="var(--border-color)" strokeWidth="8" />
        <circle
          cx="60" cy="60" r="52" fill="none"
          stroke={scoreColor}
          strokeWidth="8"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="security-score-value" style={{ color: scoreColor }}>{score}</div>
    </div>
  );
}

function RiskHeatmap({ results }) {
  if (!results || results.length === 0) return null;

  const severityOrder = { critical: 4, high: 3, medium: 2, low: 1, none: 0 };
  const severityColors = {
    critical: '#EF4444',
    high: '#F97316',
    medium: '#F59E0B',
    low: '#3B82F6',
    none: '#10B981',
  };

  return (
    <div className="risk-heatmap">
      <h5>Risk Heatmap</h5>
      <div className="heatmap-grid">
        {results.map((r, i) => (
          <div
            key={i}
            className={`heatmap-cell ${r.verdict?.toLowerCase() || 'pass'}`}
            style={{
              background: `${severityColors[r.severity] || severityColors.none}20`,
              borderLeft: `3px solid ${severityColors[r.severity] || severityColors.none}`,
            }}
            title={`${r.testName}: ${r.verdict} (${r.severity})`}
          >
            <span className="heatmap-id">T{r.testId}</span>
            <span className="heatmap-status">{r.verdict === 'FAIL' ? '✗' : r.verdict === 'WARN' ? '!' : '✓'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function downloadFile(content, filename, type = 'application/json') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportPage() {
  const { scanId } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [scan, setScan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedTests, setExpandedTests] = useState(new Set());

  useEffect(() => {
    fetchReport();
  }, [scanId]);

  const fetchReport = async () => {
    try {
      setLoading(true);

      // Try to get the scan data
      const scanRes = await fetch(`${API_BASE}/api/scan/${scanId}`);
      if (scanRes.ok) {
        const scanData = await scanRes.json();
        setScan(scanData);

        // Use guardian output as report data
        if (scanData.guardianOutput) {
          setReport(scanData.guardianOutput);
        }
      }

      // Also try dedicated report endpoint
      try {
        const reportRes = await fetch(`${API_BASE}/api/report/${scanId}`);
        if (reportRes.ok) {
          const reportData = await reportRes.json();
          if (reportData.testResults || reportData.results) {
            setReport(reportData);
          }
        }
      } catch { /* ignore */ }
    } catch (err) {
      console.error('Error fetching report:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleTest = (testId) => {
    setExpandedTests(prev => {
      const next = new Set(prev);
      if (next.has(testId)) next.delete(testId);
      else next.add(testId);
      return next;
    });
  };

  const expandAll = () => {
    const allIds = (report?.results || report?.testResults || []).map(r => r.testId);
    setExpandedTests(new Set(allIds));
  };

  const collapseAll = () => setExpandedTests(new Set());

  if (loading) {
    return (
      <div className="report-page fade-in-up">
        <div className="report-loading">
          <div className="spinner" style={{ fontSize: '2rem' }}>⟳</div>
          <p>Loading report...</p>
        </div>
      </div>
    );
  }

  if (!report && !scan) {
    return (
      <div className="report-page fade-in-up">
        <div className="report-empty">
          <div className="placeholder-icon">📄</div>
          <h3>Report not found</h3>
          <p>This scan may still be running or the ID is invalid.</p>
          <button className="back-btn" onClick={() => navigate('/history')}>← Back to History</button>
        </div>
      </div>
    );
  }

  const results = report?.results || report?.testResults || [];
  const score = report?.securityScore || scan?.securityScore || 0;
  const apiName = report?.apiName || scan?.apiName || 'Unknown API';
  const executiveSummary = report?.executiveSummary || '';
  const criticalActions = report?.criticalActions || [];
  const complianceNotes = report?.complianceNotes || '';

  const passed = results.filter(r => (r.verdict || r.status) === 'PASS').length;
  const failed = results.filter(r => (r.verdict || r.status) === 'FAIL').length;
  const warnings = results.filter(r => (r.verdict || r.status) === 'WARN').length;

  return (
    <div className="report-page fade-in-up">
      {/* Header */}
      <div className="report-header">
        <div className="report-header-left">
          <button className="back-btn" onClick={() => navigate('/history')}>← Back</button>
          <div>
            <h2>🛡️ Security Report</h2>
            <p className="report-api-name">{apiName}</p>
          </div>
        </div>
        <div className="report-header-actions">
          <button className="export-btn" onClick={() => downloadFile(JSON.stringify(report || scan, null, 2), `apilens-report-${scanId}.json`)}>
            📥 Download JSON
          </button>
        </div>
      </div>

      {/* Score + Stats Overview */}
      <div className="report-overview">
        <div className="report-score-card">
          <SecurityScoreRing score={score} />
          <div className="security-score-label">Security Score</div>
        </div>

        <div className="report-stats-card">
          <div className="report-stat pass-stat">
            <div className="stat-number">{passed}</div>
            <div className="stat-label">Passed</div>
          </div>
          <div className="report-stat fail-stat">
            <div className="stat-number">{failed}</div>
            <div className="stat-label">Failed</div>
          </div>
          <div className="report-stat warn-stat">
            <div className="stat-number">{warnings}</div>
            <div className="stat-label">Warnings</div>
          </div>
          <div className="report-stat total-stat">
            <div className="stat-number">{results.length}</div>
            <div className="stat-label">Total Tests</div>
          </div>
        </div>

        <RiskHeatmap results={results} />
      </div>

      {/* Executive Summary */}
      {executiveSummary && (
        <div className="report-section">
          <h3>📊 Executive Summary</h3>
          <p className="executive-summary-text">{executiveSummary}</p>
        </div>
      )}

      {/* Critical Actions */}
      {criticalActions.length > 0 && (
        <div className="report-section critical-actions-section">
          <h3>🚨 Critical Actions Required</h3>
          <div className="critical-actions-list">
            {criticalActions.map((action, i) => (
              <div key={i} className="critical-action-item">
                <span className="action-priority">{i + 1}</span>
                <span>{action}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test Results */}
      <div className="report-section">
        <div className="report-section-header">
          <h3>🧪 Test Results ({results.length})</h3>
          <div className="report-section-actions">
            <button onClick={expandAll}>Expand All</button>
            <button onClick={collapseAll}>Collapse All</button>
          </div>
        </div>

        <div className="test-results-list">
          {results.map((result, i) => {
            const verdict = result.verdict || result.status;
            const isExpanded = expandedTests.has(result.testId);
            const findings = result.findings || [];
            const isPass = verdict === 'PASS';

            return (
              <div
                key={result.testId || i}
                className={`test-result-card ${verdict?.toLowerCase()}`}
                id={`test-${result.testId}`}
              >
                <div className="test-result-header" onClick={() => toggleTest(result.testId)}>
                  <div className="test-result-left">
                    <span className="test-expand-icon">{isExpanded ? '▼' : '▶'}</span>
                    <span className="test-id">T{result.testId}</span>
                    <span className="test-name">{result.testName}</span>
                  </div>
                  <div className="test-result-right">
                    <span className={`severity-badge ${result.severity || 'none'}`}>{result.severity || 'none'}</span>
                    <span className={`verdict-badge ${verdict?.toLowerCase()}`}>{verdict}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="test-result-body fade-in-up">
                    {/* Pass evidence */}
                    {isPass && (result.passEvidence || result.note || result.proof) && (
                      <div className="test-evidence pass-evidence">
                        <div className="evidence-label">✅ Evidence (PASS)</div>
                        <div className="evidence-content">{result.passEvidence || result.note || result.proof}</div>
                      </div>
                    )}

                    {/* Pass explanation from report format */}
                    {isPass && result.explanation && (
                      <div className="test-evidence pass-evidence">
                        <div className="evidence-label">📝 Explanation</div>
                        <div className="evidence-content">{result.explanation}</div>
                      </div>
                    )}

                    {/* Fail/Warn findings */}
                    {findings.map((finding, fi) => (
                      <div key={fi} className="finding-card">
                        <div className="finding-header">
                          <strong>{finding.issue}</strong>
                          {finding.cwe && (
                            <span className="cwe-badge">{finding.cwe}</span>
                          )}
                        </div>

                        {finding.endpoint && (
                          <div className="finding-endpoint">
                            Target: <code>{finding.endpoint}</code>
                          </div>
                        )}

                        {finding.proof && (
                          <div className="finding-proof">
                            <div className="proof-label">🔍 Proof of Concept</div>
                            <pre className="proof-content">{finding.proof}</pre>
                          </div>
                        )}

                        {finding.explanation && (
                          <div className="finding-explanation">
                            <div className="proof-label">📝 Explanation</div>
                            <div className="explanation-content">{finding.explanation}</div>
                          </div>
                        )}

                        {finding.businessImpact && (
                          <div className="finding-impact">
                            <div className="proof-label">💼 Business Impact</div>
                            <div className="impact-content">{finding.businessImpact}</div>
                          </div>
                        )}

                        {finding.remediation && (
                          <div className="finding-remediation">
                            <div className="proof-label">🔧 Remediation</div>
                            <div className="remediation-content">
                              <ReactMarkdown>{finding.remediation}</ReactMarkdown>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Fix from report format */}
                    {result.fix && (result.fix.strategy || result.fix.code) && (
                      <div className="finding-remediation">
                        <div className="proof-label">🔧 Fix Strategy</div>
                        <div className="remediation-content">
                          <ReactMarkdown>{result.fix.strategy || result.fix.code}</ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Compliance Notes */}
      {complianceNotes && (
        <div className="report-section">
          <h3>📋 OWASP Compliance</h3>
          <div className="compliance-notes">{complianceNotes}</div>
        </div>
      )}
    </div>
  );
}
