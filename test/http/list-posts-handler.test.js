const test = require("node:test");
const assert = require("node:assert/strict");
const { createListPostsHandler } = require("../../src/http/list-posts-handler");

test("lists public posts with an optional username filter", async () => {
  const expectedPosts = [{ id: "post-1" }];
  const receivedUsernames = [];
  const handler = createListPostsHandler(async (username) => {
    receivedUsernames.push(username);
    return expectedPosts;
  });

  const allResponse = await handler({});
  const filteredResponse = await handler({
    queryStringParameters: { username: "jesper" },
  });

  assert.equal(allResponse.statusCode, 200);
  assert.deepEqual(JSON.parse(allResponse.body), expectedPosts);
  assert.equal(filteredResponse.statusCode, 200);
  assert.deepEqual(JSON.parse(filteredResponse.body), expectedPosts);
  assert.deepEqual(receivedUsernames, [undefined, "jesper"]);
});

test("returns 400 for invalid query parameters without listing posts", async () => {
  let called = false;
  const handler = createListPostsHandler(async () => {
    called = true;
    return [];
  });

  for (const queryStringParameters of [
    { username: "" },
    { username: ["jesper"] },
    { unknown: "value" },
  ]) {
    const response = await handler({ queryStringParameters });
    assert.equal(response.statusCode, 400);
    assert.deepEqual(JSON.parse(response.body), { error: "Invalid query parameters" });
  }
  assert.equal(called, false);
});

test("logs unexpected errors and returns 500 without exposing details", async (t) => {
  const log = t.mock.method(console, "error", () => {});
  const handler = createListPostsHandler(async () => {
    throw new Error("Sensitive database details");
  });

  const response = await handler({});

  assert.equal(response.statusCode, 500);
  assert.deepEqual(JSON.parse(response.body), { error: "Internal server error" });
  assert.doesNotMatch(response.body, /Sensitive database details/);
  assert.equal(log.mock.callCount(), 1);
});
