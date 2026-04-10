const { callClaude, parseAgentJSON } = require("./agentUtils");

const SYSTEM_PROMPT = `You are an API Security Tester Agent. Given the Explorer output (endpoints + schema), run exactly 9 security test categories against the API.

For each test, determine a status (PASS / FAIL / WARN), provide findings, and indicate affected endpoints.

THE 9 TESTS (you MUST include all 9):

1. Authentication Test — Missing Auth, Weak token usage, Public Sensitive Endpoints
2. Excessive Data Exposure — API returning sensitive fields (passwords, tokens, PII)?
3. Mass Assignment Test — Can users send unexpected fields? (e.g. role, is_admin)
4. Input Validation / Injection Test — SQL Injection, NoSQL Injection, Unsafe input handling
5. Missing Rate Limiting Test — Login endpoints, OTP endpoints, Public APIs without throttle
6. Security Misconfiguration Test — Open admin routes, Unprotected internal APIs, Debug mode
7. Sensitive Data in URL / Query Test — API keys in query params, tokens in URL
8. Improper HTTP Method Usage Test — Using GET for sensitive actions, DELETE/PUT misuse
9. CORS Misconfiguration Test — Access-Control-Allow-Origin wildcard, credentials allowed with wildcard

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
      "affectedEndpoints": ["/admin", "/users"],
      "details": "Detailed explanation of the vulnerability"
    }
  ],
  "summary": "Brief summary — X passed, Y failed, Z warnings",
  "overallRisk": "critical|high|medium|low"
}

Be realistic and thorough. Base your analysis on the actual endpoints and schema provided. Output ONLY the JSON, no markdown formatting.`;

const testerAgent = {
  name: "Tester",
  emoji: "🧪",
  description: "Runs 9 security test categories",

  async run(context) {
    const explorerOutput = context.Explorer
      ? JSON.stringify(context.Explorer, null, 2)
      : "";
    const userMessage = `Run all 9 security tests against these API endpoints and schema:\n${explorerOutput || JSON.stringify(context.input, null, 2)}`;
    const raw = await callClaude(SYSTEM_PROMPT, userMessage, explorerOutput);
    return parseAgentJSON(raw);
  },
};

module.exports = testerAgent;
