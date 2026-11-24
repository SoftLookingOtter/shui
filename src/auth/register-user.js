const { credentialsSchema } = require("./credentials-schema");
const { hashPassword } = require("./password");

async function registerUser(input, users) {
  const { username, password } = credentialsSchema.parse(input);

  const passwordHash = await hashPassword(password);
  await users.create({ username, passwordHash });
  return { username };
}

module.exports = { registerUser };
