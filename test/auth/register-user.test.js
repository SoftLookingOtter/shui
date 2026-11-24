const test = require("node:test");
const assert = require("node:assert/strict");
const { verifyPassword } = require("../../src/auth/password");
const { registerUser } = require("../../src/auth/register-user");

test("registers a user using a hashed password", async () => {
  let savedUser;
  const users = {
    async create(user) {
      savedUser = user;
    },
  };
  const password = "Password123!";

  const result = await registerUser({ username: "jesper", password }, users);

  assert.deepEqual(result, { username: "jesper" });
  assert.deepEqual(Object.keys(savedUser).sort(), ["passwordHash", "username"]);
  assert.equal(savedUser.username, "jesper");
  assert.notEqual(savedUser.passwordHash, password);
  assert.equal(await verifyPassword(password, savedUser.passwordHash), true);
});

test("rejects invalid input without saving a user", async () => {
  let saved = false;
  const users = {
    async create() {
      saved = true;
    },
  };

  await assert.rejects(
    registerUser({ username: "jesper", password: "" }, users),
    { name: "ZodError" },
  );
  assert.equal(saved, false);
});

test("propagates errors when saving a user fails", async () => {
  const error = new Error("Database unavailable");
  const users = {
    async create() {
      throw error;
    },
  };

  await assert.rejects(
    registerUser({ username: "jesper", password: "Password123!" }, users),
    (receivedError) => receivedError === error,
  );
});
