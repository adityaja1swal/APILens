const mongoose = require("mongoose");

const endpointSchema = new mongoose.Schema({
  apiId: { type: mongoose.Schema.Types.ObjectId, ref: "Api", required: true },
  method: { type: String, required: true, enum: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"] },
  path: { type: String, required: true },
  params: [{
    name: String,
    in: { type: String, enum: ["path", "query", "header", "body", "cookie"] },
    type: String,
    required: Boolean,
    description: String
  }],
  requestBody: { type: mongoose.Schema.Types.Mixed, default: null },
  responseSchema: { type: mongoose.Schema.Types.Mixed, default: null },
  authRequired: { type: Boolean, default: false },
  riskLevel: { type: String, enum: ["low", "medium", "high", "critical"], default: "low" },
  tags: [String],
  description: { type: String, default: "" },
}, { timestamps: true });

endpointSchema.index({ apiId: 1 });
endpointSchema.index({ riskLevel: 1 });

module.exports = mongoose.model("Endpoint", endpointSchema);
