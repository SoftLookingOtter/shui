const { z, ZodError } = require("zod");
const { errorResponse, jsonResponse } = require("./responses");

const querySchema = z.object({
  username: z.string().min(1).optional(),
}).strict();

function createListPostsHandler(listPosts) {
  return async (event) => {
    try {
      const { username } = querySchema.parse(event.queryStringParameters ?? {});
      const posts = await listPosts(username);
      return jsonResponse(200, posts);
    } catch (error) {
      if (error instanceof ZodError) {
        return errorResponse(400, "Invalid query parameters");
      }

      console.error("Failed to list posts", error);
      return errorResponse(500, "Internal server error");
    }
  };
}

module.exports = { createListPostsHandler };
