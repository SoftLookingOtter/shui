const { errorResponse, jsonResponse } = require("./responses");

function createGetCommentsHandler(getPost, listComments) {
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

      const comments = await listComments(postId);
      return jsonResponse(200, comments);
    } catch (error) {
      console.error("Failed to retrieve comments", error);
      return errorResponse(500, "Internal server error");
    }
  };
}

module.exports = { createGetCommentsHandler };
