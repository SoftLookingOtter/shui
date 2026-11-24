const { verifyPassword } = require("./password");

class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid username or password");
    this.name = "InvalidCredentialsError";
  }
}

async function authenticateUser({ username, password }, users) {
  const user = await users.findByUsername(username);

  if (!user) {
    throw new InvalidCredentialsError();
  }

  const matches = await verifyPassword(password, user.passwordHash);
  if (!matches) {
    throw new InvalidCredentialsError();
  }

  return { username: user.username };
}

module.exports = { authenticateUser, InvalidCredentialsError };
