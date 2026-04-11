const fetch = require("node-fetch");

async function callClaude(systemPrompt, userMessage, context = "") {
  // Check for Mock Mode
  if (process.env.MOCK_MODE === "true") {
    console.log("🛠️ [MOCK MODE] Simulating Claude response...");
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (systemPrompt.includes("Guardian")) {
      return JSON.stringify({
        agentName: "Guardian",
        status: "complete",
        securityScore: 28,
        totalIssues: 8,
        results: [
          {
            testId: 1, testName: "Authentication Test", verdict: "FAIL", severity: "critical",
            findings: [{ issue: "Unauthenticated access to store/order and user endpoints", endpoint: "POST /store/order, POST /user", proof: "Request: POST /store/order HTTP/1.1\\nContent-Type: application/json\\n\\n{\"petId\":1,\"quantity\":999}\\n\\nResponse: 200 OK\\n{\"id\":10,\"petId\":1,\"quantity\":999,\"status\":\"placed\"}\\n\\nNo Authorization header was included. The order was placed successfully without any authentication.", explanation: "Critical store and user endpoints accept requests without authentication tokens, allowing anonymous users to place orders and create accounts without verification.", businessImpact: "Anyone can place unlimited orders, create fake accounts, and manipulate store data without login.", cwe: "CWE-306", cweName: "Missing Authentication for Critical Function", remediation: "Add authentication middleware to all sensitive endpoints:\\n\\n```javascript\\nconst jwt = require('jsonwebtoken');\\n\\nfunction authMiddleware(req, res, next) {\\n  const token = req.headers.authorization?.split(' ')[1];\\n  if (!token) return res.status(401).json({ error: 'Authentication required' });\\n  try {\\n    req.user = jwt.verify(token, process.env.JWT_SECRET);\\n    next();\\n  } catch { res.status(401).json({ error: 'Invalid token' }); }\\n}\\n\\napp.post('/store/order', authMiddleware, orderController);\\n```", fixEffort: "medium" }]
          },
          {
            testId: 2, testName: "Excessive Data Exposure", verdict: "FAIL", severity: "high",
            findings: [{ issue: "Password returned in user profile response", endpoint: "GET /user/{username}", proof: "Request: GET /user/john HTTP/1.1\\n\\nResponse: 200 OK\\n{\"id\":1,\"username\":\"john\",\"password\":\"12345\",\"email\":\"john@email.com\",\"phone\":\"555-0123\"}\\n\\nPassword field is returned in plain text.", explanation: "The user endpoint returns the raw password field in the response body, exposing credentials.", businessImpact: "Credential theft — any authenticated user can view other users' passwords.", cwe: "CWE-200", cweName: "Exposure of Sensitive Information", remediation: "Filter sensitive fields before returning response:\\n\\n```javascript\\napp.get('/user/:username', auth, async (req, res) => {\\n  const user = await User.findOne({ username: req.params.username });\\n  const { password, ...safeUser } = user.toObject();\\n  res.json(safeUser);\\n});\\n```", fixEffort: "low" }]
          },
          {
            testId: 4, testName: "Injection (SQL/NoSQL)", verdict: "FAIL", severity: "critical",
            findings: [{ issue: "SQL injection via login username parameter", endpoint: "GET /user/login", proof: "Request: GET /user/login?username=' OR 1=1 --&password=test\\n\\nResponse: 200 OK\\n{\"code\":200,\"message\":\"logged in user session\"}\\n\\nInjection payload was not sanitized and returned a success response.", explanation: "The login endpoint directly uses the username parameter in a query without sanitization, making it vulnerable to SQL injection attacks.", businessImpact: "Complete authentication bypass. Attacker can login as any user, dump entire database, or execute arbitrary commands.", cwe: "CWE-89", cweName: "SQL Injection", remediation: "Use parameterized queries:\\n\\n```javascript\\n// BAD\\ndb.query(`SELECT * FROM users WHERE username = '${username}'`);\\n\\n// GOOD\\ndb.query('SELECT * FROM users WHERE username = ?', [username]);\\n\\n// Also add input validation:\\nconst { body, validationResult } = require('express-validator');\\napp.get('/user/login',\\n  body('username').isAlphanumeric().trim().escape(),\\n  (req, res) => { ... }\\n);\\n```", fixEffort: "medium" }]
          },
          {
            testId: 5, testName: "Rate Limiting", verdict: "FAIL", severity: "high",
            findings: [{ issue: "No rate limiting on any endpoint", endpoint: "Global", proof: "Sent 500 requests to GET /pet/1 in 10 seconds.\\nAll 500 returned 200 OK.\\nNo 429 Too Many Requests responses received.\\nNo progressive delays observed.", explanation: "The API has no rate limiting mechanism, allowing unlimited requests from any source. This enables brute force attacks on the login endpoint and resource exhaustion.", businessImpact: "Brute force credential attacks, denial of service, API abuse.", cwe: "CWE-770", cweName: "Allocation of Resources Without Limits", remediation: "Add rate limiting middleware:\\n\\n```javascript\\nconst rateLimit = require('express-rate-limit');\\n\\nconst limiter = rateLimit({\\n  windowMs: 15 * 60 * 1000,\\n  max: 100,\\n  standardHeaders: true,\\n  legacyHeaders: false,\\n});\\n\\nconst loginLimiter = rateLimit({\\n  windowMs: 15 * 60 * 1000,\\n  max: 5,\\n  message: 'Too many login attempts'\\n});\\n\\napp.use('/api/', limiter);\\napp.use('/user/login', loginLimiter);\\n```", fixEffort: "low" }]
          },
          {
            testId: 7, testName: "Sensitive Data in URL", verdict: "FAIL", severity: "high",
            findings: [{ issue: "Login credentials passed in URL query parameters", endpoint: "GET /user/login", proof: "The login endpoint uses GET method with credentials as query params:\\nGET /user/login?username=admin&password=s3cret\\n\\nCredentials are visible in:\\n- Browser history\\n- Server access logs\\n- Proxy logs\\n- Network monitoring tools", explanation: "Authentication credentials are transmitted via URL query parameters instead of the request body, exposing them in multiple logging surfaces.", businessImpact: "Credential exposure through server logs, browser history, and network proxies.", cwe: "CWE-598", cweName: "Use of GET Request Method With Sensitive Query Strings", remediation: "Change login to POST with credentials in request body:\\n\\n```javascript\\n// Change from GET to POST\\napp.post('/user/login', (req, res) => {\\n  const { username, password } = req.body;\\n  // ... authentication logic\\n});\\n```", fixEffort: "low" }]
          },
          {
            testId: 10, testName: "Parameter Tampering", verdict: "FAIL", severity: "high",
            findings: [{ issue: "IDOR — sequential ID enumeration exposes all resources", endpoint: "GET /pet/{petId}", proof: "GET /pet/1 → 200 OK (Pet: Doggie)\\nGET /pet/2 → 200 OK (Pet: Cat)\\nGET /pet/3 → 200 OK (Pet: Bird)\\n\\nAll pet records accessible by iterating IDs. No ownership check.", explanation: "Resources use sequential integer IDs with no authorization check, allowing any user to access any pet record by changing the ID.", businessImpact: "Complete data enumeration — attacker can scrape all records by iterating IDs.", cwe: "CWE-639", cweName: "Authorization Bypass Through User-Controlled Key", remediation: "Add ownership validation:\\n\\n```javascript\\napp.get('/pet/:petId', auth, async (req, res) => {\\n  const pet = await Pet.findById(req.params.petId);\\n  if (pet.ownerId !== req.user.id) {\\n    return res.status(403).json({ error: 'Access denied' });\\n  }\\n  res.json(pet);\\n});\\n// Also consider using UUIDs instead of sequential IDs\\n```", fixEffort: "medium" }]
          },
          {
            testId: 11, testName: "File Upload Vulnerability", verdict: "PASS", severity: "none",
            findings: [],
            passEvidence: "Uploaded test files with extensions .php, .exe, .jsp with spoofed MIME types. All were rejected with 415 Unsupported Media Type. Only image/jpeg and image/png MIME types accepted. Filename sanitization strips path traversal sequences.",
            note: "File upload security is properly implemented with MIME validation and type restrictions."
          },
          {
            testId: 12, testName: "Business Logic Testing", verdict: "FAIL", severity: "high",
            findings: [{ issue: "Order accepts negative quantities", endpoint: "POST /store/order", proof: "Request: POST /store/order\\n{\"petId\":1,\"quantity\":-5}\\n\\nResponse: 200 OK\\n{\"id\":12,\"petId\":1,\"quantity\":-5,\"status\":\"placed\"}\\n\\nNegative quantity accepted and order placed.", explanation: "The store order endpoint does not validate business logic constraints. Negative quantities, zero values, and excessively large numbers are all accepted.", businessImpact: "Financial manipulation — negative quantities could generate credits or reverse charges.", cwe: "CWE-840", cweName: "Business Logic Errors", remediation: "Add input validation for business rules:\\n\\n```javascript\\napp.post('/store/order', auth, (req, res) => {\\n  const { petId, quantity } = req.body;\\n  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {\\n    return res.status(400).json({ error: 'Quantity must be 1-100' });\\n  }\\n  if (!petId || petId < 1) {\\n    return res.status(400).json({ error: 'Invalid pet ID' });\\n  }\\n  // ... create order\\n});\\n```", fixEffort: "low" }]
          }
        ],
        executiveSummary: "This API has critical security vulnerabilities. 8 of 12 tests failed, including authentication bypass, SQL injection, and credential exposure. The Petstore API currently scores 28/100, indicating severe security deficiencies that require immediate attention. Priority fixes: add authentication to all sensitive endpoints, switch login to POST, implement parameterized queries, and add rate limiting.",
        criticalActions: [
          "1. Add authentication middleware to /store/order and /user endpoints immediately",
          "2. Fix SQL injection on /user/login — use parameterized queries",
          "3. Switch login from GET to POST to prevent credential exposure in URLs",
          "4. Remove password field from user profile responses",
          "5. Implement rate limiting across all endpoints",
          "6. Add IDOR protection with ownership checks on resource endpoints",
          "7. Add business logic validation on order quantities"
        ],
        complianceNotes: "OWASP Top 10 Coverage: A01 Broken Access Control (FAIL), A02 Cryptographic Failures (WARN), A03 Injection (FAIL), A04 Insecure Design (FAIL), A05 Security Misconfiguration (WARN), A06 Vulnerable Components (N/A), A07 Auth Failures (FAIL), A08 Data Integrity Failures (N/A), A09 Logging Failures (N/A), A10 SSRF (N/A)"
      });
    }

    if (systemPrompt.includes("Tester")) {
      return JSON.stringify({
        agentName: "Tester",
        status: "complete",
        tests: [
          { id: 1, testName: "Authentication Test", checks: ["Missing Auth", "Weak token usage", "Public Sensitive Endpoints"], status: "FAIL", severity: "critical",
            findings: "Multiple endpoints lack authentication. POST /user, POST /store/order, and GET /user/login are all accessible without any auth tokens.",
            evidence: { payload: "Request without Authorization header", request: "POST /store/order HTTP/1.1\nContent-Type: application/json\n\n{\"petId\":1,\"quantity\":999}", response: "200 OK\n{\"id\":10,\"petId\":1,\"quantity\":999,\"status\":\"placed\"}", expected: "401 Unauthorized", actual: "200 OK — order placed without authentication", anomalyDetected: true },
            affectedEndpoints: ["/store/order", "/user", "/user/login"], details: "Critical endpoints accept requests without any authentication, allowing anonymous access to sensitive operations." },
          { id: 2, testName: "Excessive Data Exposure", checks: ["Sensitive fields in response", "Password exposure", "Token leakage"], status: "FAIL", severity: "high",
            findings: "GET /user/{username} returns password field in response body.",
            evidence: { payload: "Standard GET request", request: "GET /user/john HTTP/1.1", response: "200 OK\n{\"id\":1,\"username\":\"john\",\"password\":\"12345\",\"email\":\"john@email.com\"}", expected: "Response without password field", actual: "Password field returned in plain text", anomalyDetected: true },
            affectedEndpoints: ["/user/{username}"], details: "User endpoint returns password in response body, exposing credentials." },
          { id: 3, testName: "Mass Assignment Test", checks: ["Unexpected fields", "Role escalation", "Admin flag injection"], status: "WARN", severity: "medium",
            findings: "User creation endpoint accepts all fields without filtering.",
            evidence: { payload: "{\"username\":\"test\",\"userStatus\":99,\"role\":\"admin\"}", request: "POST /user HTTP/1.1\nContent-Type: application/json\n\n{\"username\":\"test\",\"userStatus\":99}", response: "200 OK\n{\"id\":11,\"username\":\"test\",\"userStatus\":99}", expected: "Extra fields ignored or rejected", actual: "userStatus field accepted without validation", anomalyDetected: true },
            affectedEndpoints: ["/user"], details: "API accepts arbitrary fields on user creation, potential privilege escalation." },
          { id: 4, testName: "Injection (SQL/NoSQL)", checks: ["SQL Injection", "NoSQL Injection", "Command Injection"], status: "FAIL", severity: "critical",
            findings: "Login endpoint vulnerable to injection via username parameter.",
            evidence: { payload: "' OR 1=1 --", request: "GET /user/login?username=' OR 1=1 --&password=test HTTP/1.1", response: "200 OK\n{\"code\":200,\"type\":\"unknown\",\"message\":\"logged in user session\"}", expected: "400 Bad Request or input sanitization", actual: "200 OK — potential injection success", anomalyDetected: true },
            affectedEndpoints: ["/user/login"], details: "Username parameter not sanitized, SQL injection payload returned success response." },
          { id: 5, testName: "Rate Limiting", checks: ["Login brute force", "API abuse", "Resource exhaustion"], status: "FAIL", severity: "high",
            findings: "No rate limiting on any endpoints. 500 requests in 10 seconds all returned 200.",
            evidence: { payload: "500 rapid GET requests", request: "GET /pet/1 HTTP/1.1 (x500 in 10s)", response: "All 500 returned 200 OK, no 429 responses", expected: "429 Too Many Requests after threshold", actual: "All 500 requests succeeded", anomalyDetected: true },
            affectedEndpoints: ["/pet/{petId}", "/user/login", "/store/inventory"], details: "No rate limiting enables brute force attacks and DoS." },
          { id: 6, testName: "Security Misconfiguration", checks: ["Open admin routes", "Debug mode", "Stack trace exposure"], status: "WARN", severity: "medium",
            findings: "API returns verbose error messages with stack traces on invalid input.",
            evidence: { payload: "Invalid pet ID format", request: "GET /pet/invalid HTTP/1.1", response: "500 Internal Server Error\n{\"message\":\"java.lang.NumberFormatException: For input string: \\\"invalid\\\"\"}", expected: "Generic error message (400 Bad Request)", actual: "Stack trace exposed in error response", anomalyDetected: true },
            affectedEndpoints: ["/pet/{petId}"], details: "Error responses reveal internal implementation details." },
          { id: 7, testName: "Sensitive Data in URL", checks: ["Credentials in query string", "API key in URL", "Token in URL"], status: "FAIL", severity: "high",
            findings: "Login endpoint passes username and password as query parameters in the URL.",
            evidence: { payload: "Standard login request", request: "GET /user/login?username=admin&password=secret HTTP/1.1", response: "200 OK", expected: "Credentials in request body (POST)", actual: "Credentials in URL query string (GET)", anomalyDetected: true },
            affectedEndpoints: ["/user/login"], details: "Credentials visible in URL, logged in server access logs, browser history, proxy logs." },
          { id: 8, testName: "HTTP Method Misuse", checks: ["GET for mutations", "Method override attacks", "Unexpected methods"], status: "FAIL", severity: "medium",
            findings: "Login uses GET instead of POST. Credentials sent via query parameters.",
            evidence: { payload: "Login via GET", request: "GET /user/login?username=admin&password=pass HTTP/1.1", response: "200 OK — login successful", expected: "POST method for authentication", actual: "GET method used, credentials in URL", anomalyDetected: true },
            affectedEndpoints: ["/user/login"], details: "Authentication should use POST to prevent credential exposure in logs." },
          { id: 9, testName: "CORS Misconfiguration", checks: ["Wildcard origin", "Credentials with wildcard", "Origin reflection"], status: "WARN", severity: "low",
            findings: "CORS headers not explicitly tested, but API accepts cross-origin requests.",
            evidence: { payload: "OPTIONS preflight with evil origin", request: "OPTIONS /pet/1 HTTP/1.1\nOrigin: https://evil.com", response: "Access-Control-Allow-Origin: *", expected: "Restricted to specific trusted origins", actual: "Wildcard origin allowed", anomalyDetected: true },
            affectedEndpoints: ["Global"], details: "Broad CORS policy allows any origin to make requests." },
          { id: 10, testName: "Parameter Tampering", checks: ["IDOR", "Parameter pollution", "Type coercion"], status: "FAIL", severity: "high",
            findings: "Direct object reference — changing pet ID returns other users' pets without authorization.",
            evidence: { payload: "Sequential ID enumeration", request: "GET /pet/1 HTTP/1.1\nGET /pet/2 HTTP/1.1\nGET /pet/3 HTTP/1.1", response: "200 OK for all — different pet data returned", expected: "403 Forbidden for non-owned resources", actual: "200 OK — all pet records accessible", anomalyDetected: true },
            affectedEndpoints: ["/pet/{petId}", "/store/order/{orderId}"], details: "No ownership validation on resources, IDOR vulnerability." },
          { id: 11, testName: "File Upload Vulnerability", checks: ["Unrestricted types", "MIME bypass", "Path traversal"], status: "PASS", severity: "none",
            findings: "Pet photo upload endpoint restricts file types and validates MIME headers.",
            evidence: { payload: "Malicious file upload attempt", request: "POST /pet/1/uploadImage HTTP/1.1\nContent-Type: multipart/form-data\n\nfile=malicious.php", response: "415 Unsupported Media Type", expected: "Rejection of non-image files", actual: "Correctly rejected — only image/jpeg and image/png accepted", anomalyDetected: false },
            affectedEndpoints: ["/pet/{petId}/uploadImage"], details: "File upload properly validates file type and MIME headers." },
          { id: 12, testName: "Business Logic Testing", checks: ["Negative values", "Workflow bypass", "State manipulation"], status: "FAIL", severity: "high",
            findings: "Store order accepts negative quantities and zero-price orders.",
            evidence: { payload: "{\"petId\":1,\"quantity\":-5}", request: "POST /store/order HTTP/1.1\nContent-Type: application/json\n\n{\"petId\":1,\"quantity\":-5}", response: "200 OK\n{\"id\":12,\"petId\":1,\"quantity\":-5,\"status\":\"placed\"}", expected: "400 Bad Request — quantity must be positive", actual: "Order placed with negative quantity", anomalyDetected: true },
            affectedEndpoints: ["/store/order"], details: "No business logic validation on order quantities, enabling manipulation." }
        ],
        summary: "3 passed, 8 failed, 1 warning. Critical vulnerabilities in authentication and injection.",
        overallRisk: "critical"
      });
    }

    if (systemPrompt.includes("Explorer")) {
      return JSON.stringify({
        agentName: "Explorer",
        status: "complete",
        importantEndpoints: [
          { method: "GET", path: "/pet/{petId}", params: ["petId"], authRequired: true, riskLevel: "medium", description: "Find pet by ID" },
          { method: "POST", path: "/pet", params: ["body"], authRequired: true, riskLevel: "high", description: "Add a new pet to the store" },
          { method: "GET", path: "/user/login", params: ["username", "password"], authRequired: false, riskLevel: "critical", description: "Logs user into the system" },
          { method: "POST", path: "/store/order", params: ["body"], authRequired: false, riskLevel: "high", description: "Place an order for a pet" },
          { method: "DELETE", path: "/pet/{petId}", params: ["petId", "api_key"], authRequired: true, riskLevel: "high", description: "Deletes a pet" },
          { method: "GET", path: "/store/inventory", params: [], authRequired: true, riskLevel: "medium", description: "Returns pet inventories by status" },
          { method: "POST", path: "/user", params: ["body"], authRequired: false, riskLevel: "high", description: "Create user" },
          { method: "PUT", path: "/user/{username}", params: ["username", "body"], authRequired: true, riskLevel: "high", description: "Update user" }
        ],
        schemaTree: {
          "Pet": { "id": "integer", "name": "string", "status": "string", "photoUrls": "array<string>", "tags": "array<Tag>" },
          "Order": { "id": "integer", "petId": "integer", "quantity": "integer", "shipDate": "string (date-time)", "status": "string", "complete": "boolean" },
          "User": { "id": "integer", "username": "string", "firstName": "string", "lastName": "string", "email": "string", "password": "string (sensitive)", "phone": "string", "userStatus": "integer" },
          "Tag": { "id": "integer", "name": "string" },
          "Category": { "id": "integer", "name": "string" }
        },
        dataFlowGraph: {
          nodes: ["Pet", "Order", "User", "Store", "Tag", "Category"],
          edges: [
            { from: "User", to: "Order", relation: "places" },
            { from: "Order", to: "Pet", relation: "references" },
            { from: "Pet", to: "Category", relation: "belongs_to" },
            { from: "Pet", to: "Tag", relation: "tagged_with" },
            { from: "Store", to: "Order", relation: "fulfills" }
          ]
        },
        criticalEndpoints: ["GET /user/login", "POST /user", "DELETE /pet/{petId}", "POST /store/order"],
        summary: "Found 8 important endpoints across Pet, Store, and User resources. Critical: login endpoint passes credentials in query params, user creation has no auth, and store orders are unauthenticated."
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
      max_tokens: 8192,
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
  let cleaned = rawText.trim();
  const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    cleaned = jsonMatch[1].trim();
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    return {
      agentName: "Unknown",
      status: "complete",
      rawOutput: rawText,
      parseError: true,
    };
  }
}

module.exports = { callClaude, parseAgentJSON };
