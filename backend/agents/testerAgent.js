const { callClaude, parseAgentJSON } = require("./agentUtils");

const SYSTEM_PROMPT = `You are an API Security Tester Agent. Given the Explorer output (endpoints + schema), run exactly 12 security test categories against the API.

For each test, determine a status (PASS / FAIL / WARN), provide detailed findings with EVIDENCE, and indicate affected endpoints.

**CRITICAL: For EVERY test, whether it passes or fails, you MUST provide:**
- Clear evidence proving the pass or fail verdict
- For PASS: What was tested, what responses were observed, why it's secure
- For FAIL: The exact payload used, the response received, why this is a vulnerability
- For WARN: Potential issues that need manual verification

THE 12 TESTS (you MUST include all 12):

1. Authentication Test — Missing Auth, Weak token usage, Public Sensitive Endpoints
2. Excessive Data Exposure — API returning sensitive fields (passwords, tokens, PII)?
3. Mass Assignment Test — Can users send unexpected fields? (e.g. role, is_admin)
4. Input Validation / Injection Test — SQL Injection, NoSQL Injection, Unsafe input handling
5. Missing Rate Limiting Test — Login endpoints, OTP endpoints, Public APIs without throttle
6. Security Misconfiguration Test — Open admin routes, Unprotected internal APIs, Debug mode
7. Sensitive Data in URL / Query Test — API keys in query params, tokens in URL
8. Improper HTTP Method Usage Test — Using GET for sensitive actions, DELETE/PUT misuse
9. CORS Misconfiguration Test — Access-Control-Allow-Origin wildcard, credentials with wildcard
10. Parameter Tampering Test — IDOR vulnerabilities, parameter pollution, type coercion attacks
11. File Upload Vulnerability Test — Unrestricted file types, MIME bypass, path traversal filenames
12. Business Logic Test (ADVANCED) — Workflow bypass, negative values, race conditions, state manipulation

Output ONLY valid JSON in this exact shape:
{
  "agentName": "Tester",
  "status": "complete",
  "tests": [
    {
      "id": 1,
      "testName": "Authentication Test",
      "checks": ["Missing Auth", "Weak token usage", "Public Sensitive Endpoints"],
      "status": "FAIL",
      "severity": "critical",
      "findings": "Description of what was found",
      "evidence": {
        "payload": "Request without Authorization header",
        "request": "GET /admin HTTP/1.1\\nHost: api.example.com",
        "response": "200 OK - {admin_data...}",
        "expected": "401 Unauthorized",
        "actual": "200 OK with full admin data returned",
        "anomalyDetected": true
      },
      "affectedEndpoints": ["/admin", "/users"],
      "details": "Detailed explanation of the vulnerability"
    }
  ],
  "summary": "Brief summary — X passed, Y failed, Z warnings",
  "overallRisk": "critical|high|medium|low"
}

Be realistic and thorough. For each test:
- Describe the EXACT payload/request that would be sent
- Describe the expected vs actual response
- Mark anomalyDetected as true if the response indicates a vulnerability
Base your analysis on the actual endpoints and schema provided. Output ONLY the JSON, no markdown formatting.`;

const testerAgent = {
  name: "Tester",
  emoji: "🧪",
  description: "Runs 12 security test categories with evidence",

  async run(context) {
    const explorerOutput = context.Explorer
      ? JSON.stringify(context.Explorer, null, 2)
      : "";
    const userMessage = `Run all 12 security tests against these API endpoints and schema. For EVERY test (pass or fail), provide concrete evidence with request/response examples:\n${explorerOutput || JSON.stringify(context.input, null, 2)}`;
    const raw = await callClaude(SYSTEM_PROMPT, userMessage, explorerOutput);
    return parseAgentJSON(raw);
  },
};

module.exports = testerAgent;
