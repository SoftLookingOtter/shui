const test = require("node:test");
const assert = require("node:assert/strict");
const { postInputSchema } = require("../../src/posts/post-schema");

test("accepts a title and content", () => {
  const result = postInputSchema.safeParse({
    title: "Mitt inlägg",
    content: "Hej på er!",
  });

  assert.equal(result.success, true);
  assert.deepEqual(result.data, {
    title: "Mitt inlägg",
    content: "Hej på er!",
  });
});

test("rejects missing, empty, and non-string fields", () => {
  const invalidInputs = [
    { content: "Hej" },
    { title: "Rubrik" },
    { title: "", content: "Hej" },
    { title: "Rubrik", content: "" },
    { title: 123, content: "Hej" },
    { title: "Rubrik", content: 123 },
  ];

  for (const input of invalidInputs) {
    assert.equal(postInputSchema.safeParse(input).success, false);
  }
});

test("does not accept username or server-generated fields from the body", () => {
  const result = postInputSchema.safeParse({
    title: "Rubrik",
    content: "Hej",
    username: "someone-else",
    id: "client-id",
    createdAt: "2000-01-01T00:00:00.000Z",
  });

  assert.equal(result.success, true);
  assert.deepEqual(result.data, { title: "Rubrik", content: "Hej" });
});
