const { z, ZodError } = require("zod");
const { createHttpHandler } = require("./json-handler");
const { createQueryValidationMiddleware } = require("./middlewares/validate-body");
const { errorResponse, jsonResponse } = require("./responses");

const querySchema = z.object({
  username: z.string().min(1).optional(),
}).strict();

function createListPostsHandler(listPosts) {
  return createHttpHandler(
    async (event) => {
      const posts = await listPosts(event.queryStringParameters.username);
      return jsonResponse(200, posts);
    },
    (error) => {
      if (error instanceof ZodError) {
        return errorResponse(400, "Invalid query parameters");
      }
    },
    [createQueryValidationMiddleware(querySchema)],
  );
}

module.exports = { createListPostsHandler };
