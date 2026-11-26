const test = require("node:test");
const assert = require("node:assert/strict");
const { ZodError } = require("zod");
const { createAccessToken } = require("../../src/auth/token");
const { PostNotFoundError } = require("../../src/posts/post-errors");
const { createCommentHandler } = require("../../src/http/create-comment-handler");

const secret = "public-test-secret";
const token = createAccessToken("jesper", secret);

test("creates a comment using the verified token identity", async () => {
  let received;
  const comment = { id: "comment-123", username: "jesper", content: "Hej" };
  const handler = createCommentHandler(async (...args) => {
    received = args;
    return comment;
  }, async () => secret);

  const response = await handler({
    headers: { authorization: `Bearer ${token}` },
    pathParameters: { postId: "post-123" },
    body: JSON.stringify({ content: "Hej", username: "someone-else" }),
  });

  assert.equal(response.statusCode, 201);
  assert.deepEqual(JSON.parse(response.body), {
    message: "Comment created successfully",
    comment,
  });
  assert.deepEqual(received, [{ content: "Hej", username: "someone-else" }, "post-123", "jesper"]);
});

test("rejects missing or invalid authentication without creating a comment", async () => {
  let created = false;
  const handler = createCommentHandler(async () => {
    created = true;
  }, async () => secret);

  const missingToken = await handler({
    headers: {},
    pathParameters: { postId: "post-123" },
    body: JSON.stringify({ content: "Hej" }),
  });
  const invalidToken = await handler({
    headers: { authorization: "Bearer invalid" },
    pathParameters: { postId: "post-123" },
    body: JSON.stringify({ content: "Hej" }),
  });

  assert.equal(missingToken.statusCode, 401);
  assert.equal(invalidToken.statusCode, 401);
  assert.equal(created, false);
});

test("maps invalid input and missing parent posts to client errors", async () => {
  const handler = createCommentHandler(async (input, postId) => {
    if (postId === "missing") throw new PostNotFoundError();
    if (!input.content) throw new ZodError([]);
    return {};
  }, async () => secret);
  const request = (postId, content) => handler({
    headers: { authorization: `Bearer ${token}` },
    pathParameters: { postId },
    body: JSON.stringify({ content }),
  });

  assert.equal((await request("post-123", "")).statusCode, 400);
  assert.equal((await request("missing", "Hej")).statusCode, 404);
});

test("logs unexpected errors and returns 500 without exposing details", async (t) => {
  const log = t.mock.method(console, "error", () => {});
  const handler = createCommentHandler(async () => {
    throw new Error("Sensitive database details");
  }, async () => secret);

  const response = await handler({
    headers: { authorization: `Bearer ${token}` },
    pathParameters: { postId: "post-123" },
    body: JSON.stringify({ content: "Hej" }),
  });

  assert.equal(response.statusCode, 500);
  assert.deepEqual(JSON.parse(response.body), { error: "Internal server error" });
  assert.doesNotMatch(response.body, /Sensitive database details/);
  assert.equal(log.mock.callCount(), 1);
});
