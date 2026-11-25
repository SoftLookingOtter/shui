const { PutCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");

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
    async list(username) {
      const posts = [];
      let exclusiveStartKey;

      do {
        const result = await client.send(new ScanCommand({
          TableName: tableName,
          ...(username === undefined ? {} : {
            FilterExpression: "#username = :username",
            ExpressionAttributeNames: { "#username": "username" },
            ExpressionAttributeValues: { ":username": username },
          }),
          ...(exclusiveStartKey === undefined ? {} : {
            ExclusiveStartKey: exclusiveStartKey,
          }),
        }));
        posts.push(...(result.Items ?? []));
        exclusiveStartKey = result.LastEvaluatedKey;
      } while (exclusiveStartKey !== undefined);

      return posts.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
  };
}

module.exports = { createPostRepository };
