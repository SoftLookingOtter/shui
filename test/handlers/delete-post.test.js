const test = require("node:test");
const assert = require("node:assert/strict");
const { ConditionalCheckFailedException } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, DeleteCommand } = require("@aws-sdk/lib-dynamodb");
const { SSMClient, GetParameterCommand } = require("@aws-sdk/client-ssm");
const { createAccessToken } = require("../../src/auth/token");

const previousTableName = process.env.POSTS_TABLE_NAME;
const previousParameterName = process.env.JWT_SECRET_PARAMETER;
process.env.POSTS_TABLE_NAME = "posts-test";
process.env.JWT_SECRET_PARAMETER = "/shui/dev/jwt-secret";
const { handler } = require("../../src/handlers/delete-post");
if (previousTableName === undefined) delete process.env.POSTS_TABLE_NAME;
else process.env.POSTS_TABLE_NAME = previousTableName;
if (previousParameterName === undefined) delete process.env.JWT_SECRET_PARAMETER;
else process.env.JWT_SECRET_PARAMETER = previousParameterName;

const testSecret = "public-test-key-not-a-real-secret";
const ownedPost = { id: "post-123", username: "jesper", isGuest: false };

test("delete post Lambda authorizes and conditionally deletes the owner post", async (t) => {
  const commands = [];
  t.mock.method(DynamoDBDocumentClient.prototype, "send", async (command) => {
    commands.push(command);
    return {};
  });
  let secretCommand;
  t.mock.method(SSMClient.prototype, "send", async (command) => {
    secretCommand = command;
    return { Parameter: { Type: "SecureString", Value: testSecret } };
  });

  const response = await handler({
    headers: { authorization: `Bearer ${createAccessToken("jesper", testSecret)}` },
    pathParameters: { postId: "post-123" },
  });

  assert.equal(response.statusCode, 204);
  assert.equal(response.body, undefined);
  assert.ok(commands[0] instanceof DeleteCommand);
  assert.equal(commands[0].input.TableName, "posts-test");
  assert.equal(commands[0].input.ConditionExpression,
    "attribute_exists(#id) AND #username = :username AND #isGuest = :isGuest");
  assert.equal(commands[0].input.ExpressionAttributeValues[":username"], "jesper");
  assert.equal(commands[0].input.ExpressionAttributeValues[":isGuest"], false);
  assert.ok(secretCommand instanceof GetParameterCommand);
});

test("delete post Lambda returns forbidden when the user is not the owner", async (t) => {
  let deleteAttempted = false;
  t.mock.method(DynamoDBDocumentClient.prototype, "send", async (command) => {
    if (command instanceof DeleteCommand) {
      deleteAttempted = true;
      throw new ConditionalCheckFailedException({
        message: "Post is not owned by the user",
        $metadata: {},
      });
    }
    return { Item: { ...ownedPost, username: "anna" } };
  });
  t.mock.method(SSMClient.prototype, "send", async () => ({
    Parameter: { Type: "SecureString", Value: testSecret },
  }));

  const response = await handler({
    headers: { authorization: `Bearer ${createAccessToken("jesper", testSecret)}` },
    pathParameters: { postId: "post-123" },
  });

  assert.equal(response.statusCode, 403);
  assert.equal(deleteAttempted, true);
});
