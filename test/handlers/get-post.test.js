const test = require("node:test");
const assert = require("node:assert/strict");
const { DynamoDBDocumentClient, GetCommand } = require("@aws-sdk/lib-dynamodb");

const previousTableName = process.env.POSTS_TABLE_NAME;
process.env.POSTS_TABLE_NAME = "posts-test";
const { handler } = require("../../src/handlers/get-post");
if (previousTableName === undefined) delete process.env.POSTS_TABLE_NAME;
else process.env.POSTS_TABLE_NAME = previousTableName;

test("get post handler reads the configured table by path id", async (t) => {
  let command;
  t.mock.method(DynamoDBDocumentClient.prototype, "send", async (sentCommand) => {
    command = sentCommand;
    return { Item: { id: "post-123", title: "Rubrik" } };
  });

  const response = await handler({ pathParameters: { postId: "post-123" } });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(response.body), { id: "post-123", title: "Rubrik" });
  assert.ok(command instanceof GetCommand);
  assert.deepEqual(command.input.Key, { id: "post-123" });
  assert.equal(command.input.TableName, "posts-test");
});
