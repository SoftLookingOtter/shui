const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");
const { SSMClient } = require("@aws-sdk/client-ssm");
const { getJwtSecret } = require("../auth/jwt-secret");
const { createPost } = require("../posts/create-post");
const { createPostRepository } = require("../posts/posts-repository");
const { createPostHandler } = require("../http/create-post-handler");

const database = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const parameterStore = new SSMClient({});
const posts = createPostRepository(database, process.env.POSTS_TABLE_NAME);
const parameterName = process.env.JWT_SECRET_PARAMETER;

const handler = createPostHandler(
  (input, username) => createPost(input, username, posts),
  () => getJwtSecret(parameterStore, parameterName),
);

module.exports = { handler };
