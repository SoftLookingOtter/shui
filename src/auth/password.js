const bcrypt = require("bcrypt");

function checkPasswordLength(password) {
  if (Buffer.byteLength(password, "utf8") > 72) {
    throw new RangeError("Password must not exceed 72 bytes");
  }
}

async function hashPassword(password) {
  checkPasswordLength(password);
  return bcrypt.hash(password, 10);
}

async function verifyPassword(password, hash) {
  checkPasswordLength(password);
  return bcrypt.compare(password, hash);
}

module.exports = { hashPassword, verifyPassword };
