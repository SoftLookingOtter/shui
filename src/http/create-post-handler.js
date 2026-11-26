const { ZodError } = require("zod");
const { AuthenticationError, authenticateRequest } = require("./authenticate-request");
const { createJsonHandler } = require("./json-handler");
const { errorResponse, jsonResponse } = require("./responses");

function createPostHandler(createPost, createGuestPost, getSecret) {
  return createJsonHandler(
    async (event) => {
      // Utan token blir inlägget ett gästinlägg; skickade token måste vara giltiga.
      const hasAuthorizationHeader = Object.keys(event.headers ?? {})
        .some((name) => name.toLowerCase() === "authorization");
      let post;

      if (hasAuthorizationHeader) {
        const { username } = await authenticateRequest(event.headers, getSecret);
        post = await createPost(event.body, username);
      } else {
        post = await createGuestPost(event.body);
      }

      return jsonResponse(201, {
        message: "Post created successfully",
        post,
      });
    },
    (error) => {
      if (error instanceof ZodError) {
        return errorResponse(400, "Invalid post details");
      }
      if (error instanceof AuthenticationError) {
        return errorResponse(401, "Invalid token");
      }
    },
  );
}

module.exports = { createPostHandler };
