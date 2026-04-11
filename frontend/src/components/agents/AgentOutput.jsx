import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

const AGENT_TAB_CLASSES = {
  Explorer: 'explorer',
  Tester: 'tester',
  Guardian: 'guardian',
};

function downloadFile(content, filename, type = 'application/json') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ════════════════════════════════════════════
   Explorer Output: Endpoints + Schema Tree + Data Flow
   ════════════════════════════════════════════ */
function SchemaNode({ name, type, depth = 0 }) {
  const [isOpen, setIsOpen] = useState(true);
  const isObject = typeof type === 'object' && type !== null && !Array.isArray(type);

  return (
    <div className="schema-node" style={{ paddingLeft: `${depth * 16}px` }}>
      <div 
        className={`schema-node-header ${isObject ? 'clickable' : ''}`}
        onClick={() => isObject && setIsOpen(!isOpen)}
        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}
      >
        {isObject ? (
          <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{isOpen ? '▼' : '▶'}</span>
        ) : (
          <span style={{ width: '10px' }} />
        )}
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-primary)' }}>{name}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: typeof type === 'string' && type.includes('sensitive') ? 'var(--agent-guardian)' : 'var(--text-muted)' }}>
          {isObject ? 'Object' : String(type)}
        </span>
      </div>
      {isObject && isOpen && (
        <div className="schema-node-children" style={{ borderLeft: '1px solid var(--border-color)', marginLeft: '4px' }}>
          {Object.entries(type).map(([key, val]) => (
            <SchemaNode key={key} name={key} type={val} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function DataFlowGraph({ graph }) {
  if (!graph || !graph.nodes || graph.nodes.length === 0) return null;

  return (
    <div className="output-section">
      <h5>Data Flow Graph</h5>
      <div className="data-flow-container">
        <div className="data-flow-nodes">
          {graph.nodes.map((node, i) => (
            <div key={i} className="flow-node">{node}</div>
          ))}
        </div>
        {graph.edges && graph.edges.length > 0 && (
          <div className="data-flow-edges">
            {graph.edges.map((edge, i) => (
              <div key={i} className="flow-edge">
                <span className="flow-from">{edge.from}</span>
                <span className="flow-arrow">→ <em>{edge.relation}</em> →</span>
                <span className="flow-to">{edge.to}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ExplorerOutput({ data }) {
  if (!data || data.parseError) return <RawOutput data={data} />;

  const endpoints = data.importantEndpoints || [];
  const schemaTree = data.schemaTree || {};
  const dataFlowGraph = data.dataFlowGraph;
  const criticalEndpoints = data.criticalEndpoints || [];

  return (
    <div className="fade-in-up">
      <div className="output-section">
        <h5>Important Endpoints ({endpoints.length})</h5>
        <table className="output-table">
          <thead>
            <tr>
              <th>Method</th>
              <th>Path</th>
              <th>Risk</th>
              <th>Auth</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {endpoints.map((ep, i) => (
              <tr key={i}>
                <td><span className={`method-badge ${ep.method}`}>{ep.method}</span></td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>{ep.path}</td>
                <td><span className={`severity-badge ${ep.riskLevel || 'low'}`}>{ep.riskLevel || 'low'}</span></td>
                <td>{ep.authRequired ? '🔒 Yes' : '🔓 No'}</td>
                <td style={{ fontSize: '0.8125rem' }}>{ep.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {criticalEndpoints.length > 0 && (
        <div className="output-section">
          <h5>⚠️ Critical Endpoints ({criticalEndpoints.length})</h5>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {criticalEndpoints.map((ep, i) => (
              <span key={i} className="critical-endpoint-tag">{ep}</span>
            ))}
          </div>
        </div>
      )}

      <div className="output-section">
        <h5>Schema Tree</h5>
        <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          {Object.keys(schemaTree).length === 0 ? (
            <span style={{color: 'var(--text-muted)'}}>No schema data found.</span>
          ) : (
            Object.entries(schemaTree).map(([model, fields]) => (
              <SchemaNode key={model} name={model} type={fields} />
            ))
          )}
        </div>
      </div>

      <DataFlowGraph graph={dataFlowGraph} />

      {data.summary && (
        <div className="output-section">
          <h5>Summary</h5>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{data.summary}</p>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════
   Tester Output: 12 Security Categories
   ════════════════════════════════════════════ */
function TesterOutput({ data }) {
  if (!data || data.parseError) return <RawOutput data={data} />;

  const tests = data.tests || [];
  const [expandedTests, setExpandedTests] = useState(new Set());

  const toggleTest = (id) => {
    setExpandedTests(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const statusIcon = (status) => {
    if (status === 'FAIL') return '✗';
    if (status === 'WARN') return '!';
    return '✓';
  };

  return (
    <div className="fade-in-up">
      <div className="output-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h5>Security Tests ({tests.length}/12)</h5>
          <div style={{ display: 'flex', gap: '4px', fontSize: '0.75rem' }}>
            <span className="mini-badge pass">{tests.filter(t => t.status === 'PASS').length} Pass</span>
            <span className="mini-badge fail">{tests.filter(t => t.status === 'FAIL').length} Fail</span>
            <span className="mini-badge warn">{tests.filter(t => t.status === 'WARN').length} Warn</span>
          </div>
        </div>

        {data.overallRisk && (
          <div className="overall-risk-bar" style={{ marginBottom: '16px' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Overall Risk: </span>
            <span className={`severity-badge ${data.overallRisk}`}>{data.overallRisk}</span>
          </div>
        )}

        <div style={{ display: 'grid', gap: '8px' }}>
          {tests.map((test) => {
            const isExpanded = expandedTests.has(test.id);
            return (
              <div key={test.id} className={`test-card ${test.status?.toLowerCase()}`}>
                <div className="test-card-header" onClick={() => toggleTest(test.id)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="test-expand-icon">{isExpanded ? '▼' : '▶'}</span>
                    <span className={`test-status-icon ${test.status?.toLowerCase()}`}>{statusIcon(test.status)}</span>
                    <span style={{ fontSize: '0.9375rem', fontWeight: 600 }}>{test.testName}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span className={`severity-badge ${test.severity}`}>{test.severity}</span>
                    <span className={`verdict-badge ${test.status?.toLowerCase()}`}>{test.status}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="test-card-body fade-in-up">
                    {test.checks && (
                      <div className="test-checks">
                        <strong>Checks:</strong> {test.checks.join(', ')}
                      </div>
                    )}
                    <div className="test-findings">{test.findings}</div>

                    {test.evidence && (
                      <div className="test-evidence-block">
                        <div className="evidence-row">
                          <span className="evidence-key">Payload:</span>
                          <code className="evidence-val">{test.evidence.payload}</code>
                        </div>
                        <div className="evidence-row">
                          <span className="evidence-key">Request:</span>
                          <pre className="evidence-pre">{test.evidence.request}</pre>
                        </div>
                        <div className="evidence-row">
                          <span className="evidence-key">Response:</span>
                          <pre className="evidence-pre">{test.evidence.response}</pre>
                        </div>
                        <div className="evidence-row">
                          <span className="evidence-key">Expected:</span>
                          <span className="evidence-val expected">{test.evidence.expected}</span>
                        </div>
                        <div className="evidence-row">
                          <span className="evidence-key">Actual:</span>
                          <span className={`evidence-val actual ${test.evidence.anomalyDetected ? 'anomaly' : ''}`}>{test.evidence.actual}</span>
                        </div>
                      </div>
                    )}

                    {test.affectedEndpoints && test.affectedEndpoints.length > 0 && (
                      <div className="test-affected">
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Affected: </span>
                        {test.affectedEndpoints.map((ep, i) => (
                          <code key={i} className="affected-endpoint">{ep}</code>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {data.summary && (
        <div className="output-section">
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{data.summary}</p>
        </div>
      )}

      <button className="export-btn" onClick={() => downloadFile(JSON.stringify(data, null, 2), 'security-tests.json')}>
        📥 Export Tests (JSON)
      </button>
    </div>
  );
}

/* ════════════════════════════════════════════
   Guardian Output: Elaborated Proof + Evidence
   ════════════════════════════════════════════ */
function GuardianOutput({ data }) {
  if (!data || data.parseError) return <RawOutput data={data} />;

  const score = data.securityScore || 0;
  const results = data.results || [];
  const scoreColor = score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : score >= 40 ? '#F97316' : '#EF4444';
  const circumference = 2 * Math.PI * 52;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="fade-in-up">
      <div className="output-section" style={{ textAlign: 'center' }}>
        <div className="security-score-ring">
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="var(--border-color)" strokeWidth="8" />
            <circle cx="60" cy="60" r="52" fill="none" stroke={scoreColor} strokeWidth="8"
              strokeDasharray={`${circumference}`} strokeDashoffset={offset}
              strokeLinecap="round" transform="rotate(-90 60 60)"
              style={{ transition: 'stroke-dashoffset 1s ease' }}
            />
          </svg>
          <div className="security-score-value" style={{ color: scoreColor }}>{score}</div>
        </div>
        <div className="security-score-label">Security Score ({score}/100)</div>
      </div>

      {data.executiveSummary && (
        <div className="output-section">
          <h5>Executive Summary</h5>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{data.executiveSummary}</p>
        </div>
      )}

      {data.criticalActions && data.criticalActions.length > 0 && (
        <div className="output-section">
          <h5>🚨 Critical Actions</h5>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {data.criticalActions.map((action, i) => (
              <div key={i} className="critical-action-item">
                <span className="action-priority">{i + 1}</span>
                <span style={{ fontSize: '0.8125rem' }}>{action}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="output-section">
        <h5>Elaborated Results ({results.length})</h5>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {results.map((res, i) => (
            <div key={i}>
              <h6 style={{ marginBottom: '12px', fontSize: '1.1rem', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span className={`test-status-icon ${(res.verdict || 'pass').toLowerCase()}`}>
                  {res.verdict === 'FAIL' ? '✗' : res.verdict === 'WARN' ? '!' : '✓'}
                </span>
                {res.testName}
                <span className={`severity-badge ${res.severity || 'none'}`}>{res.severity}</span>
                <span className={`verdict-badge ${(res.verdict || 'pass').toLowerCase()}`}>{res.verdict}</span>
              </h6>

              {/* Pass evidence */}
              {res.verdict === 'PASS' && (res.passEvidence || res.note) && (
                <div className="pass-evidence-card">
                  <div className="evidence-label">✅ Pass Evidence</div>
                  <p>{res.passEvidence || res.note}</p>
                </div>
              )}

              {/* Fail/Warn findings */}
              {res.findings && res.findings.map((finding, fi) => (
                <div key={fi} className="finding-card" style={{ borderLeft: '4px solid var(--agent-guardian)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <strong style={{ fontSize: '0.9rem' }}>{finding.issue}</strong>
                    {finding.cwe && (
                      <span className="cwe-badge">{finding.cwe}</span>
                    )}
                  </div>

                  {finding.endpoint && (
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                      Target: <span>{finding.endpoint}</span>
                    </div>
                  )}

                  {finding.explanation && (
                    <div style={{ marginBottom: '12px' }}>
                      <div className="proof-label">📝 Explanation</div>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{finding.explanation}</p>
                    </div>
                  )}
                  
                  {finding.proof && (
                    <div style={{ marginBottom: '12px' }}>
                      <div className="proof-label">🔍 Proof of Concept</div>
                      <div className="code-snippet-block" style={{ margin: 0, background: '#111827', border: '1px solid #374151' }}>
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{finding.proof}</pre>
                      </div>
                    </div>
                  )}

                  {finding.businessImpact && (
                    <div style={{ marginBottom: '12px' }}>
                      <div className="proof-label">💼 Business Impact</div>
                      <p style={{ fontSize: '0.8125rem', color: '#F59E0B', lineHeight: 1.6 }}>{finding.businessImpact}</p>
                    </div>
                  )}

                  {finding.remediation && (
                    <div>
                      <div className="proof-label" style={{ color: 'var(--agent-tester)' }}>🔧 Remediation</div>
                      <div className="code-snippet-block" style={{ margin: 0, background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                        <ReactMarkdown>{finding.remediation}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {(!res.findings || res.findings.length === 0) && !res.passEvidence && !res.note && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No detailed findings available.</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {data.complianceNotes && (
        <div className="output-section">
          <h5>📋 OWASP Compliance</h5>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>{data.complianceNotes}</p>
        </div>
      )}

      <button className="export-btn" onClick={() => downloadFile(JSON.stringify(data, null, 2), 'guardian-report.json')}>
        📥 Export Full Report
      </button>
    </div>
  );
}

/* ════════════════════════════════════════════
   Raw / Fallback
   ════════════════════════════════════════════ */
function RawOutput({ data }) {
  if (!data) return null;
  return (
    <div className="output-section">
      <h5>Raw Output</h5>
      <div className="code-snippet-block">{typeof data === 'string' ? data : JSON.stringify(data, null, 2)}</div>
    </div>
  );
}

/* ════════════════════════════════════════════
   Main AgentOutput Component
   ════════════════════════════════════════════ */
export default function AgentOutput({ agentOutputs, activeOutput, onSelectAgent }) {
  const activeAgents = Object.keys(agentOutputs).filter((k) => agentOutputs[k] !== null);

  const renderOutput = () => {
    if (!activeOutput || !agentOutputs[activeOutput]) {
      return (
        <div className="agent-output-placeholder">
          <div className="placeholder-icon">📋</div>
          <p>Select an agent to view its output</p>
        </div>
      );
    }

    const data = agentOutputs[activeOutput];

    if (data.status === 'running') {
      return (
        <div className="agent-output-placeholder">
          <div className="spinner" style={{ fontSize: '2rem', marginBottom: '16px' }}>⟳</div>
          <p>{activeOutput} is thinking...</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>This may take 10-30 seconds</p>
        </div>
      );
    }

    if (data.status === 'error') {
      return (
        <div className="agent-output-placeholder" style={{ color: 'var(--agent-guardian)' }}>
          <div className="placeholder-icon">⚠️</div>
          <h5>{activeOutput} Failed</h5>
          <p style={{ maxWidth: '300px', textAlign: 'center' }}>{data.error}</p>
          {data.error?.includes('ANTHROPIC_API_KEY') && (
            <div style={{ marginTop: '20px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem' }}>
              <strong>Fix:</strong> Add your Anthropic API key to <code>backend/.env</code> and restart the server.
            </div>
          )}
        </div>
      );
    }

    switch (activeOutput) {
      case 'Explorer': return <ExplorerOutput data={data} />;
      case 'Tester': return <TesterOutput data={data} />;
      case 'Guardian': return <GuardianOutput data={data} />;
      default: return <RawOutput data={data} />;
    }
  };

  return (
    <div className="agent-output">
      <div className="agent-output-tabs">
        {['Explorer', 'Tester', 'Guardian'].map((name) => (
          <button
            key={name}
            className={`agent-output-tab ${AGENT_TAB_CLASSES[name]} ${activeOutput === name ? 'active' : ''}`}
            onClick={() => onSelectAgent(name)}
            disabled={!activeAgents.includes(name)}
            style={{ opacity: activeAgents.includes(name) ? 1 : 0.3 }}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="agent-output-body">
        {renderOutput()}
      </div>
    </div>
  );
}
