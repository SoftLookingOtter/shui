const { z } = require("zod");

const credentialsSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1).refine(
    (password) => Buffer.byteLength(password, "utf8") <= 72,
    { message: "Password must not exceed 72 bytes" },
  ),
});

module.exports = { credentialsSchema };
