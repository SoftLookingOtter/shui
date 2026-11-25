const { randomUUID } = require("node:crypto");
const { postInputSchema } = require("./post-schema");

async function createPost(input, username, posts) {
  if (typeof username !== "string" || username.length === 0) {
    throw new TypeError("Username is required");
  }

  const { title, content } = postInputSchema.parse(input);
  const now = new Date().toISOString();
  const post = {
    id: randomUUID(),
    username,
    isGuest: false,
    title,
    content,
    createdAt: now,
    updatedAt: now,
  };

  await posts.create(post);
  return post;
}

module.exports = { createPost };
