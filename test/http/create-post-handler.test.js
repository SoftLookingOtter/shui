const test = require("node:test");
const assert = require("node:assert/strict");
const { createAccessToken } = require("../../src/auth/token");
const { createGuestPost, createPost } = require("../../src/posts/create-post");
const { createPostHandler } = require("../../src/http/create-post-handler");

const secret = "public-test-secret";
const token = createAccessToken("jesper", secret);

test("creates a post using the verified token identity", async () => {
  let savedPost;
  const posts = {
    async create(post) {
      savedPost = post;
    },
  };
  const handler = createPostHandler(
    (input, username) => createPost(input, username, posts),
    (input) => createGuestPost(input, posts),
    async () => secret,
  );

  const response = await handler({
    headers: { authorization: `Bearer ${token}` },
    body: JSON.stringify({ title: "Rubrik", content: "Hej", username: "someone-else" }),
  });

  assert.equal(response.statusCode, 201);
  assert.deepEqual(JSON.parse(response.body), {
    message: "Post created successfully",
    post: savedPost,
  });
  assert.equal(savedPost.username, "jesper");
  assert.equal(savedPost.title, "Rubrik");
});

test("creates a guest post when no token is sent", async () => {
  let savedPost;
  const posts = {
    async create(post) {
      savedPost = post;
    },
  };
  const handler = createPostHandler(
    async () => assert.fail("A guest request must not create a registered post"),
    (input) => createGuestPost(input, posts),
    async () => assert.fail("A guest request must not fetch the JWT secret"),
  );

  const response = await handler({
    headers: {},
    body: JSON.stringify({ title: "Gästinlägg", content: "Hej" }),
  });

  assert.equal(response.statusCode, 201);
  assert.equal(savedPost.isGuest, true);
  assert.match(savedPost.username, /^guest-/);
  assert.equal(savedPost.title, "Gästinlägg");
});

test("returns 401 for an invalid token without creating a guest post", async () => {
  let saved = false;
  const handler = createPostHandler(
    async () => { saved = true; },
    async () => { saved = true; },
    async () => secret,
  );

  for (const authorization of ["Bearer invalid", "Basic token"]) {
    const response = await handler({
      headers: { authorization },
      body: JSON.stringify({ title: "Rubrik", content: "Hej" }),
    });
    assert.equal(response.statusCode, 401);
    assert.equal(typeof JSON.parse(response.body).error, "string");
  }
  assert.equal(saved, false);
});

test("returns 400 for malformed JSON or invalid post details", async () => {
  let saved = false;
  const posts = { async create() { saved = true; } };
  const handler = createPostHandler(
    (input, username) => createPost(input, username, posts),
    (input) => createGuestPost(input, posts),
    async () => secret,
  );

  for (const [headers, body] of [
    [{ authorization: `Bearer ${token}` }, undefined],
    [{ authorization: `Bearer ${token}` }, "{"],
    [{ authorization: `Bearer ${token}` }, JSON.stringify({ title: "", content: "Hej" })],
    [{}, JSON.stringify({ title: "", content: "Hej" })],
  ]) {
    const response = await handler({ headers, body });
    assert.equal(response.statusCode, 400);
    assert.equal(typeof JSON.parse(response.body).error, "string");
  }
  assert.equal(saved, false);
});

test("logs unexpected errors and returns 500 without exposing details", async (t) => {
  const log = t.mock.method(console, "error", () => {});
  const handler = createPostHandler(async () => {
    throw new Error("Sensitive database details");
  }, async () => {}, async () => secret);

  const response = await handler({
    headers: { authorization: `Bearer ${token}` },
    body: JSON.stringify({ title: "Rubrik", content: "Hej" }),
  });

  assert.equal(response.statusCode, 500);
  assert.equal(typeof JSON.parse(response.body).error, "string");
  assert.doesNotMatch(response.body, /Sensitive database details/);
  assert.equal(log.mock.callCount(), 1);
});
