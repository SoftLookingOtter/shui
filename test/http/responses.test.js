const test = require("node:test");
const assert = require("node:assert/strict");
const { errorResponse, jsonResponse } = require("../../src/http/responses");

test("jsonResponse returns an API Gateway JSON response", () => {
  const response = jsonResponse(201, { message: "Created" });

  assert.equal(response.statusCode, 201);
  assert.equal(response.headers["Content-Type"], "application/json");
  assert.deepEqual(JSON.parse(response.body), { message: "Created" });
});

test("errorResponse uses the API error shape", () => {
  const response = errorResponse(401, "Unauthorized");

  assert.equal(response.statusCode, 401);
  assert.deepEqual(JSON.parse(response.body), { error: "Unauthorized" });
});
