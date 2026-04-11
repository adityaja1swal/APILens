const express = require("express");
const { v4: uuidv4 } = require("uuid");
const swaggerParser = require("../services/ingestion/swaggerParser");

// Conditionally require models (graceful when MongoDB is not connected)
let ScanResult, Api, Endpoint, Report, Vulnerability;
try {
  ScanResult = require("../models/ScanResult");
  Api = require("../models/Api");
  Endpoint = require("../models/Endpoint");
  Report = require("../models/Report");
  Vulnerability = require("../models/Vulnerability");
} catch {
  console.warn("⚠️  Models not loaded — running without database");
}

function createScanRoutes(pipeline) {
  const router = express.Router();

  // POST /api/scan/start — Start a new scan
  router.post("/start", async (req, res) => {
    try {
      const { input, inputType, config } = req.body;

      if (!input) {
        return res.status(400).json({ error: "Missing 'input' field — provide a Swagger URL, JSON, or endpoint list" });
      }

      const sessionId = uuidv4();
      let scanRecord = null;

      // Try to persist to MongoDB
      if (ScanResult) {
        try {
          // First, try to parse the swagger spec for metadata
          let apiName = "Unknown API";
          try {
            const parsedSpec = await swaggerParser.parse(input, inputType || "swagger_url");
            apiName = parsedSpec.title || "Unknown API";

            // Save the API record
            if (Api) {
              const apiDoc = await Api.create({
                title: parsedSpec.title,
                version: parsedSpec.version,
                baseUrl: parsedSpec.baseUrl,
                swaggerUrl: parsedSpec.swaggerUrl || (typeof input === "string" ? input : ""),
                inputType: inputType || "swagger_url",
                endpointCount: parsedSpec.endpointCount,
                schemas: parsedSpec.schemas,
                dataFlowGraph: parsedSpec.dataFlowGraph,
                criticalEndpoints: parsedSpec.criticalEndpoints,
              });

              // Save endpoints
              if (Endpoint && parsedSpec.endpoints) {
                const endpointDocs = parsedSpec.endpoints.map(ep => ({
                  apiId: apiDoc._id,
                  ...ep,
                }));
                await Endpoint.insertMany(endpointDocs);
              }

              scanRecord = await ScanResult.create({
                apiId: apiDoc._id,
                apiName,
                swaggerUrl: typeof input === "string" ? input : "",
                status: "running",
                config: config || {},
              });
            }
          } catch (parseErr) {
            // If parsing fails, still create scan record
            scanRecord = await ScanResult.create({
              apiName,
              swaggerUrl: typeof input === "string" ? input : "",
              status: "running",
              config: config || {},
            });
          }
        } catch (dbErr) {
          console.warn("⚠️  Could not save to database:", dbErr.message);
        }
      }

      const scanId = scanRecord?._id?.toString() || sessionId;

      // Start the agent pipeline asynchronously
      pipeline.run(input, "all", sessionId).then(async (context) => {
        // Persist results to MongoDB
        if (scanRecord && ScanResult) {
          try {
            const testerOutput = context.Tester || {};
            const guardianOutput = context.Guardian || {};

            const tests = testerOutput.tests || [];
            const passed = tests.filter(t => t.status === "PASS").length;
            const failed = tests.filter(t => t.status === "FAIL").length;
            const warnings = tests.filter(t => t.status === "WARN").length;

            scanRecord.status = "complete";
            scanRecord.explorerOutput = context.Explorer;
            scanRecord.testerOutput = context.Tester;
            scanRecord.guardianOutput = context.Guardian;
            scanRecord.securityScore = guardianOutput.securityScore || 0;
            scanRecord.totalTests = tests.length || 12;
            scanRecord.passed = passed;
            scanRecord.failed = failed;
            scanRecord.warnings = warnings;
            scanRecord.completedAt = new Date();
            scanRecord.stages = {
              ingestion: { status: "complete", completedAt: new Date() },
              security: { status: "complete", completedAt: new Date() },
              ai: { status: "complete", completedAt: new Date() },
              report: { status: "complete", completedAt: new Date() },
            };
            await scanRecord.save();

            // Save individual vulnerabilities
            if (Vulnerability && guardianOutput.results) {
              const vulnDocs = guardianOutput.results.map(r => ({
                scanId: scanRecord._id,
                apiId: scanRecord.apiId,
                testId: r.testId,
                testName: r.testName,
                status: r.verdict,
                severity: r.severity || "none",
                evidence: r.findings?.[0] ? {
                  payload: r.findings[0].proof,
                  expected: "",
                  actual: "",
                  anomalyDetected: r.verdict === "FAIL",
                } : {},
                aiAnalysis: r.findings?.[0] ? {
                  explanation: r.findings[0].explanation || r.passEvidence || r.note || "",
                  evidence: r.findings[0].proof || r.passEvidence || "",
                  businessImpact: r.findings[0].businessImpact || "",
                  fixSuggestion: {
                    summary: r.findings[0].remediation || "",
                    code: r.findings[0].remediation || "",
                    framework: "express",
                    effort: r.findings[0].fixEffort || "medium",
                  },
                  cwe: { id: r.findings[0].cwe || "", name: r.findings[0].cweName || "" },
                } : {},
                affectedEndpoints: r.findings?.[0]?.endpoint ? [r.findings[0].endpoint] : [],
              }));
              await Vulnerability.insertMany(vulnDocs);
            }

            // Create report
            if (Report) {
              await Report.create({
                scanId: scanRecord._id,
                apiId: scanRecord.apiId,
                apiName: scanRecord.apiName,
                securityScore: guardianOutput.securityScore || 0,
                executiveSummary: guardianOutput.executiveSummary || "",
                testResults: (guardianOutput.results || []).map(r => ({
                  testId: r.testId,
                  testName: r.testName,
                  status: r.verdict,
                  severity: r.severity,
                  proof: r.findings?.[0]?.proof || r.passEvidence || "",
                  explanation: r.findings?.[0]?.explanation || r.note || "",
                  fix: {
                    strategy: r.findings?.[0]?.remediation || "",
                    code: r.findings?.[0]?.remediation || "",
                  },
                })),
                criticalActions: guardianOutput.criticalActions || [],
                complianceNotes: guardianOutput.complianceNotes || "",
              });
            }
          } catch (saveErr) {
            console.error("❌ Error persisting results:", saveErr.message);
          }
        }
      }).catch((err) => {
        console.error(`Pipeline error for session ${sessionId}:`, err);
        if (scanRecord && ScanResult) {
          scanRecord.status = "failed";
          scanRecord.save().catch(() => {});
        }
      });

      res.json({
        scanId,
        sessionId,
        status: "running",
        message: "Scan started. Connect via Socket.io for real-time updates.",
        wsChannel: `/agents`,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/scan/:scanId — Get scan status + results
  router.get("/:scanId", async (req, res) => {
    try {
      // Try MongoDB first
      if (ScanResult) {
        const scan = await ScanResult.findById(req.params.scanId).lean();
        if (scan) {
          return res.json(scan);
        }
      }
      // Fallback to in-memory pipeline results
      const result = pipeline.getResult(req.params.scanId);
      if (!result) {
        return res.status(404).json({ error: "Scan not found or still running" });
      }
      res.json(result);
    } catch (err) {
      // Maybe scanId is a sessionId, not an ObjectId
      const result = pipeline.getResult(req.params.scanId);
      if (result) return res.json(result);
      res.status(404).json({ error: "Scan not found" });
    }
  });

  // GET /api/scan/history — List all past scans
  router.get("/", async (req, res) => {
    try {
      if (!ScanResult) {
        return res.json({ scans: [], message: "Database not connected" });
      }
      const scans = await ScanResult.find()
        .sort({ createdAt: -1 })
        .limit(50)
        .select("apiName swaggerUrl status securityScore totalTests passed failed warnings duration createdAt completedAt")
        .lean();
      res.json({ scans });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = createScanRoutes;
