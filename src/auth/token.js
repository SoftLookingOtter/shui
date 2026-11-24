const jwt = require("jsonwebtoken");

function requireSecret(secret) {
  if (typeof secret !== "string" || secret.length === 0) {
    throw new TypeError("JWT secret is required");
  }
}

function createAccessToken(username, secret) {
  requireSecret(secret);
  if (typeof username !== "string" || username.length === 0) {
    throw new TypeError("Username is required");
  }

  return jwt.sign({ username }, secret, {
    algorithm: "HS256",
    expiresIn: "1h",
  });
}

function verifyAccessToken(token, secret) {
  requireSecret(secret);
  const payload = jwt.verify(token, secret, { algorithms: ["HS256"] });

  if (
    typeof payload !== "object" ||
    payload === null ||
    typeof payload.username !== "string" ||
    payload.username.length === 0 ||
    !Number.isFinite(payload.exp)
  ) {
    throw new jwt.JsonWebTokenError("Token must contain a username and expiration");
  }

  return { username: payload.username };
}

module.exports = { createAccessToken, verifyAccessToken };
