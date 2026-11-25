const { ConditionalCheckFailedException } = require("@aws-sdk/client-dynamodb");
const { postInputSchema } = require("./post-schema");

class PostNotFoundError extends Error {}
class PostOwnershipError extends Error {}

async function updatePost(input, postId, username, posts) {
  if (typeof username !== "string" || username.length === 0) {
    throw new TypeError("Username is required");
  }
  if (typeof postId !== "string" || postId.length === 0) {
    throw new PostNotFoundError("Post not found");
  }

  const { title, content } = postInputSchema.parse(input);
  const existingPost = await posts.findById(postId);
  if (!existingPost) {
    throw new PostNotFoundError("Post not found");
  }
  if (existingPost.username !== username || existingPost.isGuest === true) {
    throw new PostOwnershipError("User does not own this post");
  }

  const updatedAt = new Date().toISOString();
  try {
    const updatedPost = await posts.updateOwned(postId, username, {
      title,
      content,
      updatedAt,
    });
    return updatedPost ?? { ...existingPost, title, content, updatedAt };
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

module.exports = { PostNotFoundError, PostOwnershipError, updatePost };
