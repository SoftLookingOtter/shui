const test = require("node:test");
const assert = require("node:assert/strict");
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} = require("@aws-sdk/lib-dynamodb");
const { SSMClient, GetParameterCommand } = require("@aws-sdk/client-ssm");
const { createAccessToken } = require("../../src/auth/token");

const previousPostsTableName = process.env.POSTS_TABLE_NAME;
const previousCommentsTableName = process.env.COMMENTS_TABLE_NAME;
const previousParameterName = process.env.JWT_SECRET_PARAMETER;
process.env.POSTS_TABLE_NAME = "posts-test";
process.env.COMMENTS_TABLE_NAME = "comments-test";
process.env.JWT_SECRET_PARAMETER = "/shui/dev/jwt-secret";
const { handler } = require("../../src/handlers/create-comment");
if (previousPostsTableName === undefined) delete process.env.POSTS_TABLE_NAME;
else process.env.POSTS_TABLE_NAME = previousPostsTableName;
if (previousCommentsTableName === undefined) delete process.env.COMMENTS_TABLE_NAME;
else process.env.COMMENTS_TABLE_NAME = previousCommentsTableName;
if (previousParameterName === undefined) delete process.env.JWT_SECRET_PARAMETER;
else process.env.JWT_SECRET_PARAMETER = previousParameterName;

const testSecret = "public-test-key-not-a-real-secret";

test("create comment Lambda authenticates and permits comments on guest posts", async (t) => {
  const commands = [];
  t.mock.method(DynamoDBDocumentClient.prototype, "send", async (command) => {
    commands.push(command);
    if (command instanceof GetCommand) {
      return { Item: { id: "post-123", isGuest: true } };
    }
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
    body: JSON.stringify({
      content: "Bra inlägg!",
      username: "someone-else",
      id: "client-id",
    }),
  });
  const { comment } = JSON.parse(response.body);

  assert.equal(response.statusCode, 201);
  assert.equal(comment.postId, "post-123");
  assert.equal(comment.username, "jesper");
  assert.equal(comment.content, "Bra inlägg!");
  assert.equal(comment.id.length, 36);
  assert.equal(Number.isNaN(Date.parse(comment.createdAt)), false);
  assert.ok(commands[0] instanceof GetCommand);
  assert.equal(commands[0].input.TableName, "posts-test");
  assert.ok(commands[1] instanceof PutCommand);
  assert.equal(commands[1].input.TableName, "comments-test");
  assert.deepEqual(commands[1].input.Item, {
    ...comment,
    commentSortKey: `${comment.createdAt}#${comment.id}`,
  });
  assert.ok(secretCommand instanceof GetParameterCommand);
});

test("create comment Lambda rejects unauthenticated requests without database access", async (t) => {
  const database = t.mock.method(DynamoDBDocumentClient.prototype, "send", async () => ({}));
  const secretStore = t.mock.method(SSMClient.prototype, "send", async () => ({}));

  const response = await handler({
    headers: {},
    pathParameters: { postId: "post-123" },
    body: JSON.stringify({ content: "Hej" }),
  });

  assert.equal(response.statusCode, 401);
  assert.equal(database.mock.callCount(), 0);
  assert.equal(secretStore.mock.callCount(), 0);
});
