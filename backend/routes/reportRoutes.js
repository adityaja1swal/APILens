const express = require("express");

let Report, ScanResult, Vulnerability;
try {
  Report = require("../models/Report");
  ScanResult = require("../models/ScanResult");
  Vulnerability = require("../models/Vulnerability");
} catch {
  console.warn("⚠️  Report models not loaded");
}

function createReportRoutes() {
  const router = express.Router();

  // GET /api/report/:scanId — Get full report for a scan
  router.get("/:scanId", async (req, res) => {
    try {
      if (!Report) {
        return res.status(503).json({ error: "Database not connected" });
      }

      const report = await Report.findOne({ scanId: req.params.scanId }).lean();
      if (!report) {
        // Try to build report from scan results
        const scan = await ScanResult.findById(req.params.scanId).lean();
        if (!scan) {
          return res.status(404).json({ error: "Report not found" });
        }
        // Return inline data as report
        return res.json({
          scanId: scan._id,
          apiName: scan.apiName,
          securityScore: scan.securityScore,
          executiveSummary: scan.guardianOutput?.executiveSummary || "",
          testResults: scan.guardianOutput?.results || [],
          criticalActions: scan.guardianOutput?.criticalActions || [],
          complianceNotes: scan.guardianOutput?.complianceNotes || "",
          generatedAt: scan.completedAt,
        });
      }

      res.json(report);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/report/:scanId/download — Download report as JSON
  router.get("/:scanId/download", async (req, res) => {
    try {
      if (!Report) {
        return res.status(503).json({ error: "Database not connected" });
      }

      const report = await Report.findOne({ scanId: req.params.scanId }).lean();
      if (!report) {
        return res.status(404).json({ error: "Report not found" });
      }

      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="apilens-report-${req.params.scanId}.json"`);
      res.json(report);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/report/:scanId/vulnerabilities — Get all vulnerabilities for a scan
  router.get("/:scanId/vulnerabilities", async (req, res) => {
    try {
      if (!Vulnerability) {
        return res.status(503).json({ error: "Database not connected" });
      }

      const vulns = await Vulnerability.find({ scanId: req.params.scanId })
        .sort({ severity: -1 })
        .lean();

      res.json({ vulnerabilities: vulns });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = createReportRoutes;
