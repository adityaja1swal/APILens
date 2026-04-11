const mongoose = require("mongoose");

const apiSchema = new mongoose.Schema({
  title: { type: String, required: true },
  version: { type: String, default: "unknown" },
  baseUrl: { type: String },
  swaggerUrl: { type: String },
  inputType: { type: String, enum: ["swagger_url", "swagger_json", "raw"], default: "swagger_url" },
  endpointCount: { type: Number, default: 0 },
  schemas: { type: mongoose.Schema.Types.Mixed, default: {} },
  dataFlowGraph: {
    nodes: [String],
    edges: [{
      from: String,
      to: String,
      relation: String
    }]
  },
  criticalEndpoints: [String],
}, { timestamps: true });

apiSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Api", apiSchema);
