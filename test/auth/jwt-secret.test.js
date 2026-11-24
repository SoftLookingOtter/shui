const test = require("node:test");
const assert = require("node:assert/strict");
const { GetParameterCommand } = require("@aws-sdk/client-ssm");
const { getJwtSecret } = require("../../src/auth/jwt-secret");

test("retrieves and decrypts the JWT secret", async () => {
  let sentCommand;
  const client = {
    async send(command) {
      sentCommand = command;
      return { Parameter: { Type: "SecureString", Value: "test-key" } };
    },
  };

  const secret = await getJwtSecret(client, "/shui/dev/jwt-secret");

  assert.equal(secret, "test-key");
  assert.ok(sentCommand instanceof GetParameterCommand);
  assert.deepEqual(sentCommand.input, {
    Name: "/shui/dev/jwt-secret",
    WithDecryption: true,
  });
});

test("rejects missing, empty, or unencrypted parameters", async () => {
  const responses = [
    {},
    { Parameter: { Type: "SecureString", Value: "" } },
    { Parameter: { Type: "String", Value: "test-key" } },
  ];

  for (const response of responses) {
    const client = { async send() { return response; } };
    await assert.rejects(getJwtSecret(client, "/shui/dev/jwt-secret"));
  }
});

test("propagates Parameter Store errors", async () => {
  const error = new Error("Parameter Store unavailable");
  const client = {
    async send() {
      throw error;
    },
  };

  await assert.rejects(
    getJwtSecret(client, "/shui/dev/jwt-secret"),
    (receivedError) => receivedError === error,
  );
});
