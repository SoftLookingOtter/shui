const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");
const { SSMClient } = require("@aws-sdk/client-ssm");
const { getJwtSecret } = require("../auth/jwt-secret");
const { createCommentsRepository } = require("../comments/comments-repository");
const { createComment } = require("../comments/create-comment");
const { createPostRepository } = require("../posts/posts-repository");
const { createCommentHandler } = require("../http/create-comment-handler");

const database = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const parameterStore = new SSMClient({});
const posts = createPostRepository(database, process.env.POSTS_TABLE_NAME);
const comments = createCommentsRepository(database, process.env.COMMENTS_TABLE_NAME);
const parameterName = process.env.JWT_SECRET_PARAMETER;

const handler = createCommentHandler(
  (input, postId, username) => createComment(input, postId, username, posts, comments),
  () => getJwtSecret(parameterStore, parameterName),
);

module.exports = { handler };
