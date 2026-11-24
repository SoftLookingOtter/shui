const test = require("node:test");
const assert = require("node:assert/strict");
const { hashPassword, verifyPassword } = require("../../src/auth/password");

test("a password is stored as a hash and can be verified", async () => {
  const password = "Password123!";
  const hash = await hashPassword(password);

  assert.notEqual(hash, password);
  assert.equal(await verifyPassword(password, hash), true);
  assert.equal(await verifyPassword("WrongPassword", hash), false);
});

test("passwords exceeding bcrypt's 72-byte limit are rejected", async () => {
  const maxLengthPassword = "å".repeat(36);
  const hash = await hashPassword(maxLengthPassword);

  assert.equal(await verifyPassword(maxLengthPassword, hash), true);
  await assert.rejects(() => hashPassword("å".repeat(37)), RangeError);
  await assert.rejects(
    () => verifyPassword("å".repeat(37), "unused"),
    RangeError,
  );
});
