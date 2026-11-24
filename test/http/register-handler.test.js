const test = require("node:test");
const assert = require("node:assert/strict");
const { ConditionalCheckFailedException } = require("@aws-sdk/client-dynamodb");
const { credentialsSchema } = require("../../src/auth/credentials-schema");
const { createRegisterHandler } = require("../../src/http/register-handler");

test("returns 201 when registration succeeds", async () => {
  let receivedInput;
  const register = async (input) => {
    receivedInput = input;
    return { username: input.username };
  };
  const handler = createRegisterHandler(register);

  const response = await handler({
    body: JSON.stringify({ username: "jesper", password: "Password123!" }),
  });

  assert.deepEqual(receivedInput, { username: "jesper", password: "Password123!" });
  assert.equal(response.statusCode, 201);
  assert.deepEqual(JSON.parse(response.body), {
    message: "User registered successfully",
    username: "jesper",
  });
});

test("accepts a base64-encoded request body", async () => {
  const handler = createRegisterHandler(async ({ username }) => ({ username }));
  const body = JSON.stringify({ username: "jesper", password: "Password123!" });

  const response = await handler({
    body: Buffer.from(body).toString("base64"),
    isBase64Encoded: true,
  });

  assert.equal(response.statusCode, 201);
  assert.equal(JSON.parse(response.body).username, "jesper");
});

test("returns 400 for missing or malformed JSON", async () => {
  let called = false;
  const handler = createRegisterHandler(async () => {
    called = true;
  });

  for (const body of [undefined, "", "{"]) {
    const response = await handler({ body });
    assert.equal(response.statusCode, 400);
    assert.equal(typeof JSON.parse(response.body).error, "string");
  }
  assert.equal(called, false);
});

test("returns 400 for invalid registration details", async () => {
  const handler = createRegisterHandler(async (input) => credentialsSchema.parse(input));
  const response = await handler({
    body: JSON.stringify({ username: "jesper", password: "" }),
  });

  assert.equal(response.statusCode, 400);
  assert.equal(typeof JSON.parse(response.body).error, "string");
});

test("returns 409 when the username already exists", async () => {
  const handler = createRegisterHandler(async () => {
    throw new ConditionalCheckFailedException({ message: "Duplicate", $metadata: {} });
  });
  const response = await handler({
    body: JSON.stringify({ username: "jesper", password: "Password123!" }),
  });

  assert.equal(response.statusCode, 409);
  assert.equal(typeof JSON.parse(response.body).error, "string");
});

test("logs unexpected errors and returns 500 without exposing details", async (t) => {
  const log = t.mock.method(console, "error", () => {});
  const handler = createRegisterHandler(async () => {
    throw new Error("Sensitive database details");
  });
  const response = await handler({
    body: JSON.stringify({ username: "jesper", password: "Password123!" }),
  });

  assert.equal(response.statusCode, 500);
  assert.equal(typeof JSON.parse(response.body).error, "string");
  assert.doesNotMatch(response.body, /Sensitive database details/);
  assert.equal(log.mock.callCount(), 1);
});
