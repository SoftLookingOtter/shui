const test = require("node:test");
const assert = require("node:assert/strict");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { SSMClient, GetParameterCommand } = require("@aws-sdk/client-ssm");
const { createAccessToken } = require("../../src/auth/token");

const previousTableName = process.env.POSTS_TABLE_NAME;
const previousParameterName = process.env.JWT_SECRET_PARAMETER;
process.env.POSTS_TABLE_NAME = "posts-test";
process.env.JWT_SECRET_PARAMETER = "/shui/dev/jwt-secret";
const { handler } = require("../../src/handlers/create-post");
if (previousTableName === undefined) delete process.env.POSTS_TABLE_NAME;
else process.env.POSTS_TABLE_NAME = previousTableName;
if (previousParameterName === undefined) delete process.env.JWT_SECRET_PARAMETER;
else process.env.JWT_SECRET_PARAMETER = previousParameterName;

const testSecret = "public-test-key-not-a-real-secret";

test("create post handler verifies the token and saves the post", async (t) => {
  let postCommand;
  let secretCommand;
  t.mock.method(DynamoDBDocumentClient.prototype, "send", async (command) => {
    postCommand = command;
  });
  t.mock.method(SSMClient.prototype, "send", async (command) => {
    secretCommand = command;
    return { Parameter: { Type: "SecureString", Value: testSecret } };
  });

  const response = await handler({
    headers: { authorization: `Bearer ${createAccessToken("jesper", testSecret)}` },
    body: JSON.stringify({ title: "Rubrik", content: "Hej", username: "someone-else" }),
  });
  const body = JSON.parse(response.body);

  assert.equal(response.statusCode, 201);
  assert.equal(body.message, "Post created successfully");
  assert.equal(body.post.username, "jesper");
  assert.ok(postCommand instanceof PutCommand);
  assert.equal(postCommand.input.TableName, "posts-test");
  assert.deepEqual(postCommand.input.Item, body.post);
  assert.equal(postCommand.input.ConditionExpression, "attribute_not_exists(#id)");
  assert.ok(secretCommand instanceof GetParameterCommand);
  assert.deepEqual(secretCommand.input, {
    Name: "/shui/dev/jwt-secret",
    WithDecryption: true,
  });
});

test("create post handler does not save when the token is invalid", async (t) => {
  const save = t.mock.method(DynamoDBDocumentClient.prototype, "send", async () => {});
  t.mock.method(SSMClient.prototype, "send", async () => ({
    Parameter: { Type: "SecureString", Value: testSecret },
  }));

  const response = await handler({
    headers: { authorization: "Bearer invalid" },
    body: JSON.stringify({ title: "Rubrik", content: "Hej" }),
  });

  assert.equal(response.statusCode, 401);
  assert.equal(save.mock.callCount(), 0);
});

test("create post handler returns 500 when the secret cannot be retrieved", async (t) => {
  const save = t.mock.method(DynamoDBDocumentClient.prototype, "send", async () => {});
  t.mock.method(SSMClient.prototype, "send", async () => {
    throw new Error("Parameter Store unavailable");
  });
  const log = t.mock.method(console, "error", () => {});

  const response = await handler({
    headers: { authorization: `Bearer ${createAccessToken("jesper", testSecret)}` },
    body: JSON.stringify({ title: "Rubrik", content: "Hej" }),
  });

  assert.equal(response.statusCode, 500);
  assert.deepEqual(JSON.parse(response.body), { error: "Internal server error" });
  assert.equal(save.mock.callCount(), 0);
  assert.equal(log.mock.callCount(), 1);
});
