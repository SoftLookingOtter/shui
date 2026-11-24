const { PutCommand } = require("@aws-sdk/lib-dynamodb");

function createUserRepository(client, tableName) {
  return {
    async create({ username, passwordHash }) {
      await client.send(new PutCommand({
        TableName: tableName,
        Item: { username, passwordHash },
        ConditionExpression: "attribute_not_exists(#username)",
        ExpressionAttributeNames: { "#username": "username" },
      }));
    },
  };
}

module.exports = { createUserRepository };
