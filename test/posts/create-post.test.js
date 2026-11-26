const test = require("node:test");
const assert = require("node:assert/strict");
const { createGuestPost, createPost } = require("../../src/posts/create-post");

test("creates and saves a post using the supplied identity", async () => {
  const savedPosts = [];
  const posts = {
    async create(post) {
      savedPosts.push(post);
    },
  };
  const input = {
    title: "Rubrik",
    content: "Hej",
    username: "someone-else",
    id: "client-id",
    createdAt: "2000-01-01T00:00:00.000Z",
  };
  const before = Date.now();

  const post = await createPost(input, "jesper", posts);
  const after = Date.now();
  const secondPost = await createPost(input, "jesper", posts);

  assert.deepEqual(savedPosts[0], post);
  assert.deepEqual(Object.keys(post).sort(), [
    "content", "createdAt", "id", "isGuest", "title", "updatedAt", "username",
  ]);
  assert.match(post.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.notEqual(post.id, secondPost.id);
  assert.equal(post.username, "jesper");
  assert.equal(post.isGuest, false);
  assert.equal(post.title, "Rubrik");
  assert.equal(post.content, "Hej");
  assert.equal(new Date(post.createdAt).toISOString(), post.createdAt);
  assert.ok(Date.parse(post.createdAt) >= before && Date.parse(post.createdAt) <= after);
  assert.equal(post.updatedAt, post.createdAt);
});

test("rejects invalid input or missing identity without saving", async () => {
  let saved = false;
  const posts = {
    async create() {
      saved = true;
    },
  };

  await assert.rejects(createPost({ title: "", content: "Hej" }, "jesper", posts), { name: "ZodError" });
  await assert.rejects(createPost({ title: "Rubrik", content: "Hej" }, "", posts), TypeError);
  assert.equal(saved, false);
});

test("propagates errors when saving a post fails", async () => {
  const error = new Error("Database unavailable");
  const posts = {
    async create() {
      throw error;
    },
  };

  await assert.rejects(
    createPost({ title: "Rubrik", content: "Hej" }, "jesper", posts),
    (receivedError) => receivedError === error,
  );
});

test("creates a guest post with a generated username and guest flag", async () => {
  const savedPosts = [];
  const posts = {
    async create(post) {
      savedPosts.push(post);
    },
  };
  const input = {
    title: "Gästinlägg",
    content: "Hej!",
    username: "someone-else",
    isGuest: false,
    id: "client-id",
  };

  const post = await createGuestPost(input, posts);
  const secondPost = await createGuestPost(input, posts);

  assert.deepEqual(savedPosts[0], post);
  assert.equal(post.username, `guest-${post.username.slice("guest-".length)}`);
  assert.match(post.username, /^guest-[0-9a-f-]{36}$/);
  assert.notEqual(post.username, secondPost.username);
  assert.notEqual(post.id, secondPost.id);
  assert.equal(post.isGuest, true);
  assert.equal(post.title, "Gästinlägg");
  assert.equal(post.content, "Hej!");
  assert.equal(post.updatedAt, post.createdAt);
});

test("rejects invalid guest post input without saving", async () => {
  let saved = false;
  const posts = {
    async create() {
      saved = true;
    },
  };

  await assert.rejects(
    createGuestPost({ title: "Gästinlägg", content: "" }, posts),
    { name: "ZodError" },
  );
  assert.equal(saved, false);
});

test("propagates errors when saving a guest post fails", async () => {
  const error = new Error("Database unavailable");
  const posts = {
    async create() {
      throw error;
    },
  };

  await assert.rejects(
    createGuestPost({ title: "Gästinlägg", content: "Hej!" }, posts),
    (receivedError) => receivedError === error,
  );
});
