const test = require("node:test");
const assert = require("node:assert/strict");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { verifyPassword } = require("../../src/auth/password");

const previousTableName = process.env.USERS_TABLE_NAME;
process.env.USERS_TABLE_NAME = "users-test";
const { handler } = require("../../src/handlers/register");
if (previousTableName === undefined) {
  delete process.env.USERS_TABLE_NAME;
} else {
  process.env.USERS_TABLE_NAME = previousTableName;
}

test("register handler validates, hashes and sends the user to DynamoDB", async (t) => {
  let command;
  t.mock.method(DynamoDBDocumentClient.prototype, "send", async (sentCommand) => {
    command = sentCommand;
  });

  const password = "Password123!";
  const response = await handler({
    body: JSON.stringify({ username: "jesper", password }),
  });

  assert.equal(response.statusCode, 201);
  assert.deepEqual(JSON.parse(response.body), {
    message: "User registered successfully",
    username: "jesper",
  });
  assert.ok(command instanceof PutCommand);
  assert.equal(command.input.TableName, "users-test");
  assert.deepEqual(Object.keys(command.input.Item).sort(), ["passwordHash", "username"]);
  assert.equal(command.input.Item.username, "jesper");
  assert.notEqual(command.input.Item.passwordHash, password);
  assert.equal(await verifyPassword(password, command.input.Item.passwordHash), true);
});
