const test = require("node:test");
const assert = require("node:assert/strict");
const { registerUserSchema } = require("../../src/auth/register-schema");

test("registerUserSchema accepts a username and password", () => {
  const result = registerUserSchema.safeParse({
    username: "jesper",
    password: "Password123!",
  });

  assert.equal(result.success, true);
});

test("registerUserSchema rejects missing, empty, or non-string fields", () => {
  const invalidInputs = [
    { password: "Password123!" },
    { username: "jesper" },
    { username: "", password: "Password123!" },
    { username: "jesper", password: "" },
    { username: 123, password: "Password123!" },
    { username: "jesper", password: 123 },
  ];

  for (const input of invalidInputs) {
    assert.equal(registerUserSchema.safeParse(input).success, false);
  }
});
