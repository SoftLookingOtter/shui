const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");
const { createUserRepository } = require("../auth/users-repository");
const { registerUser } = require("../auth/register-user");
const { createRegisterHandler } = require("../http/register-handler");

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const users = createUserRepository(client, process.env.USERS_TABLE_NAME);

const handler = createRegisterHandler((input) => registerUser(input, users));

module.exports = { handler };