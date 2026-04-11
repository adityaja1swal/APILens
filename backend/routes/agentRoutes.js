const express = require("express");
const { v4: uuidv4 } = require("uuid");
const auth = require("../middleware/auth");

function createAgentRoutes(pipeline) {
  const router = express.Router();

  // POST /api/agents/run — Start full pipeline
  router.post("/run", auth, async (req, res) => {
    try {
      const { input, agents } = req.body;

      if (!input) {
        return res.status(400).json({ error: "Missing 'input' field — provide a Swagger URL, JSON, or endpoint list" });
      }

      const sessionId = uuidv4();
      
      // Start pipeline asynchronously
      pipeline.run(input, agents || "all", sessionId).catch((err) => {
        console.error(`Pipeline error for session ${sessionId}:`, err);
      });

      res.json({
        sessionId,
        message: "Pipeline started. Connect via Socket.io for real-time updates.",
        agents: agents || "all",
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/agents/result/:sessionId — Get pipeline results
  router.get("/result/:sessionId", (req, res) => {
    const result = pipeline.getResult(req.params.sessionId);
    if (!result) {
      return res.status(404).json({ error: "Session not found or pipeline still running" });
    }
    res.json(result);
  });

  // POST /api/agents/run-single — Run single agent
  router.post("/run-single", auth, async (req, res) => {
    try {
      const { agentName, inputData, context } = req.body;

      if (!agentName || !inputData) {
        return res.status(400).json({ error: "Missing 'agentName' or 'inputData'" });
      }

      const output = await pipeline.runSingle(agentName, inputData, context || {});
      res.json({ agentName, output });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = createAgentRoutes;
