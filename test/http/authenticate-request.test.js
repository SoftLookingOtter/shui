const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const { createAccessToken } = require("../../src/auth/token");
const { AuthenticationError, authenticateRequest } = require("../../src/http/authenticate-request");

const secret = "public-test-secret";

test("authenticates a valid bearer token and returns its identity", async () => {
  const token = createAccessToken("jesper", secret);

  for (const header of ["Authorization", "authorization", "AUTHORIZATION"]) {
    const identity = await authenticateRequest(
      { [header]: `Bearer ${token}` },
      async () => secret,
    );
    assert.deepEqual(identity, { username: "jesper" });
  }
});

test("rejects missing or malformed authorization without retrieving the secret", async () => {
  const invalidHeaders = [
    undefined,
    {},
    { Authorization: "" },
    { Authorization: "Basic token" },
    { Authorization: "Bearer " },
    { Authorization: "Bearer token extra" },
    { Authorization: ["Bearer token"] },
    { Authorization: "Bearer token", authorization: "Bearer another" },
  ];
  let secretRequested = false;
  const getSecret = async () => {
    secretRequested = true;
    return secret;
  };

  for (const headers of invalidHeaders) {
    await assert.rejects(authenticateRequest(headers, getSecret), AuthenticationError);
  }
  assert.equal(secretRequested, false);
});

test("rejects invalid and expired bearer tokens", async () => {
  const tokens = [
    "not-a-token",
    createAccessToken("jesper", "another-public-test-secret"),
    jwt.sign({ username: "jesper" }, secret, { expiresIn: -1 }),
  ];

  for (const token of tokens) {
    await assert.rejects(
      authenticateRequest({ authorization: `Bearer ${token}` }, async () => secret),
      AuthenticationError,
    );
  }
});

test("propagates secret retrieval and configuration errors", async () => {
  const error = new Error("Parameter Store unavailable");
  const headers = { authorization: `Bearer ${createAccessToken("jesper", secret)}` };

  await assert.rejects(
    authenticateRequest(headers, async () => { throw error; }),
    (receivedError) => receivedError === error,
  );
  await assert.rejects(authenticateRequest(headers, async () => ""), TypeError);
});
