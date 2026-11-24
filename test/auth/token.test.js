const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const { createAccessToken, verifyAccessToken } = require("../../src/auth/token");

const testSecret = "public-test-key-not-a-real-secret";

test("creates a signed token valid for one hour", () => {
  const token = createAccessToken("jesper", testSecret);
  const payload = jwt.verify(token, testSecret, { algorithms: ["HS256"] });

  assert.equal(payload.username, "jesper");
  assert.equal(payload.exp - payload.iat, 3600);
});

test("verifies a valid token and returns its username", () => {
  const token = createAccessToken("jesper", testSecret);

  assert.deepEqual(verifyAccessToken(token, testSecret), { username: "jesper" });
});

test("rejects tokens with the wrong signature or algorithm", () => {
  const token = createAccessToken("jesper", testSecret);
  const wrongAlgorithm = jwt.sign({ username: "jesper" }, testSecret, {
    algorithm: "HS384",
    expiresIn: "1h",
  });

  assert.throws(() => verifyAccessToken(token, "another-test-key"), jwt.JsonWebTokenError);
  assert.throws(() => verifyAccessToken(wrongAlgorithm, testSecret), jwt.JsonWebTokenError);
});

test("rejects expired tokens and tokens without a username or expiration", () => {
  const expired = jwt.sign({ username: "jesper" }, testSecret, { expiresIn: -1 });
  const noUsername = jwt.sign({}, testSecret, { expiresIn: "1h" });
  const noExpiration = jwt.sign({ username: "jesper" }, testSecret);

  for (const token of [expired, noUsername, noExpiration]) {
    assert.throws(() => verifyAccessToken(token, testSecret), jwt.JsonWebTokenError);
  }
});

test("rejects missing usernames and signing secrets", () => {
  assert.throws(() => createAccessToken("", testSecret), TypeError);
  assert.throws(() => createAccessToken("jesper", ""), TypeError);
  assert.throws(() => verifyAccessToken("token", ""), TypeError);
});
