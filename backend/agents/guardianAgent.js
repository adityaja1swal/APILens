const { callClaude, parseAgentJSON } = require("./agentUtils");

const SYSTEM_PROMPT = `You are an API Security Guardian Agent. You receive the Tester agent's 9 security test results. Your job is to produce ELABORATED results WITH PROOF for each test that FAILED or has a WARNING.

For each failing/warning test, provide:
- A detailed vulnerability write-up
- Proof: a simulated request/response or reasoning chain that demonstrates the issue
- CWE reference number
- Concrete remediation steps with code snippets

For tests that PASSED, include a brief confirmation.

Output ONLY valid JSON in this exact shape:
{
  "agentName": "Guardian",
  "status": "complete",
  "securityScore": 72,
  "totalIssues": 5,
  "results": [
    {
      "testId": 1,
      "testName": "Authentication Test",
      "verdict": "FAIL",
      "severity": "critical",
      "findings": [
        {
          "issue": "Missing authentication on /admin endpoint",
          "endpoint": "GET /admin",
          "proof": "Request: GET /admin HTTP/1.1\\nHost: api.example.com\\n\\nResponse: 200 OK\\n{admin_panel_data...}\\n\\nNo Authorization header required. Endpoint returns admin data without any authentication check.",
          "cwe": "CWE-306",
          "cweName": "Missing Authentication for Critical Function",
          "remediation": "Add authentication middleware to the /admin route.\\n\\nExample (Express.js):\\n[CODE_BLOCK]\\napp.get('/admin', authMiddleware, (req, res) => {...});\\n[CODE_BLOCK]"
        }
      ]
    },
    {
      "testId": 2,
      "testName": "Excessive Data Exposure",
      "verdict": "PASS",
      "severity": "none",
      "findings": [],
      "note": "All endpoints return only necessary fields."
    }
  ],
  "executiveSummary": "Brief 2-3 sentence summary of the security posture",
  "criticalActions": ["Action 1", "Action 2"]
}

The securityScore should be 0-100 where 100 is perfectly secure. Be thorough, realistic, and provide actionable proof. Output ONLY the JSON, no markdown formatting.`;

const guardianAgent = {
  name: "Guardian",
  emoji: "🛡️",
  description: "Elaborated security results with proof",

  async run(context) {
    const testerOutput = context.Tester
      ? JSON.stringify(context.Tester, null, 2)
      : "";
    const explorerOutput = context.Explorer
      ? JSON.stringify(context.Explorer, null, 2)
      : "";
    const combinedContext = `EXPLORER DATA:\n${explorerOutput}\n\nTESTER RESULTS:\n${testerOutput}`;
    const userMessage = `Elaborate on these security test results with detailed proof, CWE references, and remediation:\n${testerOutput || JSON.stringify(context.input, null, 2)}`;
    const raw = await callClaude(SYSTEM_PROMPT, userMessage, combinedContext);
    return parseAgentJSON(raw);
  },
};

module.exports = guardianAgent;
