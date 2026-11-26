const test = require("node:test");
const assert = require("node:assert/strict");
const { ZodError } = require("zod");
const { PostNotFoundError } = require("../../src/posts/post-errors");
const { createComment } = require("../../src/comments/create-comment");

test("creates a comment using the authenticated username", async () => {
  let requestedPostId;
  let savedComment;
  const posts = {
    async findById(postId) {
      requestedPostId = postId;
      return { id: postId, isGuest: true };
    },
  };
  const comments = {
    async create(comment) {
      savedComment = comment;
    },
  };

  const result = await createComment(
    { content: "Bra inlägg!", username: "someone-else" },
    "post-123",
    "jesper",
    posts,
    comments,
  );

  assert.equal(requestedPostId, "post-123");
  assert.deepEqual(result, savedComment);
  assert.equal(result.id.length, 36);
  assert.equal(result.postId, "post-123");
  assert.equal(result.username, "jesper");
  assert.equal(result.content, "Bra inlägg!");
  assert.equal(Number.isNaN(Date.parse(result.createdAt)), false);
});

test("rejects invalid input or identity without accessing posts", async () => {
  let lookedUpPost = false;
  const posts = {
    async findById() {
      lookedUpPost = true;
      return { id: "post-123" };
    },
  };
  const comments = { async create() {} };

  await assert.rejects(
    createComment({ content: "" }, "post-123", "jesper", posts, comments),
    ZodError,
  );
  await assert.rejects(
    createComment({ content: "Hej" }, "post-123", "", posts, comments),
    TypeError,
  );
  assert.equal(lookedUpPost, false);
});

test("rejects a missing parent post without saving the comment", async () => {
  let savedComment = false;
  const posts = { async findById() { return undefined; } };
  const comments = {
    async create() {
      savedComment = true;
    },
  };

  await assert.rejects(
    createComment({ content: "Hej" }, "missing", "jesper", posts, comments),
    PostNotFoundError,
  );
  assert.equal(savedComment, false);
});

test("propagates errors from post lookup and comment storage", async () => {
  const error = new Error("Database unavailable");
  const comments = { async create() { throw error; } };

  await assert.rejects(
    createComment({ content: "Hej" }, "post-123", "jesper", {
      async findById() { throw error; },
    }, comments),
    (receivedError) => receivedError === error,
  );
  await assert.rejects(
    createComment({ content: "Hej" }, "post-123", "jesper", {
      async findById() { return { id: "post-123" }; },
    }, comments),
    (receivedError) => receivedError === error,
  );
});
