const fetch = require("node-fetch");

async function callClaude(systemPrompt, userMessage, context = "") {
  // Check for Mock Mode (useful for demos/testing without API credits)
  if (process.env.MOCK_MODE === "true") {
    console.log("🛠️ [MOCK MODE] Simulating Claude response...");
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate thinking

    // Return different mock data based on the agent's system prompt keywords
    if (systemPrompt.includes("Explorer")) {
      return JSON.stringify({
        importantEndpoints: [
          { method: "GET", path: "/planetary/apod", params: ["api_key", "date"], authRequired: true, riskLevel: "low", description: "Astronomy Picture of the Day" },
          { method: "POST", path: "/admin/rockets", params: ["payload"], authRequired: true, riskLevel: "high", description: "Create a new rocket launch" }
        ],
        schemaTree: {
          "ApodResponse": {
            "date": "string",
            "explanation": "string",
            "media_type": "string",
            "url": "string"
          },
          "RocketPayload": {
            "name": "string",
            "mission_type": "string",
            "secret_code": "string (sensitive)"
          }
        },
        summary: "Found 2 important endpoints including a high-risk admin route."
      });
    }
    if (systemPrompt.includes("Tester")) {
      return JSON.stringify({
        tests: [
          { id: 1, testName: "Authentication Test", checks: ["Missing Auth", "Weak token usage"], status: "FAIL", severity: "critical", findings: "Admin endpoint accepts requests without auth token", affectedEndpoints: ["/admin/rockets"] },
          { id: 2, testName: "Excessive Data Exposure", checks: ["Sensitive fields"], status: "PASS", severity: "none", findings: "No excessive data exposed.", affectedEndpoints: [] },
          { id: 3, testName: "Mass Assignment Test", checks: ["Unexpected fields"], status: "PASS", severity: "none", findings: "Inputs correctly validated.", affectedEndpoints: [] },
          { id: 4, testName: "Input Validation / Injection", checks: ["SQL/NoSQL", "Unsafe input"], status: "WARN", severity: "medium", findings: "Date field not strongly validated, potential ReDoS.", affectedEndpoints: ["/planetary/apod"] },
          { id: 5, testName: "Missing Rate Limiting", checks: ["Login", "Public IPs"], status: "FAIL", severity: "high", findings: "No rate limits on public APOD endpoint.", affectedEndpoints: ["/planetary/apod"] },
          { id: 6, testName: "Security Misconfiguration", checks: ["Open admin routes"], status: "FAIL", severity: "high", findings: "Admin route exposed to public network.", affectedEndpoints: ["/admin/rockets"] },
          { id: 7, testName: "Sensitive Data in URL", checks: ["API keys in query"], status: "FAIL", severity: "medium", findings: "API key passed in URL query param.", affectedEndpoints: ["Global"] },
          { id: 8, testName: "Improper HTTP Method Usage", checks: ["GET for sensitive"], status: "PASS", severity: "none", findings: "Methods correctly mapped.", affectedEndpoints: [] },
          { id: 9, testName: "CORS Misconfiguration", checks: ["Wildcard origins"], status: "WARN", severity: "low", findings: "Broad CORS policy allows * origin.", affectedEndpoints: ["Global"] }
        ],
        summary: "4 passed, 4 failed, 2 warnings.",
        overallRisk: "high"
      });
    }
    if (systemPrompt.includes("Guardian")) {
      return JSON.stringify({
        securityScore: 45,
        totalIssues: 4,
        results: [
          {
            testId: 1, testName: "Authentication Test", verdict: "FAIL", severity: "critical",
            findings: [{ issue: "Missing auth on admin route", endpoint: "POST /admin/rockets", proof: "Request: POST /admin/rockets\\n\\nResponse: 201 Created\\n\\nNo Auth header required.", cwe: "CWE-306", cweName: "Missing Authentication for Critical Function", remediation: "Ensure auth middleware is applied.\\n\\n```\\napp.post('/admin/rockets', requireAuth, (req, res) => {...})\\n```" }]
          },
          {
            testId: 5, testName: "Missing Rate Limiting", verdict: "FAIL", severity: "high",
            findings: [{ issue: "No rate limit on public endpoint", endpoint: "GET /planetary/apod", proof: "Sent 500 requests in 1 second, all returned 200 OK without 429 Too Many Requests.", cwe: "CWE-770", cweName: "Allocation of Resources Without Limits", remediation: "Add express-rate-limit.\\n\\n```\\nconst limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });\\n```" }]
          }
        ],
        executiveSummary: "Critical authentication failure on admin endpoints allows unauthorized rocket launches.",
        criticalActions: ["Secure /admin/rockets immediately", "Enable rate limiting on public endpoints"]
      });
    }
    return "{}";
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "your_anthropic_api_key_here") {
    throw new Error("ANTHROPIC_API_KEY is not configured. Please set it in backend/.env");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: context
            ? `CONTEXT FROM PREVIOUS AGENT:\n${context}\n\n${userMessage}`
            : userMessage,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Claude API error (${response.status}): ${errBody}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

function parseAgentJSON(rawText) {
  // Try to extract JSON from markdown code blocks or raw text
  let cleaned = rawText.trim();
  const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    cleaned = jsonMatch[1].trim();
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    // If JSON parsing fails, return a wrapped response
    return {
      agentName: "Unknown",
      status: "complete",
      rawOutput: rawText,
      parseError: true,
    };
  }
}

module.exports = { callClaude, parseAgentJSON };
