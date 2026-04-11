const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema({
  scanId: { type: mongoose.Schema.Types.ObjectId, ref: "ScanResult", required: true },
  apiId: { type: mongoose.Schema.Types.ObjectId, ref: "Api" },
  apiName: { type: String, default: "Unknown API" },
  securityScore: { type: Number },
  executiveSummary: { type: String },
  testResults: [{
    testId: Number,
    testName: String,
    status: { type: String, enum: ["PASS", "FAIL", "WARN"] },
    severity: String,
    proof: String,
    explanation: String,
    fix: {
      strategy: String,
      code: String
    }
  }],
  criticalActions: [String],
  complianceNotes: { type: String },
  generatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

reportSchema.index({ scanId: 1 }, { unique: true });

module.exports = mongoose.model("Report", reportSchema);
