const test = require("node:test");
const assert = require("node:assert/strict");
const { PutCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const { createCommentsRepository } = require("../../src/comments/comments-repository");

test("saves a comment with a sort key based on its creation time", async () => {
  let command;
  const client = {
    async send(sentCommand) {
      command = sentCommand;
    },
  };
  const comments = createCommentsRepository(client, "comments-test");
  const comment = {
    id: "comment-123",
    postId: "post-123",
    username: "jesper",
    content: "Bra inlägg!",
    createdAt: "2026-11-26T10:00:00.000Z",
  };

  await comments.create(comment);

  assert.ok(command instanceof PutCommand);
  assert.equal(command.input.TableName, "comments-test");
  assert.deepEqual(command.input.Item, {
    ...comment,
    commentSortKey: `${comment.createdAt}#${comment.id}`,
  });
  assert.equal(command.input.ConditionExpression, "attribute_not_exists(#commentSortKey)");
});

test("lists a post's comments oldest-first across all pages", async () => {
  const commands = [];
  const client = {
    async send(command) {
      commands.push(command);
      if (commands.length === 1) {
        return {
          Items: [{
            id: "comment-1",
            postId: "post-123",
            createdAt: "2026-11-26T10:00:00.000Z",
            commentSortKey: "2026-11-26T10:00:00.000Z#comment-1",
          }],
          LastEvaluatedKey: {
            postId: "post-123",
            commentSortKey: "2026-11-26T10:00:00.000Z#comment-1",
          },
        };
      }
      return {
        Items: [{
          id: "comment-2",
          postId: "post-123",
          createdAt: "2026-11-26T11:00:00.000Z",
          commentSortKey: "2026-11-26T11:00:00.000Z#comment-2",
        }],
      };
    },
  };
  const comments = createCommentsRepository(client, "comments-test");

  const result = await comments.listForPost("post-123");

  assert.deepEqual(result, [
    { id: "comment-1", postId: "post-123", createdAt: "2026-11-26T10:00:00.000Z" },
    { id: "comment-2", postId: "post-123", createdAt: "2026-11-26T11:00:00.000Z" },
  ]);
  assert.ok(commands.every((command) => command instanceof QueryCommand));
  assert.deepEqual(commands.map(({ input }) => input), [
    {
      TableName: "comments-test",
      KeyConditionExpression: "#postId = :postId",
      ExpressionAttributeNames: { "#postId": "postId" },
      ExpressionAttributeValues: { ":postId": "post-123" },
      ScanIndexForward: true,
    },
    {
      TableName: "comments-test",
      KeyConditionExpression: "#postId = :postId",
      ExpressionAttributeNames: { "#postId": "postId" },
      ExpressionAttributeValues: { ":postId": "post-123" },
      ScanIndexForward: true,
      ExclusiveStartKey: {
        postId: "post-123",
        commentSortKey: "2026-11-26T10:00:00.000Z#comment-1",
      },
    },
  ]);
});

test("returns an empty list when a post has no comments", async () => {
  const comments = createCommentsRepository({ async send() { return {}; } }, "comments-test");

  assert.deepEqual(await comments.listForPost("post-123"), []);
});

test("propagates DynamoDB errors when saving or listing comments", async () => {
  const error = new Error("DynamoDB unavailable");
  const comments = createCommentsRepository({
    async send() {
      throw error;
    },
  }, "comments-test");

  await assert.rejects(comments.create({ id: "comment-123" }), (receivedError) => receivedError === error);
  await assert.rejects(comments.listForPost("post-123"), (receivedError) => receivedError === error);
});
