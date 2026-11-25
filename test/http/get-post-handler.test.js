const test = require("node:test");
const assert = require("node:assert/strict");
const { createGetPostHandler } = require("../../src/http/get-post-handler");

test("returns a post by its path id", async () => {
  const post = { id: "post-123", title: "Rubrik" };
  let requestedId;
  const handler = createGetPostHandler(async (postId) => {
    requestedId = postId;
    return post;
  });

  const response = await handler({ pathParameters: { postId: "post-123" } });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(response.body), post);
  assert.equal(requestedId, "post-123");
});

test("returns 404 when the id is missing or the post does not exist", async () => {
  let called = false;
  const handler = createGetPostHandler(async () => {
    called = true;
    return undefined;
  });

  const missingIdResponse = await handler({});
  const notFoundResponse = await handler({ pathParameters: { postId: "missing" } });

  assert.equal(missingIdResponse.statusCode, 404);
  assert.equal(notFoundResponse.statusCode, 404);
  assert.deepEqual(JSON.parse(notFoundResponse.body), { error: "Post not found" });
  assert.equal(called, true);
});

test("logs database errors and returns 500 without exposing details", async (t) => {
  const log = t.mock.method(console, "error", () => {});
  const handler = createGetPostHandler(async () => {
    throw new Error("Sensitive database details");
  });

  const response = await handler({ pathParameters: { postId: "post-123" } });

  assert.equal(response.statusCode, 500);
  assert.deepEqual(JSON.parse(response.body), { error: "Internal server error" });
  assert.doesNotMatch(response.body, /Sensitive database details/);
  assert.equal(log.mock.callCount(), 1);
});
