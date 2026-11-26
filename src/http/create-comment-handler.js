const { ZodError } = require("zod");
const { PostNotFoundError } = require("../posts/post-errors");
const { AuthenticationError } = require("./authenticate-request");
const { createJsonHandler } = require("./json-handler");
const { createAuthenticationMiddleware } = require("./middlewares/authenticate-user");
const { createBodyValidationMiddleware } = require("./middlewares/validate-body");
const { errorResponse, jsonResponse } = require("./responses");
const { commentInputSchema } = require("../comments/comment-schema");

function createCommentHandler(createComment, getSecret) {
  return createJsonHandler(
    async (event) => {
      const comment = await createComment(
        event.body,
        event.pathParameters?.postId,
        event.identity.username,
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
    [
      createAuthenticationMiddleware(getSecret),
      createBodyValidationMiddleware(commentInputSchema),
    ],
  );
}

module.exports = { createCommentHandler };
