const { ZodError } = require("zod");
const { PostNotFoundError } = require("../posts/post-errors");
const { AuthenticationError, authenticateRequest } = require("./authenticate-request");
const { createJsonHandler } = require("./json-handler");
const { errorResponse, jsonResponse } = require("./responses");

function createCommentHandler(createComment, getSecret) {
  return createJsonHandler(
    async (event) => {
      const { username } = await authenticateRequest(event.headers, getSecret);
      const comment = await createComment(
        event.body,
        event.pathParameters?.postId,
        username,
      );
      return jsonResponse(201, {
        message: "Comment created successfully",
        comment,
      });
    },
    (error) => {
      if (error instanceof ZodError) {
        return errorResponse(400, "Invalid comment details");
      }
      if (error instanceof AuthenticationError) {
        return errorResponse(401, "Invalid or missing token");
      }
      if (error instanceof PostNotFoundError) {
        return errorResponse(404, "Post not found");
      }
    },
  );
}

module.exports = { createCommentHandler };
