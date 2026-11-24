const test = require("node:test");
const assert = require("node:assert/strict");
const { InvalidCredentialsError } = require("../../src/auth/authenticate-user");
const { credentialsSchema } = require("../../src/auth/credentials-schema");
const { createLoginHandler } = require("../../src/http/login-handler");

test("returns a token when login succeeds", async () => {
  let receivedInput;
  const login = async (input) => {
    receivedInput = input;
    return { username: input.username, token: "test-token" };
  };
  const handler = createLoginHandler(login);

  const response = await handler({
    body: JSON.stringify({ username: "jesper", password: "Password123!" }),
  });

  assert.deepEqual(receivedInput, {
    username: "jesper",
    password: "Password123!",
  });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(response.body), {
    message: "Login successful",
    token: "test-token",
    username: "jesper",
  });
});

test("accepts a base64-encoded JSON body", async () => {
  const handler = createLoginHandler(async ({ username }) => ({ username, token: "test-token" }));
  const body = JSON.stringify({ username: "jesper", password: "Password123!" });

  const response = await handler({
    body: Buffer.from(body).toString("base64"),
    isBase64Encoded: true,
  });

  assert.equal(response.statusCode, 200);
  assert.equal(JSON.parse(response.body).username, "jesper");
});

test("returns 400 for missing, malformed, or invalid input", async () => {
  let called = false;
  const handler = createLoginHandler(async (input) => {
    called = true;
    return credentialsSchema.parse(input);
  });

  for (const body of [undefined, "", "{"]) {
    const response = await handler({ body });
    assert.equal(response.statusCode, 400);
    assert.equal(typeof JSON.parse(response.body).error, "string");
  }
  assert.equal(called, false);

  const response = await handler({ body: JSON.stringify({ username: "jesper", password: "" }) });
  assert.equal(response.statusCode, 400);
  assert.equal(typeof JSON.parse(response.body).error, "string");
});

test("returns 401 for incorrect login credentials", async () => {
  const handler = createLoginHandler(async () => {
    throw new InvalidCredentialsError();
  });

  const response = await handler({
    body: JSON.stringify({ username: "jesper", password: "WrongPassword" }),
  });

  assert.equal(response.statusCode, 401);
  assert.equal(typeof JSON.parse(response.body).error, "string");
});

test("logs unexpected errors and returns 500 without exposing details", async (t) => {
  const log = t.mock.method(console, "error", () => {});
  const handler = createLoginHandler(async () => {
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
