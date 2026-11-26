const { ZodError } = require("zod");
const { InvalidCredentialsError } = require("../auth/authenticate-user");
const { createJsonHandler } = require("./json-handler");
const { createBodyValidationMiddleware } = require("./middlewares/validate-body");
const { errorResponse, jsonResponse } = require("./responses");
const { credentialsSchema } = require("../auth/credentials-schema");

function createLoginHandler(login) {
  return createJsonHandler(
    async (event) => {
      const { username, token } = await login(event.body);
      return jsonResponse(200, {
        message: "Login successful",
        token,
        username,
      });
    },
    (error) => {
      if (error instanceof ZodError) {
        return errorResponse(400, "Invalid login details");
      }
      if (error instanceof InvalidCredentialsError) {
        return errorResponse(401, "Invalid username or password");
      }
    },
    [createBodyValidationMiddleware(credentialsSchema)],
  );
}

module.exports = { createLoginHandler };
