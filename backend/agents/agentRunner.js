const explorerAgent = require("./explorerAgent");
const testerAgent = require("./testerAgent");
const guardianAgent = require("./guardianAgent");

const ALL_AGENTS = [
  explorerAgent,
  testerAgent,
  guardianAgent,
];

class AgentPipeline {
  constructor(io) {
    this.io = io;
    this.results = new Map(); // sessionId → context
  }

  resolveAgents(selected) {
    if (selected === "all" || !selected || selected.length === 0) {
      return ALL_AGENTS;
    }
    return ALL_AGENTS.filter((a) =>
      selected.includes(a.name)
    );
  }

  async run(inputData, selectedAgents, sessionId) {
    const context = { input: inputData };
    const agents = this.resolveAgents(selectedAgents);
    const startTime = Date.now();

    // Small delay to ensure client has joined the room after session ID is returned from REST
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Emit pipeline start
    console.log(`[Pipeline] Session ${sessionId} starting...`);
    this.io.to(sessionId).emit("pipeline:start", {
      agents: agents.map((a) => a.name),
      timestamp: new Date().toISOString(),
    });

    for (const agent of agents) {
      const agentStart = Date.now();

      // Emit status: "running"
      this.io.to(sessionId).emit("agent:status", {
        agent: agent.name,
        emoji: agent.emoji,
        status: "running",
        message: `Starting ${agent.description}...`,
        timestamp: new Date().toISOString(),
      });

      try {
        const output = await agent.run(context);
        context[agent.name] = output;
        const duration = ((Date.now() - agentStart) / 1000).toFixed(1);

        // Emit status: "complete" + output
        this.io.to(sessionId).emit("agent:complete", {
          agent: agent.name,
          emoji: agent.emoji,
          status: "complete",
          output,
          duration: `${duration}s`,
          message: `${agent.name} completed successfully`,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        const duration = ((Date.now() - agentStart) / 1000).toFixed(1);

        this.io.to(sessionId).emit("agent:error", {
          agent: agent.name,
          emoji: agent.emoji,
          status: "error",
          error: err.message,
          duration: `${duration}s`,
          message: `${agent.name} failed: ${err.message}`,
          timestamp: new Date().toISOString(),
        });

        // Continue pipeline even on error
        context[agent.name] = {
          agentName: agent.name,
          status: "error",
          error: err.message,
        };
      }
    }

    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);

    // Emit pipeline complete
    this.io.to(sessionId).emit("pipeline:complete", {
      totalDuration: `${totalDuration}s`,
      timestamp: new Date().toISOString(),
    });

    // Store results
    this.results.set(sessionId, context);

    return context;
  }

  async runSingle(agentName, inputData, existingContext = {}) {
    const agent = ALL_AGENTS.find((a) => a.name === agentName);
    if (!agent) {
      throw new Error(`Agent '${agentName}' not found`);
    }
    const context = { ...existingContext, input: inputData };
    return agent.run(context);
  }

  getResult(sessionId) {
    return this.results.get(sessionId) || null;
  }
}

module.exports = AgentPipeline;
