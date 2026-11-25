const test = require("node:test");
const assert = require("node:assert/strict");
const { PutCommand } = require("@aws-sdk/lib-dynamodb");
const { createPostRepository } = require("../../src/posts/posts-repository");

test("saves a post without overwriting an existing id", async () => {
  let sentCommand;
  const client = {
    async send(command) {
      sentCommand = command;
    },
  };
  const posts = createPostRepository(client, "posts-test");
  const post = {
    id: "post-123",
    username: "jesper",
    isGuest: false,
    title: "Rubrik",
    content: "Hej",
    createdAt: "2026-11-25T12:00:00.000Z",
    updatedAt: "2026-11-25T12:00:00.000Z",
  };

  await posts.create(post);

  assert.ok(sentCommand instanceof PutCommand);
  assert.deepEqual(sentCommand.input, {
    TableName: "posts-test",
    Item: post,
    ConditionExpression: "attribute_not_exists(#id)",
    ExpressionAttributeNames: { "#id": "id" },
  });
});

test("propagates DynamoDB errors when saving a post", async () => {
  const error = new Error("DynamoDB unavailable");
  const client = {
    async send() {
      throw error;
    },
  };
  const posts = createPostRepository(client, "posts-test");

  await assert.rejects(posts.create({ id: "post-123" }), (receivedError) => receivedError === error);
});
