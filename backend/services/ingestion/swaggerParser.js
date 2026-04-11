const fetch = require("node-fetch");

/**
 * Swagger/OpenAPI Parser Service
 * Fetches and parses Swagger/OpenAPI specs into normalized endpoint data.
 */
class SwaggerParser {
  /**
   * Parse input into structured API data.
   * @param {string|object} input - Swagger URL, JSON string, or raw endpoint list
   * @param {string} inputType - "swagger_url" | "swagger_json" | "raw"
   */
  async parse(input, inputType = "swagger_url") {
    let spec;

    if (inputType === "swagger_url" || (typeof input === "string" && input.startsWith("http"))) {
      spec = await this.fetchSpec(input);
    } else if (inputType === "swagger_json" || typeof input === "object") {
      spec = typeof input === "string" ? JSON.parse(input) : input;
    } else if (inputType === "raw") {
      return this.parseRawEndpoints(input);
    } else {
      // Try to detect
      if (typeof input === "string" && input.startsWith("http")) {
        spec = await this.fetchSpec(input);
      } else if (typeof input === "string") {
        try {
          spec = JSON.parse(input);
        } catch {
          return this.parseRawEndpoints(input);
        }
      } else {
        spec = input;
      }
    }

    return this.parseSpec(spec, typeof input === "string" ? input : "");
  }

