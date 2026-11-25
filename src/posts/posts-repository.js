const { PutCommand } = require("@aws-sdk/lib-dynamodb");

function createPostRepository(client, tableName) {
  return {
    async create(post) {
      await client.send(new PutCommand({
        TableName: tableName,
        Item: post,
        ConditionExpression: "attribute_not_exists(#id)",
        ExpressionAttributeNames: { "#id": "id" },
      }));
    },
  };
}

module.exports = { createPostRepository };
