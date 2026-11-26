const test = require("node:test");
const assert = require("node:assert/strict");
const { createGetCommentsHandler } = require("../../src/http/get-comments-handler");

test("returns a post's comments oldest-first", async () => {
  const post = { id: "post-123" };
  const comments = [{ id: "comment-1" }, { id: "comment-2" }];
  const requestedIds = [];
  const handler = createGetCommentsHandler(
    async (postId) => {
      requestedIds.push(postId);
      return post;
    },
    async (postId) => {
      requestedIds.push(postId);
      return comments;
    },
  );

  const response = await handler({ pathParameters: { postId: "post-123" } });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(response.body), comments);
  assert.deepEqual(requestedIds, ["post-123", "post-123"]);
});

test("returns 404 for a missing post without listing comments", async () => {
  let listedComments = false;
  const handler = createGetCommentsHandler(
    async () => undefined,
    async () => {
      listedComments = true;
      return [];
    },
  );

  const missingIdResponse = await handler({});
  const notFoundResponse = await handler({ pathParameters: { postId: "missing" } });

  assert.equal(missingIdResponse.statusCode, 404);
  assert.equal(notFoundResponse.statusCode, 404);
  assert.deepEqual(JSON.parse(notFoundResponse.body), { error: "Post not found" });
  assert.equal(listedComments, false);
});

test("returns an empty list when the post exists without comments", async () => {
  const handler = createGetCommentsHandler(async () => ({ id: "post-123" }), async () => []);

  const response = await handler({ pathParameters: { postId: "post-123" } });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(response.body), []);
});

test("logs database errors and returns 500 without exposing details", async (t) => {
  const log = t.mock.method(console, "error", () => {});
  const handler = createGetCommentsHandler(async () => {
    throw new Error("Sensitive database details");
  }, async () => []);

  const response = await handler({ pathParameters: { postId: "post-123" } });

  assert.equal(response.statusCode, 500);
  assert.deepEqual(JSON.parse(response.body), { error: "Internal server error" });
  assert.doesNotMatch(response.body, /Sensitive database details/);
  assert.equal(log.mock.callCount(), 1);
});
