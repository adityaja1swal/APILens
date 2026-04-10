import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import TeamSelector from './TeamSelector';
import AgentPipeline from './AgentPipeline';
import AgentChat from './AgentChat';
import AgentOutput from './AgentOutput';

const API_BASE = 'http://localhost:5001';
const ALL_AGENTS = ['Explorer', 'Tester', 'Guardian'];

export default function AgentDashboard() {
  // Pipeline state
  const [pipelineStatus, setPipelineStatus] = useState('idle'); // idle | running | complete | error
  const [agentStatuses, setAgentStatuses] = useState({
    Explorer: 'idle', Tester: 'idle', Guardian: 'idle',
  });
  const [agentOutputs, setAgentOutputs] = useState({
    Explorer: null, Tester: null, Guardian: null,
  });
  const [selectedAgents, setSelectedAgents] = useState([...ALL_AGENTS]);
  const [activeOutput, setActiveOutput] = useState(null);
  const [logs, setLogs] = useState([]);

  // Input state
  const [inputMode, setInputMode] = useState('url'); // url | swagger | raw
  const [apiUrl, setApiUrl] = useState('');
  const [swaggerJson, setSwaggerJson] = useState('');

  // Socket ref
  const socketRef = useRef(null);

  // (Removed team results loading logic)

  const addLog = useCallback((agent, emoji, message, type = '') => {
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs((prev) => [...prev, { time, agent, emoji, message, type }]);
  }, []);

  const getSummaryFromOutput = (agent, output) => {
    if (!output) return '';
    switch (agent) {
      case 'Explorer':
        return `Found ${output.importantEndpoints?.length || 0} important endpoints`;
      case 'Tester':
        return output.summary || 'Tests completed';
      case 'Guardian':
        return `Security score: ${output.securityScore || '?'}/100, ${output.totalIssues || 0} issues`;
      default:
        return 'Done';
    }
  };

  const connectSocket = useCallback((sessionId) => {
    // If socket exists but is not connected, this will help.
    // If it's already connected, we just join the new room.
    if (!socketRef.current) {
      const socket = io(`${API_BASE}/agents`, {
        transports: ['websocket', 'polling'],
        reconnection: true,
      });
      socketRef.current = socket;
    }

    const socket = socketRef.current;

    // Remove old listeners to avoid duplicates if connectSocket is called again
    socket.off('connect');
    socket.off('pipeline:start');
    socket.off('agent:status');
    socket.off('agent:complete');
    socket.off('agent:error');
    socket.off('pipeline:complete');
    socket.off('disconnect');

    socket.on('connect', () => {
      console.log('Socket connected, joining session:', sessionId);
      socket.emit('join', sessionId);
      addLog('System', '📡', 'Connected to agent pipeline', '');
    });

    socket.on('pipeline:start', ({ agents }) => {
      addLog('System', '🚀', `Pipeline started with agents: ${agents.join(', ')}`, '');
    });

    socket.on('agent:status', ({ agent, emoji, message }) => {
      setAgentStatuses((prev) => ({ ...prev, [agent]: 'running' }));
      setAgentOutputs((prev) => ({ ...prev, [agent]: { status: 'running' } }));
      
      // Auto-select the running agent if nothing is selected or if we're following the flow
      setActiveOutput((prev) => (!prev || agentStatuses[prev] === 'complete' ? agent : prev));
      
      addLog(agent, emoji, message || `Starting ${agent}...`, '');
    });

    socket.on('agent:complete', ({ agent, emoji, output, duration }) => {
      setAgentStatuses((prev) => ({ ...prev, [agent]: 'complete' }));
      setAgentOutputs((prev) => ({ ...prev, [agent]: output }));

      // Auto-select first completed agent output
      setActiveOutput((prev) => prev || agent);

      const summary = getSummaryFromOutput(agent, output);
      addLog(agent, emoji, `${agent} completed in ${duration} — ${summary} ✅`, 'complete');
    });

    socket.on('agent:error', ({ agent, emoji, error }) => {
      setAgentStatuses((prev) => ({ ...prev, [agent]: 'error' }));
      setAgentOutputs((prev) => ({ ...prev, [agent]: { status: 'error', error } }));
      addLog(agent, emoji, `${agent} failed ❌ ${error}`, 'error');
    });

    socket.on('pipeline:complete', ({ totalDuration }) => {
      setPipelineStatus('complete');
      addLog('System', '🏁', `Pipeline completed in ${totalDuration}`, 'complete');
      // No longer saving to team here
    });

    socket.on('disconnect', () => {
      addLog('System', '🔌', 'Disconnected from pipeline', '');
    });

    // If already connected, join immediately
    if (socket.connected) {
      console.log('Socket already connected, joining session immediately:', sessionId);
      socket.emit('join', sessionId);
      addLog('System', '📡', 'Joined agent session', '');
    }

    return socket;
  }, [addLog]);

  // Connect on mount
  useEffect(() => {
    if (!socketRef.current) {
      const socket = io(`${API_BASE}/agents`, {
        transports: ['websocket', 'polling'],
      });
      socketRef.current = socket;
      
      socket.on('connect', () => {
        console.log('Initial socket connection established');
        addLog('System', '📡', 'Agent network online', '');
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [addLog]);

  const getInputData = () => {
    switch (inputMode) {
      case 'url':
        return apiUrl.trim();
      case 'swagger':
        try {
          return JSON.parse(swaggerJson);
        } catch {
          return swaggerJson;
        }
      case 'raw':
        return swaggerJson.trim();
      default:
        return apiUrl.trim();
    }
  };

  const handleRunPipeline = async () => {
    const inputData = getInputData();
    if (!inputData) return;

    // Reset state
    setPipelineStatus('running');
    setAgentStatuses({
      Explorer: 'idle', Tester: 'idle', Guardian: 'idle',
    });
    setAgentOutputs({
      Explorer: null, Tester: null, Guardian: null,
    });
    setActiveOutput(null);
    setLogs([]);

    addLog('System', '⚡', `Starting pipeline with ${selectedAgents.length} agents...`, '');

    try {
      const res = await fetch(`${API_BASE}/api/agents/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: inputData,
          agents: selectedAgents,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to start pipeline');
      }

      addLog('System', '🔗', `Session: ${data.sessionId}`, '');
      connectSocket(data.sessionId);
    } catch (err) {
      setPipelineStatus('error');
      addLog('System', '❌', `Error: ${err.message}`, 'error');
    }
  };

  const handleToggleAgent = (name) => {
    setSelectedAgents((prev) =>
      prev.includes(name) ? prev.filter((a) => a !== name) : [...prev, name]
    );
  };

  return (
    <div className="agent-dashboard fade-in-up">
      {/* Header */}
      <div className="agent-dashboard-header">
        <h2>🤖 Multi-Team Agent System</h2>
        <button
          className={`run-pipeline-btn ${pipelineStatus === 'running' ? 'running' : ''}`}
          onClick={handleRunPipeline}
          disabled={pipelineStatus === 'running' || selectedAgents.length === 0}
        >
          {pipelineStatus === 'running' ? (
            <><span className="spinner">⟳</span> Running Pipeline...</>
          ) : (
            <>▶ Run Pipeline</>
          )}
        </button>
      </div>

      {/* API Input */}
      <div className="api-input-section">
        <div className="input-tabs">
          <button className={`input-tab ${inputMode === 'url' ? 'active' : ''}`} onClick={() => setInputMode('url')}>
            🔗 Swagger URL
          </button>
          <button className={`input-tab ${inputMode === 'swagger' ? 'active' : ''}`} onClick={() => setInputMode('swagger')}>
            📋 Swagger JSON
          </button>
          <button className={`input-tab ${inputMode === 'raw' ? 'active' : ''}`} onClick={() => setInputMode('raw')}>
            📝 Raw Endpoints
          </button>
        </div>

        {inputMode === 'url' && (
          <input
            className="api-input"
            type="text"
            placeholder="https://petstore.swagger.io/v2/swagger.json"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
          />
        )}

        {(inputMode === 'swagger' || inputMode === 'raw') && (
          <textarea
            className="api-textarea"
            placeholder={inputMode === 'swagger' ? 'Paste Swagger/OpenAPI JSON here...' : 'List your API endpoints here (e.g. GET /users, POST /users, DELETE /users/:id)'}
            value={swaggerJson}
            onChange={(e) => setSwaggerJson(e.target.value)}
          />
        )}
      </div>

      {/* Team Selector */}
      <TeamSelector
        selectedAgents={selectedAgents}
        onToggle={handleToggleAgent}
        onSelectAll={() => setSelectedAgents([...ALL_AGENTS])}
        onClearAll={() => setSelectedAgents([])}
        disabled={pipelineStatus === 'running'}
      />

      {/* Pipeline Visualization */}
      <AgentPipeline
        agentStatuses={agentStatuses}
        activeOutput={activeOutput}
        onSelectAgent={setActiveOutput}
      />

      {/* Bottom panels: Chat + Output */}
      <div className="agent-bottom-panels">
        <AgentChat logs={logs} onClear={() => setLogs([])} />
        <AgentOutput
          agentOutputs={agentOutputs}
          activeOutput={activeOutput}
          onSelectAgent={setActiveOutput}
        />
      </div>
    </div>
  );
}
