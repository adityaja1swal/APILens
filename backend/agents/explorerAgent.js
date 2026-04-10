const { callClaude, parseAgentJSON } = require("./agentUtils");

const SYSTEM_PROMPT = `You are an API Explorer Agent. Given a Swagger JSON, OpenAPI spec, or API URL, deeply analyze the API structure.

You must return TWO things:

1. **Important Endpoints** — The most significant/sensitive endpoints. For each, include method, path, parameters, whether auth is required, a risk level (high/medium/low), and a short description of what it does.

2. **Schema Tree** — A nested object representing the API's data model hierarchy. Each top-level key is a resource/model name, and the value is an object of field names mapped to their types (string, integer, boolean, array, object). Include nested objects where applicable.

Output ONLY valid JSON in this exact shape:
{
  "agentName": "Explorer",
  "status": "complete",
  "importantEndpoints": [
    {
      "method": "GET",
      "path": "/users",
      "params": ["id", "limit"],
      "authRequired": true,
      "riskLevel": "high",
      "description": "Returns all user records including PII"
    }
  ],
  "schemaTree": {
    "User": {
      "id": "integer",
      "email": "string",
      "password_hash": "string (sensitive)",
      "profile": {
        "name": "string",
        "avatar_url": "string"
      }
    },
    "Order": {
      "id": "integer",
      "user_id": "integer",
      "items": "array<OrderItem>",
      "total": "number"
    }
  },
  "summary": "Brief overview of what was discovered"
}

Discover ALL important endpoints, especially sensitive ones (auth, payments, admin, PII). Be thorough with the schema tree — include nested objects, arrays, and mark sensitive fields. Output ONLY the JSON, no markdown formatting.`;

const explorerAgent = {
  name: "Explorer",
  emoji: "🔍",
  description: "Discovers important endpoints and schema tree",

  async run(context) {
    const input = context.input;
    const userMessage = `Analyze this API and extract important endpoints + schema tree:\n${typeof input === "string" ? input : JSON.stringify(input, null, 2)}`;
    const raw = await callClaude(SYSTEM_PROMPT, userMessage);
    return parseAgentJSON(raw);
  },
};

module.exports = explorerAgent;
