const test = require("node:test");
const assert = require("node:assert/strict");
const { ConditionalCheckFailedException } = require("@aws-sdk/client-dynamodb");
const {
  PostNotFoundError,
  PostOwnershipError,
  updatePost,
} = require("../../src/posts/update-post");

const originalPost = {
  id: "post-123",
  username: "jesper",
  isGuest: false,
  title: "Gammal rubrik",
  content: "Gammalt innehåll",
  createdAt: "2026-11-24T10:00:00.000Z",
  updatedAt: "2026-11-24T10:00:00.000Z",
};

test("updates an owned post without changing its id, owner, or creation date", async () => {
  let update;
  const updatedPost = { ...originalPost, title: "Ny rubrik", content: "Nytt innehåll" };
  const posts = {
    async updateOwned(id, username, changes) {
      update = { id, username, changes };
      return { ...updatedPost, updatedAt: changes.updatedAt };
    },
  };

  const result = await updatePost(
    {
      title: "Ny rubrik",
      content: "Nytt innehåll",
      id: "attacker-id",
      username: "someone-else",
      createdAt: "2000-01-01T00:00:00.000Z",
    },
    "post-123",
    "jesper",
    posts,
  );

  assert.equal(update.id, "post-123");
  assert.equal(update.username, "jesper");
  assert.equal(update.changes.title, "Ny rubrik");
  assert.equal(update.changes.content, "Nytt innehåll");
  assert.equal(result.id, "post-123");
  assert.equal(result.username, "jesper");
  assert.equal(result.createdAt, originalPost.createdAt);
  assert.equal(result.updatedAt, update.changes.updatedAt);
});

test("rejects a missing post or a post owned by another user", async () => {
  const conditionalError = new ConditionalCheckFailedException({
    message: "Post does not exist or is not owned by the user",
    $metadata: {},
  });
  for (const [currentPost, expectedError] of [
    [undefined, PostNotFoundError],
    [{ ...originalPost, username: "anna" }, PostOwnershipError],
  ]) {
    const posts = {
      async updateOwned() {
        throw conditionalError;
      },
      async findById() {
        return currentPost;
      },
    };

    await assert.rejects(
      updatePost({ title: "Ny", content: "Text" }, "post-123", "jesper", posts),
      expectedError,
    );
  }
});

test("does not allow updating guest posts", async () => {
  const posts = {
    async updateOwned() {
      throw new ConditionalCheckFailedException({
        message: "Post is a guest post",
        $metadata: {},
      });
    },
    async findById() {
      return { ...originalPost, isGuest: true };
    },
  };

  await assert.rejects(
    updatePost({ title: "Ny", content: "Text" }, "post-123", "jesper", posts),
    PostOwnershipError,
  );
});

test("rejects invalid input or missing identity without updating", async () => {
  let updated = false;
  const posts = {
    async updateOwned() {
      updated = true;
    },
  };

  await assert.rejects(
    updatePost({ title: "", content: "Text" }, "post-123", "jesper", posts),
    { name: "ZodError" },
  );
  await assert.rejects(
    updatePost({ title: "Ny", content: "Text" }, "post-123", "", posts),
    TypeError,
  );
  assert.equal(updated, false);
});

test("maps ownership changes during update to not-found or forbidden", async () => {
  const conditionalError = new ConditionalCheckFailedException({
    message: "Owner changed",
    $metadata: {},
  });
  for (const [currentPost, expectedError] of [
    [undefined, PostNotFoundError],
    [{ ...originalPost, username: "anna" }, PostOwnershipError],
  ]) {
    const posts = {
      async findById() {
        return currentPost;
      },
      async updateOwned() {
        throw conditionalError;
      },
    };

    await assert.rejects(
      updatePost({ title: "Ny", content: "Text" }, "post-123", "jesper", posts),
      expectedError,
    );
  }
});

test("propagates non-conditional database errors", async () => {
  const error = new Error("DynamoDB unavailable");
  const posts = {
    async updateOwned() {
      throw error;
    },
  };

  await assert.rejects(
    updatePost({ title: "Ny", content: "Text" }, "post-123", "jesper", posts),
    (receivedError) => receivedError === error,
  );
});
