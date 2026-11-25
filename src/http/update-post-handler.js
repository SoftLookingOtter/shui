const { ZodError } = require("zod");
const { AuthenticationError, authenticateRequest } = require("./authenticate-request");
const { createJsonHandler } = require("./json-handler");
const { errorResponse, jsonResponse } = require("./responses");
const { PostNotFoundError, PostOwnershipError } = require("../posts/update-post");

function createUpdatePostHandler(updatePost, getSecret) {
  return createJsonHandler(
    async (event) => {
      const { username } = await authenticateRequest(event.headers, getSecret);
      const post = await updatePost(event.body, event.pathParameters?.postId, username);
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
  );
}

module.exports = { createUpdatePostHandler };
