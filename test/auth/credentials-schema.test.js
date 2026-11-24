const test = require("node:test");
const assert = require("node:assert/strict");
const { credentialsSchema } = require("../../src/auth/credentials-schema");

test("credentialsSchema accepts a username and password", () => {
  const result = credentialsSchema.safeParse({
    username: "jesper",
    password: "Password123!",
  });

  assert.equal(result.success, true);
});

test("credentialsSchema rejects missing, empty, or non-string fields", () => {
  const invalidInputs = [
    { password: "Password123!" },
    { username: "jesper" },
    { username: "", password: "Password123!" },
    { username: "jesper", password: "" },
    { username: 123, password: "Password123!" },
    { username: "jesper", password: 123 },
  ];

  for (const input of invalidInputs) {
    assert.equal(credentialsSchema.safeParse(input).success, false);
  }
});

test("accepts a password of 72 bytes", () => {
  const result = credentialsSchema.safeParse({
    username: "jesper",
    password: "å".repeat(36),
  });

  assert.equal(result.success, true);
});

test("rejects a password over 72 bytes", () => {
  const result = credentialsSchema.safeParse({
    username: "jesper",
    password: "å".repeat(37),
  });

  assert.equal(result.success, false);
});
