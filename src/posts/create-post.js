const { randomUUID } = require("node:crypto");
const { postInputSchema } = require("./post-schema");

async function savePost({ title, content }, username, isGuest, posts) {
  const now = new Date().toISOString();
  const post = {
    id: randomUUID(),
    username,
    isGuest,
    title,
    content,
    createdAt: now,
    updatedAt: now,
  };

  await posts.create(post);
  return post;
}

async function createPost(input, username, posts) {
  if (typeof username !== "string" || username.length === 0) {
    throw new TypeError("Username is required");
  }

  const postInput = postInputSchema.parse(input);
  return savePost(postInput, username, false, posts);
}

async function createGuestPost(input, posts) {
  const postInput = postInputSchema.parse(input);
  return savePost(postInput, `guest-${randomUUID()}`, true, posts);
}

module.exports = { createGuestPost, createPost };
