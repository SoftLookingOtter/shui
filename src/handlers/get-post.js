const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");
const { createPostRepository } = require("../posts/posts-repository");
const { createGetPostHandler } = require("../http/get-post-handler");

const database = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const posts = createPostRepository(database, process.env.POSTS_TABLE_NAME);

const handler = createGetPostHandler((postId) => posts.findById(postId));

module.exports = { handler };
