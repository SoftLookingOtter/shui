const { credentialsSchema } = require("./credentials-schema");
const { authenticateUser } = require("./authenticate-user");
const { createAccessToken } = require("./token");

async function loginUser(input, users, getSecret) {
  const credentials = credentialsSchema.parse(input);
  const { username } = await authenticateUser(credentials, users);
  const secret = await getSecret();
  const token = createAccessToken(username, secret);

  return { username, token };
}

module.exports = { loginUser };
