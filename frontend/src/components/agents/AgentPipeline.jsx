import { motion } from 'framer-motion';

const AGENTS = [
  { name: 'Explorer', emoji: '🔍', color: '#3B82F6' },
  { name: 'Tester', emoji: '🧪', color: '#10B981' },
  { name: 'Guardian', emoji: '🛡️', color: '#EF4444' },
];

export default function AgentPipeline({ agentStatuses, activeOutput, onSelectAgent }) {
  const getArrowClass = (idx) => {
    const current = AGENTS[idx];
    const next = AGENTS[idx + 1];
    if (!current || !next) return '';

    const curStatus = agentStatuses[current.name];
    const nextStatus = agentStatuses[next.name];

    if (curStatus === 'complete' && nextStatus === 'complete') return 'complete';
    if (curStatus === 'complete' && nextStatus === 'running') return 'flowing';
    if (curStatus === 'running') return 'active';
    return '';
  };

  return (
    <div className="agent-pipeline">
      {AGENTS.map((agent, idx) => {
        const status = agentStatuses[agent.name] || 'idle';
        const isActive = activeOutput === agent.name;

        return (
          <div key={agent.name} style={{ display: 'flex', alignItems: 'center' }}>
            <motion.div
              className={`pipeline-node ${status} ${isActive ? 'active' : ''}`}
              onClick={() => onSelectAgent(agent.name)}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                className="pipeline-node-circle"
                animate={
                  status === 'running'
                    ? { scale: [1, 1.05, 1], transition: { repeat: Infinity, duration: 1.5 } }
                    : status === 'complete'
                    ? { scale: [1, 1.15, 1], transition: { duration: 0.4 } }
                    : {}
                }
              >
                {agent.emoji}
                {status === 'complete' && (
                  <motion.div
                    className="pipeline-node-status"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500 }}
                  >
                    ✓
                  </motion.div>
                )}
                {status === 'error' && (
                  <motion.div
                    className="pipeline-node-status"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                  >
                    ✕
                  </motion.div>
                )}
              </motion.div>
              <span className="pipeline-node-label">{agent.name}</span>
            </motion.div>

            {idx < AGENTS.length - 1 && (
              <div className={`pipeline-arrow ${getArrowClass(idx)}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
