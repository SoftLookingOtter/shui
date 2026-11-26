const { PostNotFoundError, PostOwnershipError } = require("../../posts/post-errors");

function createPostOwnerAuthorizationMiddleware(getPost) {
  return {
    async before(request) {
      const postId = request.event.pathParameters?.postId;
      if (typeof postId !== "string" || postId.length === 0) {
        throw new PostNotFoundError("Post not found");
      }

      const post = await getPost(postId);
      if (!post) {
        throw new PostNotFoundError("Post not found");
      }

      if (post.username !== request.event.identity.username || post.isGuest === true) {
        throw new PostOwnershipError("User does not own this post");
      }
    },
  };
}

module.exports = { createPostOwnerAuthorizationMiddleware };
