const { errorResponse, jsonResponse } = require("./responses");

function createGetPostHandler(getPost) {
  return async (event) => {
    const { postId } = event.pathParameters ?? {};
    if (typeof postId !== "string" || postId.length === 0) {
      return errorResponse(404, "Post not found");
    }

    try {
      const post = await getPost(postId);
      if (!post) {
        return errorResponse(404, "Post not found");
      }
      return jsonResponse(200, post);
    } catch (error) {
      console.error("Failed to retrieve post", error);
      return errorResponse(500, "Internal server error");
    }
  };
}

module.exports = { createGetPostHandler };
