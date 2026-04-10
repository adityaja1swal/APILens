const AGENTS = [
  { name: 'Explorer', emoji: '🔍', color: '#3B82F6', description: 'Discovers important endpoints and schema tree' },
  { name: 'Tester', emoji: '🧪', color: '#10B981', description: 'Runs 9 comprehensive security tests' },
  { name: 'Guardian', emoji: '🛡️', color: '#EF4444', description: 'Provides elaborated test results with proof' },
];

const AGENT_DEPENDENCIES = {
  Explorer: [],
  Tester: ['Explorer'],
  Guardian: ['Explorer', 'Tester'],
};

export default function TeamSelector({ selectedAgents, onToggle, onSelectAll, onClearAll, disabled }) {
  const isDepMissing = (agentName) => {
    const deps = AGENT_DEPENDENCIES[agentName] || [];
    return deps.some((dep) => !selectedAgents.includes(dep));
  };

  const pipelinePreview = AGENTS
    .filter((a) => selectedAgents.includes(a.name))
    .map((a) => a.name);

  return (
    <div className="team-selector">
      <div className="team-selector-header">
        <h3>Select Agents</h3>
        <div className="team-selector-actions">
          <button onClick={onSelectAll} disabled={disabled}>Select All</button>
          <button onClick={onClearAll} disabled={disabled}>Clear All</button>
        </div>
      </div>

      <div className="agent-toggle-row">
        {AGENTS.map((agent) => {
          const isSelected = selectedAgents.includes(agent.name);
          const depMissing = isDepMissing(agent.name);
          const isDisabled = disabled || (depMissing && !isSelected);

          return (
            <div
              key={agent.name}
              className={`agent-toggle-card ${isSelected ? 'selected' : ''} ${agent.name.toLowerCase()} ${isDisabled ? 'disabled' : ''}`}
              onClick={() => !isDisabled && onToggle(agent.name)}
            >
              <div className="agent-toggle-top">
                <span className="agent-toggle-icon">{agent.emoji}</span>
                <div className="agent-toggle-checkbox" />
              </div>
              <div className="agent-toggle-name">{agent.name}</div>
              <div className="agent-toggle-desc">{agent.description}</div>
              {depMissing && !isSelected && (
                <div style={{ fontSize: '0.6875rem', color: 'var(--agent-guardian)', marginTop: '6px' }}>
                  Requires: {AGENT_DEPENDENCIES[agent.name].join(', ')}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {pipelinePreview.length > 0 && (
        <div className="pipeline-preview">
          Pipeline: <span>{pipelinePreview.join(' → ')}</span>
        </div>
      )}
    </div>
  );
}
