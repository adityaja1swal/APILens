const mongoose = require("mongoose");

const scanResultSchema = new mongoose.Schema({
  apiId: { type: mongoose.Schema.Types.ObjectId, ref: "Api" },
  apiName: { type: String, default: "Unknown API" },
  swaggerUrl: { type: String },
  status: {
    type: String,
    enum: ["queued", "running", "complete", "failed"],
    default: "queued"
  },
  config: {
    aggressive: { type: Boolean, default: false },
    testsToRun: { type: mongoose.Schema.Types.Mixed, default: "all" },
    timeout: { type: Number, default: 10000 }
  },
  stages: {
    ingestion: { status: { type: String, default: "pending" }, completedAt: Date },
    security: { status: { type: String, default: "pending" }, completedAt: Date },
    ai: { status: { type: String, default: "pending" }, completedAt: Date },
    report: { status: { type: String, default: "pending" }, completedAt: Date }
  },
  securityScore: { type: Number, default: null },
  totalTests: { type: Number, default: 12 },
  passed: { type: Number, default: 0 },
  failed: { type: Number, default: 0 },
  warnings: { type: Number, default: 0 },
  duration: { type: String },
  completedAt: { type: Date },

  // Inline results for quick access
  explorerOutput: { type: mongoose.Schema.Types.Mixed },
  testerOutput: { type: mongoose.Schema.Types.Mixed },
  guardianOutput: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

scanResultSchema.index({ status: 1 });
scanResultSchema.index({ createdAt: -1 });
scanResultSchema.index({ apiId: 1, createdAt: -1 });

module.exports = mongoose.model("ScanResult", scanResultSchema);
