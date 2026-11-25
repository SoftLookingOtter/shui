const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");
const { SSMClient } = require("@aws-sdk/client-ssm");
const { getJwtSecret } = require("../auth/jwt-secret");
const { createPostRepository } = require("../posts/posts-repository");
const { deletePost } = require("../posts/delete-post");
const { createDeletePostHandler } = require("../http/delete-post-handler");

const database = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const parameterStore = new SSMClient({});
const posts = createPostRepository(database, process.env.POSTS_TABLE_NAME);
const parameterName = process.env.JWT_SECRET_PARAMETER;

const handler = createDeletePostHandler(
  (postId, username) => deletePost(postId, username, posts),
  () => getJwtSecret(parameterStore, parameterName),
);

module.exports = { handler };
