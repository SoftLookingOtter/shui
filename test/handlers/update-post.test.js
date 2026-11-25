const test = require("node:test");
const assert = require("node:assert/strict");
const { DynamoDBDocumentClient, GetCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { SSMClient, GetParameterCommand } = require("@aws-sdk/client-ssm");
const { createAccessToken } = require("../../src/auth/token");

const previousTableName = process.env.POSTS_TABLE_NAME;
const previousParameterName = process.env.JWT_SECRET_PARAMETER;
process.env.POSTS_TABLE_NAME = "posts-test";
process.env.JWT_SECRET_PARAMETER = "/shui/dev/jwt-secret";
const { handler } = require("../../src/handlers/update-post");
if (previousTableName === undefined) delete process.env.POSTS_TABLE_NAME;
else process.env.POSTS_TABLE_NAME = previousTableName;
if (previousParameterName === undefined) delete process.env.JWT_SECRET_PARAMETER;
else process.env.JWT_SECRET_PARAMETER = previousParameterName;

const testSecret = "public-test-key-not-a-real-secret";
const originalPost = {
  id: "post-123",
  username: "jesper",
  isGuest: false,
  title: "Gammal",
  content: "Text",
  createdAt: "2026-11-24T10:00:00.000Z",
  updatedAt: "2026-11-24T10:00:00.000Z",
};

test("update post Lambda authorizes and conditionally updates the owner post", async (t) => {
  const commands = [];
  t.mock.method(DynamoDBDocumentClient.prototype, "send", async (command) => {
    commands.push(command);
    if (command instanceof GetCommand) return { Item: originalPost };
    return { Attributes: { ...originalPost, title: "Ny", content: "Text" } };
  });
  let secretCommand;
  t.mock.method(SSMClient.prototype, "send", async (command) => {
    secretCommand = command;
    return { Parameter: { Type: "SecureString", Value: testSecret } };
  });

  const response = await handler({
    headers: { authorization: `Bearer ${createAccessToken("jesper", testSecret)}` },
    pathParameters: { postId: "post-123" },
    body: JSON.stringify({ title: "Ny", content: "Text" }),
  });

  assert.equal(response.statusCode, 200);
  assert.equal(JSON.parse(response.body).post.title, "Ny");
  assert.ok(commands[0] instanceof GetCommand);
  assert.ok(commands[1] instanceof UpdateCommand);
  assert.equal(commands[1].input.TableName, "posts-test");
  assert.equal(commands[1].input.ConditionExpression,
    "attribute_exists(#id) AND #username = :username AND #isGuest = :isGuest");
  assert.deepEqual(commands[1].input.ExpressionAttributeValues[":username"], "jesper");
  assert.equal(commands[1].input.ExpressionAttributeValues[":isGuest"], false);
  assert.ok(secretCommand instanceof GetParameterCommand);
});

test("update post Lambda does not update when the user is not the owner", async (t) => {
  let updates = 0;
  t.mock.method(DynamoDBDocumentClient.prototype, "send", async (command) => {
    if (command instanceof GetCommand) return { Item: { ...originalPost, username: "anna" } };
    updates += 1;
    return {};
  });
  t.mock.method(SSMClient.prototype, "send", async () => ({
    Parameter: { Type: "SecureString", Value: testSecret },
  }));

  const response = await handler({
    headers: { authorization: `Bearer ${createAccessToken("jesper", testSecret)}` },
    pathParameters: { postId: "post-123" },
    body: JSON.stringify({ title: "Ny", content: "Text" }),
  });

  assert.equal(response.statusCode, 403);
  assert.equal(updates, 0);
});
