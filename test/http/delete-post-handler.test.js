const test = require("node:test");
const assert = require("node:assert/strict");
const { createAccessToken } = require("../../src/auth/token");
const { AuthenticationError } = require("../../src/http/authenticate-request");
const { PostNotFoundError, PostOwnershipError } = require("../../src/posts/post-errors");
const { createDeletePostHandler } = require("../../src/http/delete-post-handler");

const secret = "public-test-secret";
const token = createAccessToken("jesper", secret);

test("deletes with the verified token identity and returns 204 without a body", async () => {
  let received;
  const handler = createDeletePostHandler(async (...args) => {
    received = args;
  }, async () => secret);

  const response = await handler({
    headers: { authorization: `Bearer ${token}` },
    pathParameters: { postId: "post-123" },
  });

  assert.equal(response.statusCode, 204);
  assert.equal(response.body, undefined);
  assert.deepEqual(received, ["post-123", "jesper"]);
});

test("maps missing authentication, ownership, and not-found errors", async () => {
  const handler = createDeletePostHandler(async (postId) => {
    if (postId === "missing") throw new PostNotFoundError();
    if (postId === "forbidden") throw new PostOwnershipError();
    throw new AuthenticationError();
  }, async () => secret);

  const request = (postId, authorization = `Bearer ${token}`) => handler({
    headers: { authorization },
    pathParameters: { postId },
  });

  assert.equal((await request("post-123", "")).statusCode, 401);
  assert.equal((await request("forbidden")).statusCode, 403);
  assert.equal((await request("missing")).statusCode, 404);
});

test("logs unexpected errors and returns 500 without exposing details", async (t) => {
  const log = t.mock.method(console, "error", () => {});
  const handler = createDeletePostHandler(async () => {
    throw new Error("Sensitive database details");
  }, async () => secret);

  const response = await handler({
    headers: { authorization: `Bearer ${token}` },
    pathParameters: { postId: "post-123" },
  });

  assert.equal(response.statusCode, 500);
  assert.deepEqual(JSON.parse(response.body), { error: "Internal server error" });
  assert.doesNotMatch(response.body, /Sensitive database details/);
  assert.equal(log.mock.callCount(), 1);
});
