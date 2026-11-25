const test = require("node:test");
const assert = require("node:assert/strict");
const { DynamoDBDocumentClient, GetCommand } = require("@aws-sdk/lib-dynamodb");
const { SSMClient, GetParameterCommand } = require("@aws-sdk/client-ssm");
const { hashPassword } = require("../../src/auth/password");
const { verifyAccessToken } = require("../../src/auth/token");

const previousTableName = process.env.USERS_TABLE_NAME;
const previousParameterName = process.env.JWT_SECRET_PARAMETER;
process.env.USERS_TABLE_NAME = "users-test";
process.env.JWT_SECRET_PARAMETER = "/shui/dev/jwt-secret";
const { handler } = require("../../src/handlers/login");
if (previousTableName === undefined) delete process.env.USERS_TABLE_NAME;
else process.env.USERS_TABLE_NAME = previousTableName;
if (previousParameterName === undefined) delete process.env.JWT_SECRET_PARAMETER;
else process.env.JWT_SECRET_PARAMETER = previousParameterName;

const testSecret = "public-test-key-not-a-real-secret";

test("login handler fetches the user and secret to issue a token", async (t) => {
  const password = "Password123!";
  const passwordHash = await hashPassword(password);
  let userCommand;
  let secretCommand;
  t.mock.method(DynamoDBDocumentClient.prototype, "send", async (command) => {
    userCommand = command;
    return { Item: { username: "jesper", passwordHash } };
  });
  t.mock.method(SSMClient.prototype, "send", async (command) => {
    secretCommand = command;
    return { Parameter: { Type: "SecureString", Value: testSecret } };
  });

  const response = await handler({
    body: JSON.stringify({ username: "jesper", password }),
  });
  const body = JSON.parse(response.body);

  assert.equal(response.statusCode, 200);
  assert.equal(body.message, "Login successful");
  assert.equal(body.username, "jesper");
  assert.deepEqual(verifyAccessToken(body.token, testSecret), { username: "jesper" });
  assert.ok(userCommand instanceof GetCommand);
  assert.equal(userCommand.input.TableName, "users-test");
  assert.deepEqual(userCommand.input.Key, { username: "jesper" });
  assert.ok(secretCommand instanceof GetParameterCommand);
  assert.deepEqual(secretCommand.input, {
    Name: "/shui/dev/jwt-secret",
    WithDecryption: true,
  });
});

test("login handler does not fetch the secret for invalid credentials", async (t) => {
  const passwordHash = await hashPassword("Password123!");
  t.mock.method(DynamoDBDocumentClient.prototype, "send", async () => ({
    Item: { username: "jesper", passwordHash },
  }));
  const getSecret = t.mock.method(SSMClient.prototype, "send", async () => {
    throw new Error("Secret must not be fetched");
  });

  const response = await handler({
    body: JSON.stringify({ username: "jesper", password: "WrongPassword" }),
  });

  assert.equal(response.statusCode, 401);
  assert.equal(getSecret.mock.callCount(), 0);
});

test("login handler returns 500 when the secret cannot be retrieved", async (t) => {
  const password = "Password123!";
  const passwordHash = await hashPassword(password);
  t.mock.method(DynamoDBDocumentClient.prototype, "send", async () => ({
    Item: { username: "jesper", passwordHash },
  }));
  t.mock.method(SSMClient.prototype, "send", async () => {
    throw new Error("Parameter Store unavailable");
  });
  const log = t.mock.method(console, "error", () => {});

  const response = await handler({
    body: JSON.stringify({ username: "jesper", password }),
  });

  assert.equal(response.statusCode, 500);
  assert.deepEqual(JSON.parse(response.body), { error: "Internal server error" });
  assert.equal(log.mock.callCount(), 1);
});
