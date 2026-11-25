const { ZodError } = require("zod");
const { AuthenticationError, authenticateRequest } = require("./authenticate-request");
const { createJsonHandler } = require("./json-handler");
const { errorResponse, jsonResponse } = require("./responses");

function createPostHandler(createPost, getSecret) {
  return createJsonHandler(
    async (event) => {
      const { username } = await authenticateRequest(event.headers, getSecret);
      const post = await createPost(event.body, username);
      return jsonResponse(201, {
        message: "Post created successfully",
        post,
      });
    },
    (error) => {
      if (error instanceof ZodError) {
        return errorResponse(400, "Invalid post details");
      }
      if (error instanceof AuthenticationError) {
        return errorResponse(401, "Invalid or missing token");
      }
    },
  );
}

module.exports = { createPostHandler };
