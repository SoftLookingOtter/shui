const test = require("node:test");
const assert = require("node:assert/strict");
const { ConditionalCheckFailedException } = require("@aws-sdk/client-dynamodb");
const { GetCommand, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { createUserRepository } = require("../../src/auth/users-repository");

test("saves a user with a unique username condition", async () => {
  let sentCommand;
  const client = {
    async send(command) {
      sentCommand = command;
    },
  };
  const users = createUserRepository(client, "users-test");

  await users.create({ username: "jesper", passwordHash: "test-hash" });

  assert.ok(sentCommand instanceof PutCommand);
  assert.equal(sentCommand.input.TableName, "users-test");
  assert.deepEqual(sentCommand.input.Item, {
    username: "jesper",
    passwordHash: "test-hash",
  });
  assert.equal(
    sentCommand.input.ConditionExpression,
    "attribute_not_exists(#username)",
  );
  assert.deepEqual(sentCommand.input.ExpressionAttributeNames, {
    "#username": "username",
  });
});

test("propagates DynamoDB errors, including duplicate usernames", async () => {
  const errors = [
    new Error("DynamoDB unavailable"),
    new ConditionalCheckFailedException({
      message: "Username already exists",
      $metadata: {},
    }),
  ];

  for (const error of errors) {
    const client = {
      async send() {
        throw error;
      },
    };
    const users = createUserRepository(client, "users-test");

    await assert.rejects(
      users.create({ username: "jesper", passwordHash: "test-hash" }),
      (receivedError) => receivedError === error,
    );
  }
});

test("retrieves a user by username", async () => {
  let sentCommand;
  const expectedUser = { username: "jesper", passwordHash: "test-hash" };
  const client = {
    async send(command) {
      sentCommand = command;
      return { Item: expectedUser };
    },
  };
  const users = createUserRepository(client, "users-test");

  const user = await users.findByUsername("jesper");

  assert.deepEqual(user, expectedUser);
  assert.ok(sentCommand instanceof GetCommand);
  assert.deepEqual(sentCommand.input, {
    TableName: "users-test",
    Key: { username: "jesper" },
    ConsistentRead: true,
  });
});

test("returns undefined when the user does not exist", async () => {
  const users = createUserRepository({ async send() { return {}; } }, "users-test");

  assert.equal(await users.findByUsername("missing"), undefined);
});

test("propagates errors when retrieving a user", async () => {
  const error = new Error("DynamoDB unavailable");
  const client = {
    async send() {
      throw error;
    },
  };
  const users = createUserRepository(client, "users-test");

  await assert.rejects(users.findByUsername("jesper"), (receivedError) => receivedError === error);
});
