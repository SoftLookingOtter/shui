const test = require("node:test");
const assert = require("node:assert/strict");
const { hashPassword } = require("../../src/auth/password");
const { authenticateUser, InvalidCredentialsError } = require("../../src/auth/authenticate-user");

test("authenticates a user with the correct password", async () => {
  const password = "Password123!";
  const passwordHash = await hashPassword(password);
  let requestedUsername;
  const users = {
    async findByUsername(username) {
      requestedUsername = username;
      return { username, passwordHash };
    },
  };

  const result = await authenticateUser(
    { username: "jesper", password },
    users,
  );

  assert.equal(requestedUsername, "jesper");
  assert.deepEqual(result, { username: "jesper" });
});

test("rejects an incorrect password or an unknown user", async () => {
  const passwordHash = await hashPassword("Password123!");
  const existingUser = {
    async findByUsername() {
      return { username: "jesper", passwordHash };
    },
  };
  const missingUser = {
    async findByUsername() {
      return undefined;
    },
  };

  await assert.rejects(
    authenticateUser({ username: "jesper", password: "WrongPassword" }, existingUser),
    InvalidCredentialsError,
  );
  await assert.rejects(
    authenticateUser({ username: "missing", password: "Password123!" }, missingUser),
    InvalidCredentialsError,
  );
});

test("propagates database errors", async () => {
  const error = new Error("Database unavailable");
  const users = {
    async findByUsername() {
      throw error;
    },
  };

  await assert.rejects(
    authenticateUser({ username: "jesper", password: "Password123!" }, users),
    (receivedError) => receivedError === error,
  );
});
