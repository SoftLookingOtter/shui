const { z } = require("zod");

const commentInputSchema = z.object({
  content: z.string().min(1),
});

module.exports = { commentInputSchema };
