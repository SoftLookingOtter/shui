const {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");

const FEED_PARTITION_KEY = "POSTS";

function withoutIndexKeys(post) {
  if (!post) {
    return post;
  }

  const { feedKey, feedSortKey, ...publicPost } = post;
  return publicPost;
}

function createPostRepository(client, tableName) {
  return {
    async create(post) {
      await client.send(new PutCommand({
        TableName: tableName,
        Item: {
          ...post,
          feedKey: FEED_PARTITION_KEY,
          feedSortKey: `${post.createdAt}#${post.id}`,
        },
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
      return withoutIndexKeys(result.Item);
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
      return withoutIndexKeys(result.Attributes);
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
      let queryOptions;

      if (username === undefined) {
        queryOptions = {
          IndexName: "PostsFeedIndex",
          KeyConditionExpression: "#feedKey = :feedKey",
          ExpressionAttributeNames: { "#feedKey": "feedKey" },
          ExpressionAttributeValues: { ":feedKey": FEED_PARTITION_KEY },
        };
      } else {
        queryOptions = {
          IndexName: "PostsByUsernameIndex",
          KeyConditionExpression: "#username = :username",
          ExpressionAttributeNames: { "#username": "username" },
          ExpressionAttributeValues: { ":username": username },
        };
      }

      do {
        const result = await client.send(new QueryCommand({
          TableName: tableName,
          ...queryOptions,
          ScanIndexForward: false,
          ...(exclusiveStartKey === undefined ? {} : {
            ExclusiveStartKey: exclusiveStartKey,
          }),
        }));
        posts.push(...(result.Items ?? []));
        exclusiveStartKey = result.LastEvaluatedKey;
      } while (exclusiveStartKey !== undefined);

      return posts.map(withoutIndexKeys);
    },
  };
}

module.exports = { createPostRepository };
