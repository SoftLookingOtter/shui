const test = require("node:test");
const assert = require("node:assert/strict");
const { DynamoDBDocumentClient, GetCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");

const previousPostsTableName = process.env.POSTS_TABLE_NAME;
const previousCommentsTableName = process.env.COMMENTS_TABLE_NAME;
process.env.POSTS_TABLE_NAME = "posts-test";
process.env.COMMENTS_TABLE_NAME = "comments-test";
const { handler } = require("../../src/handlers/get-comments");
if (previousPostsTableName === undefined) delete process.env.POSTS_TABLE_NAME;
else process.env.POSTS_TABLE_NAME = previousPostsTableName;
if (previousCommentsTableName === undefined) delete process.env.COMMENTS_TABLE_NAME;
else process.env.COMMENTS_TABLE_NAME = previousCommentsTableName;

test("get comments handler verifies the post then queries its comments", async (t) => {
  const commands = [];
  t.mock.method(DynamoDBDocumentClient.prototype, "send", async (command) => {
    commands.push(command);
    if (command instanceof GetCommand) {
      return { Item: { id: "post-123" } };
    }
    return { Items: [{ id: "comment-123", postId: "post-123" }] };
  });

  const response = await handler({ pathParameters: { postId: "post-123" } });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(response.body), [{ id: "comment-123", postId: "post-123" }]);
  assert.ok(commands[0] instanceof GetCommand);
  assert.deepEqual(commands[0].input.Key, { id: "post-123" });
  assert.equal(commands[0].input.TableName, "posts-test");
  assert.ok(commands[1] instanceof QueryCommand);
  assert.equal(commands[1].input.TableName, "comments-test");
  assert.deepEqual(commands[1].input.ExpressionAttributeValues, { ":postId": "post-123" });
});
