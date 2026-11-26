const { DeleteCommand, PutCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");

function withoutSortKey(comment) {
  const { commentSortKey, ...publicComment } = comment;
  return publicComment;
}

function createCommentsRepository(client, tableName) {
  return {
    async create(comment) {
      await client.send(new PutCommand({
        TableName: tableName,
        Item: {
          ...comment,
          commentSortKey: `${comment.createdAt}#${comment.id}`,
        },
        ConditionExpression: "attribute_not_exists(#commentSortKey)",
        ExpressionAttributeNames: { "#commentSortKey": "commentSortKey" },
      }));
    },
    async listForPost(postId) {
      const comments = [];
      let exclusiveStartKey;

      do {
        const result = await client.send(new QueryCommand({
          TableName: tableName,
          KeyConditionExpression: "#postId = :postId",
          ExpressionAttributeNames: { "#postId": "postId" },
          ExpressionAttributeValues: { ":postId": postId },
          ScanIndexForward: true,
          ...(exclusiveStartKey === undefined ? {} : {
            ExclusiveStartKey: exclusiveStartKey,
          }),
        }));
        comments.push(...(result.Items ?? []));
        exclusiveStartKey = result.LastEvaluatedKey;
      } while (exclusiveStartKey !== undefined);

      return comments.map(withoutSortKey);
    },
    async deleteForPost(postId) {
      let exclusiveStartKey;

      do {
        const result = await client.send(new QueryCommand({
          TableName: tableName,
          KeyConditionExpression: "#postId = :postId",
          ExpressionAttributeNames: { "#postId": "postId" },
          ExpressionAttributeValues: { ":postId": postId },
          ...(exclusiveStartKey === undefined ? {} : {
            ExclusiveStartKey: exclusiveStartKey,
          }),
        }));

        for (const comment of result.Items ?? []) {
          await client.send(new DeleteCommand({
            TableName: tableName,
            Key: {
              postId: comment.postId,
              commentSortKey: comment.commentSortKey,
            },
          }));
        }

        exclusiveStartKey = result.LastEvaluatedKey;
      } while (exclusiveStartKey !== undefined);
    },
  };
}

module.exports = { createCommentsRepository };
