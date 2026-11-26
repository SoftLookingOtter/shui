const { randomUUID } = require("node:crypto");
const { PostNotFoundError } = require("../posts/post-errors");
const { commentInputSchema } = require("./comment-schema");

async function createComment(input, postId, username, posts, comments) {
  if (typeof username !== "string" || username.length === 0) {
    throw new TypeError("Username is required");
  }
  if (typeof postId !== "string" || postId.length === 0) {
    throw new PostNotFoundError("Post not found");
  }

  const { content } = commentInputSchema.parse(input);
  const post = await posts.findById(postId);
  if (!post) {
    throw new PostNotFoundError("Post not found");
  }

  const comment = {
    id: randomUUID(),
    postId,
    username,
    content,
    createdAt: new Date().toISOString(),
  };

  await comments.create(comment);
  return comment;
}

module.exports = { createComment };
