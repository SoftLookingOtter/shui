const test = require("node:test");
const assert = require("node:assert/strict");
const { GetCommand, PutCommand, QueryCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
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
  assert.equal(sentCommand.input.TableName, "posts-test");
  assert.deepEqual(sentCommand.input.Item, {
    ...post,
    feedKey: "POSTS",
    feedSortKey: `${post.createdAt}#${post.id}`,
  });
  assert.equal(sentCommand.input.ConditionExpression, "attribute_not_exists(#id)");
  assert.deepEqual(sentCommand.input.ExpressionAttributeNames, { "#id": "id" });
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

test("retrieves a post by id with a consistent read", async () => {
  let command;
  const expectedPost = { id: "post-123", title: "Rubrik" };
  const client = {
    async send(sentCommand) {
      command = sentCommand;
      return { Item: { ...expectedPost, feedKey: "POSTS", feedSortKey: "2026-11-25T10:00:00.000Z#post-123" } };
    },
  };
  const posts = createPostRepository(client, "posts-test");

  const post = await posts.findById("post-123");

  assert.deepEqual(post, expectedPost);
  assert.ok(command instanceof GetCommand);
  assert.deepEqual(command.input, {
    TableName: "posts-test",
    Key: { id: "post-123" },
    ConsistentRead: true,
  });
});

test("returns undefined when a post does not exist", async () => {
  const posts = createPostRepository({ async send() { return {}; } }, "posts-test");

  assert.equal(await posts.findById("missing"), undefined);
});

test("propagates errors when retrieving a post", async () => {
  const error = new Error("DynamoDB unavailable");
  const posts = createPostRepository({
    async send() {
      throw error;
    },
  }, "posts-test");

  await assert.rejects(posts.findById("post-123"), (receivedError) => receivedError === error);
});

test("updates only the title and content for the owner of a non-guest post", async () => {
  let command;
  const updatedPost = { id: "post-123", title: "Ny rubrik", content: "Nytt innehåll" };
  const client = {
    async send(sentCommand) {
      command = sentCommand;
      return {
        Attributes: {
          ...updatedPost,
          feedKey: "POSTS",
          feedSortKey: "2026-11-25T10:00:00.000Z#post-123",
        },
      };
    },
  };
  const posts = createPostRepository(client, "posts-test");

  const result = await posts.updateOwned("post-123", "jesper", {
    title: "Ny rubrik",
    content: "Nytt innehåll",
    updatedAt: "2026-11-25T12:00:00.000Z",
  });

  assert.deepEqual(result, updatedPost);
  assert.ok(command instanceof UpdateCommand);
  assert.equal(command.input.TableName, "posts-test");
  assert.deepEqual(command.input.Key, { id: "post-123" });
  assert.equal(command.input.ConditionExpression,
    "attribute_exists(#id) AND #username = :username AND #isGuest = :isGuest");
  assert.equal(command.input.UpdateExpression,
    "SET #title = :title, #content = :content, #updatedAt = :updatedAt");
  assert.deepEqual(command.input.ExpressionAttributeValues, {
    ":username": "jesper",
    ":isGuest": false,
    ":title": "Ny rubrik",
    ":content": "Nytt innehåll",
    ":updatedAt": "2026-11-25T12:00:00.000Z",
  });
  assert.equal(command.input.ReturnValues, "ALL_NEW");
});

test("propagates DynamoDB errors when updating a post", async () => {
  const error = new Error("DynamoDB unavailable");
  const posts = createPostRepository({
    async send() {
      throw error;
    },
  }, "posts-test");

  await assert.rejects(
    posts.updateOwned("post-123", "jesper", {
      title: "Ny rubrik",
      content: "Nytt innehåll",
      updatedAt: "2026-11-25T12:00:00.000Z",
    }),
    (receivedError) => receivedError === error,
  );
});

test("queries every feed page newest-first and hides index keys", async () => {
  const commands = [];
  const client = {
    async send(command) {
      commands.push(command);
      if (commands.length === 1) {
        return {
          Items: [{
            id: "newer",
            createdAt: "2026-11-25T10:00:00.000Z",
            feedKey: "POSTS",
            feedSortKey: "2026-11-25T10:00:00.000Z#newer",
          }],
          LastEvaluatedKey: {
            id: "newer",
            feedKey: "POSTS",
            feedSortKey: "2026-11-25T10:00:00.000Z#newer",
          },
        };
      }
      return {
        Items: [{
          id: "older",
          createdAt: "2026-11-24T10:00:00.000Z",
          feedKey: "POSTS",
          feedSortKey: "2026-11-24T10:00:00.000Z#older",
        }],
      };
    },
  };
  const posts = createPostRepository(client, "posts-test");

  const result = await posts.list();

  assert.deepEqual(result, [
    { id: "newer", createdAt: "2026-11-25T10:00:00.000Z" },
    { id: "older", createdAt: "2026-11-24T10:00:00.000Z" },
  ]);
  assert.ok(commands.every((command) => command instanceof QueryCommand));
  assert.deepEqual(commands.map(({ input }) => input), [
    {
      TableName: "posts-test",
      IndexName: "PostsFeedIndex",
      KeyConditionExpression: "#feedKey = :feedKey",
      ExpressionAttributeNames: { "#feedKey": "feedKey" },
      ExpressionAttributeValues: { ":feedKey": "POSTS" },
      ScanIndexForward: false,
    },
    {
      TableName: "posts-test",
      IndexName: "PostsFeedIndex",
      KeyConditionExpression: "#feedKey = :feedKey",
      ExpressionAttributeNames: { "#feedKey": "feedKey" },
      ExpressionAttributeValues: { ":feedKey": "POSTS" },
      ScanIndexForward: false,
      ExclusiveStartKey: {
        id: "newer",
        feedKey: "POSTS",
        feedSortKey: "2026-11-25T10:00:00.000Z#newer",
      },
    },
  ]);
});

test("queries the username index across all pages", async () => {
  const commands = [];
  let page = 0;
  const client = {
    async send(command) {
      commands.push(command);
      page += 1;
      return page === 1
        ? {
          Items: [{
            id: "post-2",
            username: "jesper",
            createdAt: "2026-11-25T10:00:00.000Z",
            feedKey: "POSTS",
            feedSortKey: "2026-11-25T10:00:00.000Z#post-2",
          }],
          LastEvaluatedKey: {
            id: "post-2",
            username: "jesper",
            feedSortKey: "2026-11-25T10:00:00.000Z#post-2",
          },
        }
        : {
          Items: [{
            id: "post-1",
            username: "jesper",
            createdAt: "2026-11-24T10:00:00.000Z",
            feedKey: "POSTS",
            feedSortKey: "2026-11-24T10:00:00.000Z#post-1",
          }],
        };
    },
  };
  const posts = createPostRepository(client, "posts-test");

  const result = await posts.list("jesper");

  assert.deepEqual(result, [
    { id: "post-2", username: "jesper", createdAt: "2026-11-25T10:00:00.000Z" },
    { id: "post-1", username: "jesper", createdAt: "2026-11-24T10:00:00.000Z" },
  ]);
  assert.ok(commands.every((command) => command instanceof QueryCommand));
  assert.deepEqual(commands.map(({ input }) => input.IndexName), [
    "PostsByUsernameIndex",
    "PostsByUsernameIndex",
  ]);
  assert.deepEqual(commands[0].input.KeyConditionExpression, "#username = :username");
  assert.deepEqual(commands[0].input.ExpressionAttributeNames, { "#username": "username" });
  assert.deepEqual(commands[0].input.ExpressionAttributeValues, { ":username": "jesper" });
  assert.equal(commands[0].input.ScanIndexForward, false);
  assert.deepEqual(commands[1].input.ExclusiveStartKey, {
    id: "post-2",
    username: "jesper",
    feedSortKey: "2026-11-25T10:00:00.000Z#post-2",
  });
});

test("returns an empty list when there are no posts", async () => {
  const posts = createPostRepository({ async send() { return {}; } }, "posts-test");

  assert.deepEqual(await posts.list(), []);
});

test("propagates DynamoDB errors when listing posts", async () => {
  const error = new Error("DynamoDB unavailable");
  const posts = createPostRepository({
    async send() {
      throw error;
    },
  }, "posts-test");

  await assert.rejects(posts.list(), (receivedError) => receivedError === error);
});
