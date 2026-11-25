const test = require("node:test");
const assert = require("node:assert/strict");
const { ZodError } = require("zod");
const { createAccessToken } = require("../../src/auth/token");
const { PostNotFoundError, PostOwnershipError } = require("../../src/posts/update-post");
const { createUpdatePostHandler } = require("../../src/http/update-post-handler");

const secret = "public-test-secret";
const token = createAccessToken("jesper", secret);

test("updates a post using the verified token identity", async () => {
  let received;
  const updatedPost = { id: "post-123", username: "jesper", title: "Ny", content: "Text" };
  const handler = createUpdatePostHandler(async (...args) => {
    received = args;
    return updatedPost;
  }, async () => secret);

  const response = await handler({
    headers: { authorization: `Bearer ${token}` },
    pathParameters: { postId: "post-123" },
    body: JSON.stringify({ title: "Ny", content: "Text", username: "someone-else" }),
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(response.body), {
    message: "Post updated successfully",
    post: updatedPost,
  });
  assert.deepEqual(received, [
    { title: "Ny", content: "Text", username: "someone-else" },
    "post-123",
    "jesper",
  ]);
});

test("maps authentication, validation, ownership, and not-found errors", async () => {
  const handler = createUpdatePostHandler(async (input, postId) => {
    if (postId === "missing") throw new PostNotFoundError();
    if (postId === "forbidden") throw new PostOwnershipError();
    if (!input.title) throw new ZodError([]);
    return {};
  }, async () => secret);

  const request = (postId, body, authorization = `Bearer ${token}`) => handler({
    headers: { authorization },
    pathParameters: { postId },
    body: JSON.stringify(body),
  });

  assert.equal((await request("post-123", { title: "Ny", content: "Text" }, "")).statusCode, 401);
  assert.equal((await request("post-123", { title: "", content: "Text" })).statusCode, 400);
  assert.equal((await request("forbidden", { title: "Ny", content: "Text" })).statusCode, 403);
  assert.equal((await request("missing", { title: "Ny", content: "Text" })).statusCode, 404);
});

test("logs unexpected errors and returns 500 without exposing details", async (t) => {
  const log = t.mock.method(console, "error", () => {});
  const handler = createUpdatePostHandler(async () => {
    throw new Error("Sensitive database details");
  }, async () => secret);

  const response = await handler({
    headers: { authorization: `Bearer ${token}` },
    pathParameters: { postId: "post-123" },
    body: JSON.stringify({ title: "Ny", content: "Text" }),
  });

  assert.equal(response.statusCode, 500);
  assert.deepEqual(JSON.parse(response.body), { error: "Internal server error" });
  assert.doesNotMatch(response.body, /Sensitive database details/);
  assert.equal(log.mock.callCount(), 1);
});
