const { ZodError } = require("zod");
const { AuthenticationError } = require("./authenticate-request");
const { createJsonHandler } = require("./json-handler");
const { createAuthenticationMiddleware } = require("./middlewares/authenticate-user");
const {
  createPostOwnerAuthorizationMiddleware,
} = require("./middlewares/authorize-post-owner");
const { createBodyValidationMiddleware } = require("./middlewares/validate-body");
const { errorResponse, jsonResponse } = require("./responses");
const { PostNotFoundError, PostOwnershipError } = require("../posts/post-errors");
const { postInputSchema } = require("../posts/post-schema");

function createUpdatePostHandler(updatePost, getSecret, getPost) {
  return createJsonHandler(
    async (event) => {
      const post = await updatePost(
        event.body,
        event.pathParameters?.postId,
        event.identity.username,
      );
      return jsonResponse(200, {
        message: "Post updated successfully",
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
      if (error instanceof PostOwnershipError) {
        return errorResponse(403, "You cannot update this post");
      }
      if (error instanceof PostNotFoundError) {
        return errorResponse(404, "Post not found");
      }
    },
    [
      createAuthenticationMiddleware(getSecret),
      createBodyValidationMiddleware(postInputSchema),
      createPostOwnerAuthorizationMiddleware(getPost),
    ],
  );
}

module.exports = { createUpdatePostHandler };
