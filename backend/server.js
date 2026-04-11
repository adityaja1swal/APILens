require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const { connectDB, getConnectionStatus } = require("./config/database");
const createAgentRoutes = require("./routes/agentRoutes");
const createScanRoutes = require("./routes/scanRoutes");
const createReportRoutes = require("./routes/reportRoutes");
const AgentPipeline = require("./agents/agentRunner");

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:3000", "http://localhost:5001"],
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Agent pipeline
const pipeline = new AgentPipeline(io);

// Routes
app.use("/api/agents", createAgentRoutes(pipeline));
app.use("/api/scan", createScanRoutes(pipeline));
app.use("/api/report", createReportRoutes());

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    database: getConnectionStatus(),
    mockMode: process.env.MOCK_MODE === "true",
  });
});

// Socket.io namespace for agents
const agentNamespace = io.of("/agents");
agentNamespace.on("connection", (socket) => {
  console.log(`Agent client connected: ${socket.id}`);

  socket.on("join", (sessionId) => {
    socket.join(sessionId);
    console.log(`Client ${socket.id} joined session: ${sessionId}`);
  });

  socket.on("disconnect", () => {
    console.log(`Agent client disconnected: ${socket.id}`);
  });
});

// Update pipeline to use namespaced io
pipeline.io = agentNamespace;

const PORT = process.env.PORT || 5000;

// Connect to MongoDB then start server
async function start() {
  await connectDB();

  server.listen(PORT, () => {
    console.log(`\n🚀 APILens server running on http://localhost:${PORT}`);
    console.log(`📡 Socket.io listening on /agents namespace`);
    console.log(`📦 MongoDB: ${getConnectionStatus().connected ? "connected ✅" : "not connected ⚠️"}`);
    console.log(`🔑 Anthropic API Key: ${process.env.ANTHROPIC_API_KEY ? "configured ✅" : "NOT SET ❌"}`);
    console.log(`🛠️  Mock Mode: ${process.env.MOCK_MODE === "true" ? "ON" : "OFF"}\n`);
  });
}

start();
