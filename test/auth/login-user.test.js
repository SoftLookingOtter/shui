const test = require("node:test");
const assert = require("node:assert/strict");
const { hashPassword } = require("../../src/auth/password");
const { verifyAccessToken } = require("../../src/auth/token");
const { InvalidCredentialsError } = require("../../src/auth/authenticate-user");
const { loginUser } = require("../../src/auth/login-user");

const testSecret = "public-test-key-not-a-real-secret";

test("returns a signed token after successful login", async () => {
  const password = "Password123!";
  const passwordHash = await hashPassword(password);
  const users = {
    async findByUsername(username) {
      return { username, passwordHash };
    },
  };

  const result = await loginUser(
    { username: "jesper", password },
    users,
    async () => testSecret,
  );

  assert.equal(result.username, "jesper");
  assert.deepEqual(verifyAccessToken(result.token, testSecret), {
    username: "jesper",
  });
});

test("rejects invalid input without accessing the database or secret", async () => {
  let accessed = false;
  const users = {
    async findByUsername() {
      accessed = true;
    },
  };
  const getSecret = async () => {
    accessed = true;
    return testSecret;
  };

  for (const password of ["", "å".repeat(37)]) {
    await assert.rejects(loginUser({ username: "jesper", password }, users, getSecret), {
      name: "ZodError",
    });
  }
  assert.equal(accessed, false);
});

test("rejects invalid credentials without fetching the secret", async () => {
  let secretRequested = false;
  const passwordHash = await hashPassword("Password123!");
  const users = {
    async findByUsername() {
      return { username: "jesper", passwordHash };
    },
  };
  const getSecret = async () => {
    secretRequested = true;
    return testSecret;
  };

  await assert.rejects(
    loginUser({ username: "jesper", password: "WrongPassword" }, users, getSecret),
    InvalidCredentialsError,
  );
  assert.equal(secretRequested, false);
});

test("propagates secret retrieval errors", async () => {
  const error = new Error("Parameter Store unavailable");
  const passwordHash = await hashPassword("Password123!");
  const users = {
    async findByUsername() {
      return { username: "jesper", passwordHash };
    },
  };

  await assert.rejects(
    loginUser({ username: "jesper", password: "Password123!" }, users, async () => {
      throw error;
    }),
    (receivedError) => receivedError === error,
  );
});
