import { useEffect, useRef } from 'react';

const AGENT_CLASSES = {
  Explorer: 'explorer',
  Tester: 'tester',
  Documenter: 'documenter',
  Guardian: 'guardian',
  Reporter: 'reporter',
};

export default function AgentChat({ logs, onClear }) {
  const bodyRef = useRef(null);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="agent-chat">
      <div className="agent-chat-header">
        <h4>Agent Activity Log</h4>
        <button className="clear-log-btn" onClick={onClear}>
          Clear Log
        </button>
      </div>
      <div className="agent-chat-body" ref={bodyRef}>
        {logs.length === 0 && (
          <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.8125rem' }}>
            Waiting for pipeline to start...
          </div>
        )}
        {logs.map((log, idx) => (
          <div key={idx} className={`chat-log-entry ${log.type || ''}`}>
            <span className="chat-log-time">{log.time}</span>
            <span className={`chat-log-agent ${AGENT_CLASSES[log.agent] || ''}`}>
              {log.emoji || '🤖'} {log.agent}
            </span>
            <span className="chat-log-message">{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
