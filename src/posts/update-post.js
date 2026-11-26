const { ConditionalCheckFailedException } = require("@aws-sdk/client-dynamodb");
const { postInputSchema } = require("./post-schema");
const { PostNotFoundError, PostOwnershipError } = require("./post-errors");

async function updatePost(input, postId, username, posts) {
  if (typeof username !== "string" || username.length === 0) {
    throw new TypeError("Username is required");
  }
  if (typeof postId !== "string" || postId.length === 0) {
    throw new PostNotFoundError("Post not found");
  }

  const { title, content } = postInputSchema.parse(input);
  try {
    return await posts.updateOwned(postId, username, {
      title,
      content,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (!(error instanceof ConditionalCheckFailedException)) {
      throw error;
    }

    // Läs vid fel för att skilja mellan saknat inlägg och fel ägare.
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
