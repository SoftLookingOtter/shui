const test = require("node:test");
const assert = require("node:assert/strict");
const { ConditionalCheckFailedException } = require("@aws-sdk/client-dynamodb");
const { PutCommand } = require("@aws-sdk/lib-dynamodb");
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
