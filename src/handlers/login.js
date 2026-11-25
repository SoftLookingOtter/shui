const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");
const { SSMClient } = require("@aws-sdk/client-ssm");
const { createUserRepository } = require("../auth/users-repository");
const { getJwtSecret } = require("../auth/jwt-secret");
const { loginUser } = require("../auth/login-user");
const { createLoginHandler } = require("../http/login-handler");

const database = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const parameterStore = new SSMClient({});
const users = createUserRepository(database, process.env.USERS_TABLE_NAME);
const parameterName = process.env.JWT_SECRET_PARAMETER;

const handler = createLoginHandler((input) =>
  loginUser(input, users, () => getJwtSecret(parameterStore, parameterName)),
);

module.exports = { handler };
