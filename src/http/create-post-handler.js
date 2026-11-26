const { ZodError } = require("zod");
const { AuthenticationError } = require("./authenticate-request");
const { createJsonHandler } = require("./json-handler");
const {
  createOptionalAuthenticationMiddleware,
} = require("./middlewares/authenticate-user");
const { createBodyValidationMiddleware } = require("./middlewares/validate-body");
const { errorResponse, jsonResponse } = require("./responses");
const { postInputSchema } = require("../posts/post-schema");

function createPostHandler(createPost, createGuestPost, getSecret) {
  return createJsonHandler(
    async (event) => {
      const post = event.identity
        ? await createPost(event.body, event.identity.username)
        : await createGuestPost(event.body);

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
    [
      createOptionalAuthenticationMiddleware(getSecret),
      createBodyValidationMiddleware(postInputSchema),
    ],
  );
}

module.exports = { createPostHandler };
