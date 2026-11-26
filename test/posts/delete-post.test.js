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
  const deleted = [];
  const posts = {
    async deleteOwned(id, username) {
      deleted.push({ id, username });
    },
  };
  const comments = {
    async deleteForPost(postId) {
      deleted.push({ postId });
    },
  };

  await deletePost("post-123", "jesper", posts, comments);

  assert.deepEqual(deleted, [
    { id: "post-123", username: "jesper" },
    { postId: "post-123" },
  ]);
});

test("rejects a missing post or a post owned by another user", async () => {
  const conditionalError = new ConditionalCheckFailedException({
    message: "Post does not exist or is not owned by the user",
    $metadata: {},
  });
  for (const [currentPost, expectedError] of [
    [undefined, PostNotFoundError],
    [{ ...ownedPost, username: "anna" }, PostOwnershipError],
  ]) {
    const posts = {
      async deleteOwned() {
        throw conditionalError;
      },
      async findById() {
        return currentPost;
      },
    };

    await assert.rejects(
      deletePost("post-123", "jesper", posts, { async deleteForPost() {} }),
      expectedError,
    );
  }
});

test("does not allow deleting guest posts", async () => {
  const posts = {
    async deleteOwned() {
      throw new ConditionalCheckFailedException({
        message: "Post is a guest post",
        $metadata: {},
      });
    },
    async findById() {
      return { ...ownedPost, isGuest: true };
    },
  };

  await assert.rejects(
    deletePost("post-123", "jesper", posts, { async deleteForPost() {} }),
    PostOwnershipError,
  );
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
    const posts = {
      async findById() {
        return currentPost;
      },
      async deleteOwned() {
        throw conditionalError;
      },
    };

    await assert.rejects(
      deletePost("post-123", "jesper", posts, { async deleteForPost() {} }),
      expectedError,
    );
  }
});

test("propagates non-conditional database errors", async () => {
  const error = new Error("DynamoDB unavailable");
  const posts = {
    async deleteOwned() {
      throw error;
    },
  };

  await assert.rejects(
    deletePost("post-123", "jesper", posts, { async deleteForPost() {} }),
    (receivedError) => receivedError === error,
  );
});

test("does not delete comments when deleting the post fails", async () => {
  let deletedComments = false;
  const posts = {
    async deleteOwned() {
      throw new Error("DynamoDB unavailable");
    },
  };
  const comments = {
    async deleteForPost() {
      deletedComments = true;
    },
  };

  await assert.rejects(deletePost("post-123", "jesper", posts, comments));
  assert.equal(deletedComments, false);
});
