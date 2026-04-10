export default function AgentCard({ agent, status, output, onClick }) {
  const agentMeta = {
    Explorer: { emoji: '🔍', color: '#3B82F6', role: 'Endpoint Discovery' },
    Tester: { emoji: '🧪', color: '#10B981', role: 'Test Generation' },
    Documenter: { emoji: '📝', color: '#8B5CF6', role: 'Documentation' },
    Guardian: { emoji: '🛡️', color: '#EF4444', role: 'Security Audit' },
    Reporter: { emoji: '📊', color: '#F59E0B', role: 'Executive Report' },
  };

  const meta = agentMeta[agent] || { emoji: '🤖', color: '#8B5CF6', role: 'Agent' };

  const getPreview = () => {
    if (!output) return null;
    if (output.summary) return output.summary.substring(0, 50) + '...';
    if (output.executiveSummary) return output.executiveSummary.substring(0, 50) + '...';
    return 'Output available';
  };

  return (
    <div className={`agent-toggle-card selected ${agent.toLowerCase()}`} onClick={onClick}>
      <div className="agent-toggle-top">
        <span className="agent-toggle-icon">{meta.emoji}</span>
        <span className={`severity-badge ${status}`}>{status}</span>
      </div>
      <div className="agent-toggle-name">{agent}</div>
      <div className="agent-toggle-desc">{meta.role}</div>
      {getPreview() && (
        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '8px', fontStyle: 'italic' }}>
          {getPreview()}
        </div>
      )}
    </div>
  );
}
