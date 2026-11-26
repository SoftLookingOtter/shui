const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");
const { createCommentsRepository } = require("../comments/comments-repository");
const { createPostRepository } = require("../posts/posts-repository");
const { createGetCommentsHandler } = require("../http/get-comments-handler");

const database = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const posts = createPostRepository(database, process.env.POSTS_TABLE_NAME);
const comments = createCommentsRepository(database, process.env.COMMENTS_TABLE_NAME);

const handler = createGetCommentsHandler(
  (postId) => posts.findById(postId),
  (postId) => comments.listForPost(postId),
);

module.exports = { handler };
