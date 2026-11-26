const { AuthenticationError } = require("./authenticate-request");
const { createHttpHandler } = require("./json-handler");
const { createAuthenticationMiddleware } = require("./middlewares/authenticate-user");
const {
  createPostOwnerAuthorizationMiddleware,
} = require("./middlewares/authorize-post-owner");
const { errorResponse } = require("./responses");
const { PostNotFoundError, PostOwnershipError } = require("../posts/post-errors");

function createDeletePostHandler(deletePost, getSecret, getPost) {
  return createHttpHandler(
    async (event) => {
      await deletePost(event.pathParameters?.postId, event.identity.username);
      return { statusCode: 204 };
    },
    (error) => {
      if (error instanceof AuthenticationError) {
        return errorResponse(401, "Invalid or missing token");
      }
      if (error instanceof PostOwnershipError) {
        return errorResponse(403, "You cannot delete this post");
      }
      if (error instanceof PostNotFoundError) {
        return errorResponse(404, "Post not found");
      }
    },
    [
      createAuthenticationMiddleware(getSecret),
      createPostOwnerAuthorizationMiddleware(getPost),
    ],
  );
}

module.exports = { createDeletePostHandler };
