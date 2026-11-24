const { GetCommand, PutCommand } = require("@aws-sdk/lib-dynamodb");

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
    async findByUsername(username) {
      const result = await client.send(new GetCommand({
        TableName: tableName,
        Key: { username },
        ConsistentRead: true,
      }));
      return result.Item;
    },
  };
}

module.exports = { createUserRepository };
