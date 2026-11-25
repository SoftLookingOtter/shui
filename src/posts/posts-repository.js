const {
  DeleteCommand,
  GetCommand,
  PutCommand,
  ScanCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");

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
    async findById(id) {
      const result = await client.send(new GetCommand({
        TableName: tableName,
        Key: { id },
        ConsistentRead: true,
      }));
      return result.Item;
    },
    async updateOwned(id, username, { title, content, updatedAt }) {
      const result = await client.send(new UpdateCommand({
        TableName: tableName,
        Key: { id },
        UpdateExpression: "SET #title = :title, #content = :content, #updatedAt = :updatedAt",
        ConditionExpression: "attribute_exists(#id) AND #username = :username AND #isGuest = :isGuest",
        ExpressionAttributeNames: {
          "#id": "id",
          "#username": "username",
          "#isGuest": "isGuest",
          "#title": "title",
          "#content": "content",
          "#updatedAt": "updatedAt",
        },
        ExpressionAttributeValues: {
          ":username": username,
          ":isGuest": false,
          ":title": title,
          ":content": content,
          ":updatedAt": updatedAt,
        },
        ReturnValues: "ALL_NEW",
      }));
      return result.Attributes;
    },
    async deleteOwned(id, username) {
      await client.send(new DeleteCommand({
        TableName: tableName,
        Key: { id },
        ConditionExpression: "attribute_exists(#id) AND #username = :username AND #isGuest = :isGuest",
        ExpressionAttributeNames: {
          "#id": "id",
          "#username": "username",
          "#isGuest": "isGuest",
        },
        ExpressionAttributeValues: {
          ":username": username,
          ":isGuest": false,
        },
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
