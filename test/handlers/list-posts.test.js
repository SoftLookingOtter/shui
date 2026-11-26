const test = require("node:test");
const assert = require("node:assert/strict");
const { DynamoDBDocumentClient, QueryCommand } = require("@aws-sdk/lib-dynamodb");

const previousTableName = process.env.POSTS_TABLE_NAME;
process.env.POSTS_TABLE_NAME = "posts-test";
const { handler } = require("../../src/handlers/list-posts");
if (previousTableName === undefined) delete process.env.POSTS_TABLE_NAME;
else process.env.POSTS_TABLE_NAME = previousTableName;

test("list posts handler queries the configured feed index", async (t) => {
  let command;
  t.mock.method(DynamoDBDocumentClient.prototype, "send", async (sentCommand) => {
    command = sentCommand;
    return {
      Items: [
        {
          id: "post-1",
          username: "jesper",
          createdAt: "2026-11-25T10:00:00.000Z",
          feedKey: "POSTS",
          feedSortKey: "2026-11-25T10:00:00.000Z#post-1",
        },
      ],
    };
  });

  const response = await handler({});

  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(response.body), [
    { id: "post-1", username: "jesper", createdAt: "2026-11-25T10:00:00.000Z" },
  ]);
  assert.ok(command instanceof QueryCommand);
  assert.equal(command.input.TableName, "posts-test");
  assert.equal(command.input.IndexName, "PostsFeedIndex");
});

test("list posts handler passes the username query to DynamoDB", async (t) => {
  let command;
  t.mock.method(DynamoDBDocumentClient.prototype, "send", async (sentCommand) => {
    command = sentCommand;
    return { Items: [] };
  });

  const response = await handler({ queryStringParameters: { username: "jesper" } });

  assert.equal(response.statusCode, 200);
  assert.ok(command instanceof QueryCommand);
  assert.equal(command.input.IndexName, "PostsByUsernameIndex");
  assert.equal(command.input.KeyConditionExpression, "#username = :username");
  assert.deepEqual(command.input.ExpressionAttributeValues, { ":username": "jesper" });
});
