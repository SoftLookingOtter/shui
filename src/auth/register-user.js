const { registerUserSchema } = require("./register-schema");
const { hashPassword } = require("./password");

async function registerUser(input, users) {
  const { username, password } = registerUserSchema.parse(input);

  const passwordHash = await hashPassword(password);
  await users.create({ username, passwordHash });
  return { username };
}

module.exports = { registerUser };
