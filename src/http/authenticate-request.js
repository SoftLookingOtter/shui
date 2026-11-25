const { JsonWebTokenError } = require("jsonwebtoken");
const { verifyAccessToken } = require("../auth/token");

class AuthenticationError extends Error {}

async function authenticateRequest(headers, getSecret) {
  const authorizationHeaders = Object.entries(headers ?? {})
    .filter(([name]) => name.toLowerCase() === "authorization");
  if (authorizationHeaders.length !== 1) {
    throw new AuthenticationError("A bearer token is required");
  }

  const value = authorizationHeaders[0][1];
  const match = typeof value === "string" && /^Bearer +(\S+)$/i.exec(value);
  if (!match) {
    throw new AuthenticationError("A bearer token is required");
  }

  const secret = await getSecret();
  try {
    return verifyAccessToken(match[1], secret);
  } catch (error) {
    if (error instanceof JsonWebTokenError) {
      throw new AuthenticationError("Invalid bearer token");
    }
    throw error;
  }
}

module.exports = { AuthenticationError, authenticateRequest };
