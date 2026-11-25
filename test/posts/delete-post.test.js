const test = require("node:test");
const assert = require("node:assert/strict");
const { ConditionalCheckFailedException } = require("@aws-sdk/client-dynamodb");
const { PostNotFoundError, PostOwnershipError } = require("../../src/posts/post-errors");
const { deletePost } = require("../../src/posts/delete-post");

const ownedPost = {
  id: "post-123",
  username: "jesper",
  isGuest: false,
};

test("deletes an owned post", async () => {
  let deleted;
  const posts = {
    async findById() {
      return ownedPost;
    },
    async deleteOwned(id, username) {
      deleted = { id, username };
    },
  };

  await deletePost("post-123", "jesper", posts);

  assert.deepEqual(deleted, { id: "post-123", username: "jesper" });
});

test("rejects a missing post or a post owned by another user", async () => {
  const missingPostRepository = {
    async findById() {
      return undefined;
    },
    async deleteOwned() {
      assert.fail("Must not delete a missing post");
    },
  };
  await assert.rejects(
    deletePost("missing", "jesper", missingPostRepository),
    PostNotFoundError,
  );

  const otherOwnerRepository = {
    async findById() {
      return { ...ownedPost, username: "anna" };
    },
    async deleteOwned() {
      assert.fail("Must not delete another user's post");
    },
  };
  await assert.rejects(
    deletePost("post-123", "jesper", otherOwnerRepository),
    PostOwnershipError,
  );
});

test("does not allow deleting guest posts", async () => {
  const posts = {
    async findById() {
      return { ...ownedPost, isGuest: true };
    },
    async deleteOwned() {
      assert.fail("Must not delete a guest post");
    },
  };

  await assert.rejects(deletePost("post-123", "jesper", posts), PostOwnershipError);
});

test("maps ownership changes during deletion to not-found or forbidden", async () => {
  const conditionalError = new ConditionalCheckFailedException({
    message: "Owner changed",
    $metadata: {},
  });
  for (const [currentPost, expectedError] of [
    [undefined, PostNotFoundError],
    [{ ...ownedPost, username: "anna" }, PostOwnershipError],
  ]) {
    let reads = 0;
    const posts = {
      async findById() {
        reads += 1;
        return reads === 1 ? ownedPost : currentPost;
      },
      async deleteOwned() {
        throw conditionalError;
      },
    };

    await assert.rejects(deletePost("post-123", "jesper", posts), expectedError);
  }
});

test("propagates non-conditional database errors", async () => {
  const error = new Error("DynamoDB unavailable");
  const posts = {
    async findById() {
      return ownedPost;
    },
    async deleteOwned() {
      throw error;
    },
  };

  await assert.rejects(
    deletePost("post-123", "jesper", posts),
    (receivedError) => receivedError === error,
  );
});
