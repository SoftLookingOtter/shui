const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");
const { createPostRepository } = require("../posts/posts-repository");
const { createListPostsHandler } = require("../http/list-posts-handler");

const database = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const posts = createPostRepository(database, process.env.POSTS_TABLE_NAME);

const handler = createListPostsHandler((username) => posts.list(username));

module.exports = { handler };
