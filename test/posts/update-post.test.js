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
    async findById() {
      return originalPost;
    },
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
  const missingPostRepository = {
    async findById() {
      return undefined;
    },
    async updateOwned() {
      assert.fail("Must not update a missing post");
    },
  };
  await assert.rejects(
    updatePost({ title: "Ny", content: "Text" }, "missing", "jesper", missingPostRepository),
    PostNotFoundError,
  );

  const otherOwnerRepository = {
    async findById() {
      return { ...originalPost, username: "anna" };
    },
    async updateOwned() {
      assert.fail("Must not update another user's post");
    },
  };
  await assert.rejects(
    updatePost({ title: "Ny", content: "Text" }, "post-123", "jesper", otherOwnerRepository),
    PostOwnershipError,
  );
});

test("does not allow updating guest posts", async () => {
  const posts = {
    async findById() {
      return { ...originalPost, isGuest: true };
    },
    async updateOwned() {
      assert.fail("Must not update a guest post");
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
    async findById() {
      return originalPost;
    },
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
    let reads = 0;
    const posts = {
      async findById() {
        reads += 1;
        return reads === 1 ? originalPost : currentPost;
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
    async findById() {
      return originalPost;
    },
    async updateOwned() {
      throw error;
    },
  };

  await assert.rejects(
    updatePost({ title: "Ny", content: "Text" }, "post-123", "jesper", posts),
    (receivedError) => receivedError === error,
  );
});
