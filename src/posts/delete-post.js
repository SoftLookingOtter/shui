const { ConditionalCheckFailedException } = require("@aws-sdk/client-dynamodb");
const { PostNotFoundError, PostOwnershipError } = require("./post-errors");

async function deletePost(postId, username, posts) {
  if (typeof username !== "string" || username.length === 0) {
    throw new TypeError("Username is required");
  }
  if (typeof postId !== "string" || postId.length === 0) {
    throw new PostNotFoundError("Post not found");
  }

  const existingPost = await posts.findById(postId);
  if (!existingPost) {
    throw new PostNotFoundError("Post not found");
  }
  if (existingPost.username !== username || existingPost.isGuest === true) {
    throw new PostOwnershipError("User does not own this post");
  }

  try {
    await posts.deleteOwned(postId, username);
  } catch (error) {
    if (!(error instanceof ConditionalCheckFailedException)) {
      throw error;
    }

    const currentPost = await posts.findById(postId);
    if (!currentPost) {
      throw new PostNotFoundError("Post not found");
    }
    if (currentPost.username !== username || currentPost.isGuest === true) {
      throw new PostOwnershipError("User does not own this post");
    }
    throw error;
  }
}

module.exports = { deletePost };
