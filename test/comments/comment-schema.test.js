const test = require("node:test");
const assert = require("node:assert/strict");
const { commentInputSchema } = require("../../src/comments/comment-schema");

test("accepts comment content and removes server-owned fields", () => {
  const result = commentInputSchema.safeParse({
    content: "Bra inlägg!",
    username: "someone-else",
    id: "client-id",
  });

  assert.equal(result.success, true);
  assert.deepEqual(result.data, { content: "Bra inlägg!" });
});

test("rejects missing, empty, or non-string comment content", () => {
  for (const input of [{}, { content: "" }, { content: 123 }]) {
    assert.equal(commentInputSchema.safeParse(input).success, false);
  }
});