  async fetchSpec(url) {
    const response = await fetch(url, {
      headers: { "Accept": "application/json" },
      timeout: 15000,
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch Swagger spec: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }

  parseSpec(spec, sourceUrl = "") {
    const isV3 = spec.openapi && spec.openapi.startsWith("3");
    const title = spec.info?.title || "Unknown API";
    const version = spec.info?.version || "unknown";
    const baseUrl = this.extractBaseUrl(spec, sourceUrl);

    const endpoints = [];
    const schemas = {};
    const criticalEndpoints = [];

    // Extract endpoints from paths
    const paths = spec.paths || {};
    for (const [path, methods] of Object.entries(paths)) {
      for (const [method, operation] of Object.entries(methods)) {
        if (["get", "post", "put", "delete", "patch", "head", "options"].indexOf(method.toLowerCase()) === -1) {
          continue;
        }

        const endpoint = this.extractEndpoint(method, path, operation, isV3, spec);
        endpoints.push(endpoint);

        // Detect critical endpoints
        if (this.isCriticalEndpoint(endpoint)) {
          criticalEndpoints.push(`${method.toUpperCase()} ${path}`);
        }
      }
    }

    // Extract schemas
    const schemaDefs = isV3
      ? spec.components?.schemas || {}
      : spec.definitions || {};

    for (const [name, schema] of Object.entries(schemaDefs)) {
      schemas[name] = this.flattenSchema(schema, schemaDefs);
    }

    // Build data flow graph
    const dataFlowGraph = this.buildDataFlowGraph(endpoints, schemas);

    return {
      title,
      version,
      baseUrl,
      swaggerUrl: sourceUrl,
      inputType: sourceUrl.startsWith("http") ? "swagger_url" : "swagger_json",
      endpointCount: endpoints.length,
      endpoints,
      schemas,
      dataFlowGraph,
      criticalEndpoints,
    };
  }

  extractBaseUrl(spec, sourceUrl) {
    // OpenAPI 3.x
    if (spec.servers && spec.servers.length > 0) {
      return spec.servers[0].url;
    }
    // Swagger 2.0
    if (spec.host) {
      const scheme = (spec.schemes && spec.schemes[0]) || "https";
      const basePath = spec.basePath || "";
      return `${scheme}://${spec.host}${basePath}`;
    }
    // Fallback: derive from source URL
    if (sourceUrl && sourceUrl.startsWith("http")) {
      try {
        const url = new URL(sourceUrl);
        return `${url.protocol}//${url.host}`;
      } catch { /* ignore */ }
    }
    return "";
  }

  extractEndpoint(method, path, operation, isV3, spec) {
    const params = [];

    // Path/query/header params
    const opParams = operation.parameters || [];
    for (const p of opParams) {
      if (p.$ref) continue; // skip unresolved refs
      params.push({
        name: p.name,
        in: p.in,
        type: p.schema?.type || p.type || "string",
        required: p.required || false,
        description: p.description || "",
      });
    }

    // Request body (v3)
    let requestBody = null;
    if (isV3 && operation.requestBody) {
      const content = operation.requestBody.content;
      const jsonContent = content?.["application/json"];
      if (jsonContent?.schema) {
        requestBody = this.resolveRef(jsonContent.schema, spec);
      }
    }
    // Body param (v2)
    if (!isV3) {
      const bodyParam = opParams.find(p => p.in === "body");
      if (bodyParam?.schema) {
        requestBody = this.resolveRef(bodyParam.schema, spec);
      }
    }

    // Response schema
    let responseSchema = null;
    const successResponse = operation.responses?.["200"] || operation.responses?.["201"];
    if (successResponse) {
      if (isV3) {
        const content = successResponse.content?.["application/json"];
        if (content?.schema) {
          responseSchema = this.resolveRef(content.schema, spec);
        }
      } else if (successResponse.schema) {
        responseSchema = this.resolveRef(successResponse.schema, spec);
      }
    }

    // Detect auth requirement
    const authRequired = !!(
      operation.security?.length > 0 ||
      (operation.security === undefined && spec.security?.length > 0)
    );

    // Risk level
    const riskLevel = this.assessRisk(method, path, operation, authRequired);

    return {
      method: method.toUpperCase(),
      path,
      params,
      requestBody,
      responseSchema,
      authRequired,
      riskLevel,
      tags: operation.tags || [],
      description: operation.summary || operation.description || "",
    };
  }

  resolveRef(schema, spec) {
    if (!schema) return null;
    if (schema.$ref) {
      const refPath = schema.$ref.replace("#/", "").split("/");
      let resolved = spec;
      for (const segment of refPath) {
        resolved = resolved?.[segment];
      }
      return resolved ? this.simplifySchema(resolved) : { $ref: schema.$ref };
    }
    return this.simplifySchema(schema);
  }

  simplifySchema(schema) {
    if (!schema) return null;
    if (schema.type === "object" && schema.properties) {
      const result = {};
      for (const [key, val] of Object.entries(schema.properties)) {
        if (val.type === "object" && val.properties) {
          result[key] = this.simplifySchema(val);
        } else if (val.type === "array") {
          result[key] = `array<${val.items?.type || "object"}>`;
        } else {
          let typeStr = val.type || "string";
          if (val.format) typeStr += ` (${val.format})`;
          result[key] = typeStr;
        }
      }
      return result;
    }
    if (schema.type === "array") {
      return { items: this.simplifySchema(schema.items) };
    }
    return schema.type || "object";
  }

  flattenSchema(schema, allSchemas) {
    if (!schema || !schema.properties) return {};
    const result = {};
    for (const [key, val] of Object.entries(schema.properties)) {
      if (val.$ref) {
        const refName = val.$ref.split("/").pop();
        result[key] = `ref<${refName}>`;
      } else if (val.type === "array" && val.items) {
        const itemType = val.items.$ref ? val.items.$ref.split("/").pop() : val.items.type;
        result[key] = `array<${itemType}>`;
      } else if (val.type === "object" && val.properties) {
        result[key] = this.flattenSchema(val, allSchemas);
      } else {
        let typeStr = val.type || "string";
        if (val.format) typeStr += ` (${val.format})`;
        // Mark potentially sensitive fields
        const sensitiveFields = ["password", "secret", "token", "key", "hash", "ssn", "credit_card"];
        if (sensitiveFields.some(s => key.toLowerCase().includes(s))) {
          typeStr += " (sensitive)";
        }
        result[key] = typeStr;
      }
    }
    return result;
  }

  assessRisk(method, path, operation, authRequired) {
    const highRiskPaths = ["/admin", "/login", "/auth", "/token", "/password", "/payment", "/billing", "/user", "/account", "/delete"];
    const pathLower = path.toLowerCase();

    if (highRiskPaths.some(hr => pathLower.includes(hr))) {
      if (!authRequired) return "critical";
      return "high";
    }
    if (["delete", "put", "patch"].includes(method.toLowerCase())) {
      return authRequired ? "medium" : "high";
    }
    if (method.toLowerCase() === "post") {
      return authRequired ? "medium" : "high";
    }
    return "low";
  }

  isCriticalEndpoint(endpoint) {
    const criticalPatterns = [
      /\/admin/i, /\/login/i, /\/auth/i, /\/token/i,
      /\/password/i, /\/payment/i, /\/billing/i,
      /\/user/i, /\/account/i, /\/register/i,
      /\/api[_-]?key/i, /\/secret/i, /\/role/i
    ];
    return (
      criticalPatterns.some(p => p.test(endpoint.path)) ||
      endpoint.riskLevel === "critical" ||
      endpoint.riskLevel === "high"
    );
  }

  buildDataFlowGraph(endpoints, schemas) {
    const resources = new Set();
    const edges = [];

    // Extract resources from paths
    for (const ep of endpoints) {
      const segments = ep.path.split("/").filter(s => s && !s.startsWith("{"));
      if (segments.length > 0) {
        const resource = segments[segments.length - 1];
        resources.add(this.capitalise(resource));
      }
    }

    // Build edges from schema references
    for (const [name, schema] of Object.entries(schemas)) {
      if (typeof schema === "object") {
        for (const [field, type] of Object.entries(schema)) {
          if (typeof type === "string") {
            const refMatch = type.match(/ref<(\w+)>/) || type.match(/array<(\w+)>/);
            if (refMatch && resources.has(refMatch[1])) {
              edges.push({ from: name, to: refMatch[1], relation: field });
            }
          }
        }
      }
    }

    return {
      nodes: Array.from(resources),
      edges,
    };
  }

  parseRawEndpoints(input) {
    const lines = input.split("\n").filter(l => l.trim());
    const endpoints = [];

    for (const line of lines) {
      const match = line.match(/^\s*(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+(\S+)/i);
      if (match) {
        endpoints.push({
          method: match[1].toUpperCase(),
          path: match[2],
          params: [],
          requestBody: null,
          responseSchema: null,
          authRequired: false,
          riskLevel: "medium",
          tags: [],
          description: "",
        });
      }
    }

    return {
      title: "Custom API",
      version: "1.0",
      baseUrl: "",
      swaggerUrl: "",
      inputType: "raw",
      endpointCount: endpoints.length,
      endpoints,
      schemas: {},
      dataFlowGraph: { nodes: [], edges: [] },
      criticalEndpoints: [],
    };
  }

  capitalise(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

module.exports = new SwaggerParser();
