const { callClaude, parseAgentJSON } = require("./agentUtils");

const SYSTEM_PROMPT = `You are an API Security Guardian Agent. You receive the Tester agent's 12 security test results. Your job is to produce ELABORATED results WITH PROOF for EVERY test — both PASSED and FAILED.

**CRITICAL REPORT FORMAT — For EVERY test, you MUST provide:**

For tests that FAILED or have WARNING:
- A detailed vulnerability write-up with technical explanation
- Proof: a simulated request/response chain that demonstrates the issue
- CWE reference number and name
- Business impact assessment
- Concrete remediation steps with actual code snippets

For tests that PASSED:
- A brief explanation of WHAT was tested
- Evidence proving it passed (what was verified, what response was received)
- Why the API is secure on this point

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
          "explanation": "The /admin endpoint does not verify any authentication credentials before returning sensitive administrative data. An unauthenticated attacker can access the admin panel directly.",
          "businessImpact": "Full admin access to any unauthenticated user. Could lead to data theft, unauthorized modifications, or complete system compromise.",
          "cwe": "CWE-306",
          "cweName": "Missing Authentication for Critical Function",
          "remediation": "Add authentication middleware to the /admin route.\\n\\nExample (Express.js):\\n\`\`\`javascript\\nconst authMiddleware = require('./middleware/auth');\\napp.get('/admin', authMiddleware, (req, res) => {...});\\n\`\`\`",
          "fixEffort": "low"
        }
      ]
    },
    {
      "testId": 2,
      "testName": "Excessive Data Exposure",
      "verdict": "PASS",
      "severity": "none",
      "findings": [],
      "passEvidence": "Tested all 15 GET endpoints. Verified response payloads do not contain password_hash, api_key, token, SSN, or credit card fields. All responses use DTOs with only necessary fields.",
      "note": "All endpoints return only necessary fields. Response filtering is properly implemented."
    }
  ],
  "executiveSummary": "Brief 2-3 sentence summary of the security posture for non-technical stakeholders",
  "criticalActions": ["Action 1 in priority order", "Action 2", "..."],
  "complianceNotes": "OWASP Top 10 coverage assessment"
}

The securityScore should be 0-100 where 100 is perfectly secure. Calculate it based on:
- Critical fail: -15 points each
- High fail: -10 points each
- Medium fail: -5 points each
- Low fail: -2 points each
- Start from 100 and subtract

Be thorough, realistic, and provide actionable proof and fixes. Output ONLY the JSON, no markdown formatting.`;

const guardianAgent = {
  name: "Guardian",
  emoji: "🛡️",
  description: "Elaborated security results with proof and remediation",

  async run(context) {
    const testerOutput = context.Tester
      ? JSON.stringify(context.Tester, null, 2)
      : "";
    const explorerOutput = context.Explorer
      ? JSON.stringify(context.Explorer, null, 2)
      : "";
    const combinedContext = `EXPLORER DATA:\n${explorerOutput}\n\nTESTER RESULTS:\n${testerOutput}`;
    const userMessage = `Elaborate on these security test results. For EVERY test (including PASSED ones), provide detailed proof, explanation, and evidence. For FAILed tests, include CWE references, business impact, and code-level remediation:\n${testerOutput || JSON.stringify(context.input, null, 2)}`;
    const raw = await callClaude(SYSTEM_PROMPT, userMessage, combinedContext);
    return parseAgentJSON(raw);
  },
};

module.exports = guardianAgent;
