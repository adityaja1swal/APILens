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
   Explorer Output: Endpoints + Schema Tree
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

function ExplorerOutput({ data }) {
  if (!data || data.parseError) return <RawOutput data={data} />;

  const endpoints = data.importantEndpoints || [];
  const schemaTree = data.schemaTree || {};

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
   Tester Output: 9 Security Categories
   ════════════════════════════════════════════ */
function TesterOutput({ data }) {
  if (!data || data.parseError) return <RawOutput data={data} />;

  const tests = data.tests || [];
  return (
    <div className="fade-in-up">
      <div className="output-section">
        <h5>Security Tests ({tests.length}/9)</h5>
        <div style={{ display: 'grid', gap: '12px' }}>
          {tests.map((test) => (
            <div key={test.id} style={{
              background: 'var(--bg-secondary)',
              border: `1px solid ${test.status === 'FAIL' ? 'var(--agent-guardian)' : test.status === 'WARN' ? 'var(--agent-reporter)' : 'var(--agent-tester)'}`,
              borderRadius: 'var(--radius-md)',
              padding: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div style={{ fontSize: '1rem', fontWeight: 600 }}>{test.testName}</div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span className={`severity-badge ${test.severity}`}>{test.severity}</span>
                  <span style={{
                    padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700,
                    background: test.status === 'FAIL' ? 'rgba(239, 68, 68, 0.2)' : test.status === 'WARN' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                    color: test.status === 'FAIL' ? '#fca5a5' : test.status === 'WARN' ? '#fcd34d' : '#6ee7b7'
                  }}>{test.status}</span>
                </div>
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                <strong>Checks:</strong> {test.checks.join(', ')}
              </div>
              <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', fontSize: '0.8125rem' }}>
                {test.findings}
              </div>
              {test.affectedEndpoints && test.affectedEndpoints.length > 0 && (
                <div style={{ marginTop: '12px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Affected:</span> {test.affectedEndpoints.join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <button className="export-btn" onClick={() => downloadFile(JSON.stringify(data, null, 2), 'security-tests.json')}>
        📥 Export Tests (JSON)
      </button>
    </div>
  );
}

/* ════════════════════════════════════════════
   Guardian Output: Elaborated Proof
   ════════════════════════════════════════════ */
function GuardianOutput({ data }) {
  if (!data || data.parseError) return <RawOutput data={data} />;

  const score = data.securityScore || 0;
  const results = data.results || [];
  const scoreColor = score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : '#EF4444';

  return (
    <div className="fade-in-up">
      <div className="output-section" style={{ textAlign: 'center' }}>
        <div className="security-score-ring">
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="var(--border-color)" strokeWidth="8" />
            <circle
              cx="60" cy="60" r="52" fill="none"
              stroke={scoreColor}
              strokeWidth="8"
              strokeDasharray={`${(score / 100) * 327} 327`}
              strokeLinecap="round"
            />
          </svg>
          <div className="security-score-value" style={{ color: scoreColor }}>{score}</div>
        </div>
        <div className="security-score-label">Final Security Score</div>
      </div>

      {data.executiveSummary && (
        <div className="output-section">
          <h5>Executive Summary</h5>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{data.executiveSummary}</p>
        </div>
      )}

      <div className="output-section">
        <h5>Elaborated Results ({results.length})</h5>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {results.map((res, i) => (
            <div key={i}>
              <h6 style={{ marginBottom: '12px', fontSize: '1.1rem', display: 'flex', gap: '8px', alignItems: 'center' }}>
                {res.testName}
                <span className={`severity-badge ${res.severity || 'none'}`}>{res.severity}</span>
                <span style={{ fontSize: '0.8rem', color: res.verdict === 'FAIL' ? '#fca5a5' : '#6ee7b7' }}>[{res.verdict}]</span>
              </h6>
              {res.findings && res.findings.map((finding, fi) => (
                <div key={fi} style={{ background: 'var(--bg-secondary)', borderLeft: '4px solid var(--agent-guardian)', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <strong style={{ fontSize: '0.9rem' }}>{finding.issue}</strong>
                    {finding.cwe && (
                      <span style={{ background: '#374151', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                        {finding.cwe}
                      </span>
                    )}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                    Target: <span>{finding.endpoint}</span>
                  </div>
                  
                  {finding.proof && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>Proof of Concept</div>
                      <div className="code-snippet-block" style={{ margin: 0, background: '#111827', border: '1px solid #374151' }}>
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{finding.proof}</pre>
                      </div>
                    </div>
                  )}

                  {finding.remediation && (
                    <div>
                      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--agent-tester)', marginBottom: '4px', fontWeight: 600 }}>Remediation</div>
                      <div className="code-snippet-block" style={{ margin: 0, background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                        <ReactMarkdown>{finding.remediation}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {(!res.findings || res.findings.length === 0) && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{res.note}</p>
              )}
            </div>
          ))}
        </div>
      </div>

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
