const { AuthenticationError, authenticateRequest } = require("./authenticate-request");
const { errorResponse } = require("./responses");
const { PostNotFoundError, PostOwnershipError } = require("../posts/post-errors");

function createDeletePostHandler(deletePost, getSecret) {
  return async (event) => {
    try {
      const { username } = await authenticateRequest(event.headers, getSecret);
      await deletePost(event.pathParameters?.postId, username);
      return { statusCode: 204 };
    } catch (error) {
      if (error instanceof AuthenticationError) {
        return errorResponse(401, "Invalid or missing token");
      }
      if (error instanceof PostOwnershipError) {
        return errorResponse(403, "You cannot delete this post");
      }
      if (error instanceof PostNotFoundError) {
        return errorResponse(404, "Post not found");
      }

      console.error("Failed to delete post", error);
      return errorResponse(500, "Internal server error");
    }
  };
}

module.exports = { createDeletePostHandler };
